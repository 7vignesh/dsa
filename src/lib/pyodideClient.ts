import type { RunResult, WorkerInbound, WorkerOutbound } from '../types';

const EXEC_TIMEOUT_MS = 5000;

export type RuntimeStatus = 'idle' | 'loading' | 'ready';

type StatusListener = (status: RuntimeStatus, detail?: string) => void;

interface PendingRun {
  runId: number;
  resolve: (result: RunResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Owns the Pyodide Web Worker. Enforces Layer 1 isolation and the Layer 4
 * 5-second wall-clock limit by terminating and respawning the worker on timeout.
 */
class PyodideClient {
  private worker: Worker | null = null;
  private status: RuntimeStatus = 'idle';
  private detail = '';
  private runCounter = 0;
  private pending: PendingRun | null = null;
  private statusListeners = new Set<StatusListener>();

  init() {
    if (this.worker) return;
    const worker = this.spawnWorker();
    worker.postMessage({ type: 'init' } satisfies WorkerInbound);
  }

  getStatus(): RuntimeStatus {
    return this.status;
  }

  getDetail(): string {
    return this.detail;
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: RuntimeStatus, detail?: string) {
    this.status = status;
    if (detail !== undefined) this.detail = detail;
    this.statusListeners.forEach((l) => l(this.status, this.detail));
  }

  private spawnWorker(): Worker {
    const worker = new Worker(new URL('../worker/pyodide.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<WorkerOutbound>) => this.handleMessage(e.data);
    worker.onerror = () => {
      this.failPending({
        ok: false,
        errorKind: 'runtime',
        message: 'Unexpected error. Please reset and try again.',
        errorLine: null,
      });
    };
    this.worker = worker;
    return worker;
  }

  private handleMessage(msg: WorkerOutbound) {
    switch (msg.type) {
      case 'status':
        this.setStatus(msg.status, msg.detail);
        break;
      case 'result':
        if (this.pending && this.pending.runId === msg.runId) {
          clearTimeout(this.pending.timer);
          const { resolve } = this.pending;
          this.pending = null;
          resolve(msg.result);
        }
        break;
      case 'fatal':
        this.setStatus('idle', '');
        this.failPending({
          ok: false,
          errorKind: 'runtime',
          message: msg.message,
          errorLine: null,
        });
        break;
    }
  }

  private failPending(result: RunResult) {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      const { resolve } = this.pending;
      this.pending = null;
      resolve(result);
    }
  }

  /** Hard-reset the worker (used on timeout). A fresh worker is spawned. */
  private recycleWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.setStatus('loading', 'Restarting Python runtime…');
    const worker = this.spawnWorker();
    worker.postMessage({ type: 'init' } satisfies WorkerInbound);
  }

  run(code: string, input: string): Promise<RunResult> {
    if (!this.worker) this.init();

    // Only one run at a time; supersede any in-flight run.
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.resolve({
        ok: false,
        errorKind: 'runtime',
        message: 'Run superseded.',
        errorLine: null,
      });
      this.pending = null;
    }

    const runId = ++this.runCounter;
    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(() => {
        // Layer 4: enforce wall-clock limit by killing the worker.
        if (this.pending && this.pending.runId === runId) {
          this.pending = null;
          this.recycleWorker();
          resolve({
            ok: false,
            errorKind: 'runtime',
            message: 'Execution timed out after 5 seconds.',
            errorLine: null,
          });
        }
      }, EXEC_TIMEOUT_MS);

      this.pending = { runId, resolve, timer };
      this.worker?.postMessage({ type: 'run', runId, code, input } satisfies WorkerInbound);
    });
  }
}

export const pyodideClient = new PyodideClient();
