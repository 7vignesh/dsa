# 152. Maximum Product Subarray

## Approach: Track Maximum and Minimum Products

The goal is to find the maximum product of a contiguous, non-empty subarray.

### My Approach

- Initialize `max_product`, `min_product`, and `result` with the first element.
- Iterate through the remaining elements.
- For each number, calculate three possibilities:
  - Start a new subarray with `num`.
  - Multiply `num` by the previous maximum product.
  - Multiply `num` by the previous minimum product.
- Update the maximum and minimum products.
- Update `result` with the maximum product found so far.

**Important:** We track both maximum and minimum products because multiplying two negative numbers can produce a large positive number.

## My Code

```python
class Solution(object):
    def maxProduct(self, nums):
        max_product = nums[0]
        min_product = nums[0]
        current_product = nums[0]
        result = nums[0]

        for i in range(1, len(nums)):
            num = nums[i]

            new_max = max_product * num
            new_min = min_product * num

            max_product = max(new_min, new_max, num)
            min_product = min(new_max, new_min, num)

            result = max(max_product, min_product, result)

        return result
```

**Note:** This was my final attempt. The core idea is close, but the implementation above has a bug: `new_max` and `new_min` only store two products, so the maximum/minimum updates are correct for the three candidates, but the old `max_product` and `min_product` are not preserved when calculating the new values. Use the corrected solution below.

## Corrected Code

```python
class Solution(object):
    def maxProduct(self, nums):
        max_product = nums[0]
        min_product = nums[0]
        result = nums[0]

        for i in range(1, len(nums)):
            num = nums[i]

            new_max = max(max_product * num,
                          min_product * num,
                          num)

            new_min = min(max_product * num,
                          min_product * num,
                          num)

            max_product = new_max
            min_product = new_min

            result = max(result, max_product)

        return result
```

## Example

```python
nums = [2, -5, -2, -4, 3]
```

**Output:** `120`

The maximum product comes from the subarray `[-5, -2, -4, 3]`.

## Complexity

- **Time:** O(n) — traverse the array once.
- **Space:** O(1) — use a constant amount of extra space.

## Key Takeaways

- A subarray must be contiguous.
- A negative number can turn a positive product negative.
- Two negative numbers can produce a positive product.
- Track both the maximum and minimum products ending at the current position.
- Initialize with `nums[0]` to handle all-negative arrays correctly.

## Pattern to Remember

**Maximum Product Subarray:** Track both extremes because multiplication by a negative number can reverse their roles.
