# 53. Maximum Subarray

## Approach: Kadane's Algorithm

The goal is to find the maximum sum of a **contiguous, non-empty subarray**.

### Logic

- `current_sum` stores the maximum subarray sum ending at the current element.
- `max_sum` stores the maximum subarray sum found so far.
- For each element, decide whether to extend the existing subarray or start a new one.
- Update `max_sum` whenever we find a larger sum.

### Code

```python
class Solution:
    def maxSubArray(self, nums):
        current_sum = nums[0]
        max_sum = nums[0]

        for i in range(1, len(nums)):
            num = nums[i]
            current_sum = max(current_sum + num, num)
            max_sum = max(max_sum, current_sum)

        return max_sum
```
edge cases

    def maxSubArray(self, nums):
        if not nums:
            return 0

        current_sum = nums[0]
        max_sum = nums[0]

        for i in range(1, len(nums)):
            num = nums[i]
            current_sum = max(current_sum + num, num)
            max_sum = max(max_sum, current_sum)

        return max_sum

### Example

```python
nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
```

**Output:** `6`

Maximum subarray: `[4, -1, 2, 1]`

### Complexity

- **Time:** O(n) — traverse the array once.
- **Space:** O(1) — use only a constant amount of extra space.

### Important points

- A subarray must be contiguous.
- Don't automatically discard a subarray just because it contains a negative number.
- Initialize both sums with `nums[0]`, not `0`, to handle arrays containing only negative numbers.
- `current_sum` tracks the best sum ending here; `max_sum` tracks the best sum overall.

### Pattern to remember

**Kadane's Algorithm:** At each element, choose between extending the current subarray and starting a new one.
