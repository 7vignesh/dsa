import { useMemo } from 'react';
import * as d3 from 'd3';
import type { DetectedStructure } from '../../types';
import { formatCell } from '../../lib/format';

interface TreeDatum {
  label: string;
  children: TreeDatum[];
}

const VAL_KEYS = ['val', 'value', 'data', 'key'];

function toTree(node: unknown): TreeDatum | null {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return null;
  const obj = node as Record<string, unknown>;
  const valKey = VAL_KEYS.find((k) => k in obj);
  const label = valKey ? formatCell(obj[valKey]) : '·';
  const children: TreeDatum[] = [];
  const left = toTree(obj.left);
  const right = toTree(obj.right);
  if (left) children.push(left);
  if (right) children.push(right);
  return { label, children };
}

export function TreeView({ structure }: { structure: DetectedStructure }) {
  const layout = useMemo(() => {
    const root = toTree(structure.value);
    if (!root) return null;
    const width = 420;
    const height = 260;
    const hierarchy = d3.hierarchy<TreeDatum>(root, (d) => d.children);
    const treeLayout = d3.tree<TreeDatum>().size([width - 40, height - 60]);
    const laid = treeLayout(hierarchy);
    return { nodes: laid.descendants(), links: laid.links(), width, height };
  }, [structure.value]);

  if (!layout) {
    return <div className="text-muted text-xs font-mono italic">empty tree</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted text-xs font-mono mb-1">{structure.name} (tree)</div>
      <svg width={layout.width} height={layout.height} className="overflow-visible">
        <g transform="translate(20,30)">
          {layout.links.map((link, i) => (
            <line
              key={i}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="#30363D"
              strokeWidth={1}
            />
          ))}
          {layout.nodes.map((node, i) => (
            <g key={i} transform={`translate(${node.x},${node.y})`}>
              <circle r={16} fill="#1C2128" stroke="#00BCD4" strokeWidth={1.5} />
              <text
                textAnchor="middle"
                dy="0.35em"
                fill="#E6EDF3"
                fontSize={12}
                fontFamily="JetBrains Mono, monospace"
              >
                {node.data.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
