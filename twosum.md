# Two Sum — LeetCode #1

**Problem:** https://leetcode.com/problems/two-sum/

## My Approach

1. Initially thought of using two loops (brute force).
2. Time complexity would be `O(n²)` and space complexity `O(1)`.
3. Then learned about using a hash map to optimize the solution.
4. Calculate the complement using `target - num`.
5. If the complement exists in the hash map, return both indices. Otherwise, store the current number and its index.

## Python Solution

```python
def twoSum(nums, target):
    seen = {}

    for i, num in enumerate(nums):
        comp = target - num

        if comp in seen:
            return [seen[comp], i]

        seen[num] = i

    return []
```

## Complexity

- **Time:** `O(n)` average
- **Space:** `O(n)`

## What I Learned

- `enumerate(nums)` gives both index and value.
- A hash map stores `{number: index}`.
- Check the complement before inserting the current number to avoid using the same element twice.
- **Time complexity** = how the work grows.
- **Space complexity** = how the extra memory grows.
- A loop doesn't automatically mean `O(1)` space. A growing dictionary or list means `O(n)` space.
- Two pointers are another approach for sorted arrays, but preserving original indices needs care.

## My Mistake to Remember

I initially confused visiting every element with storing every element. Visiting all elements can take `O(n)` time while using only `O(1)` extra space.
