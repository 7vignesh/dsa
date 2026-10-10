# Contains Duplicate — LeetCode #217

**Problem:** https://leetcode.com/problems/contains-duplicate/

### Approach

- Initially thought of using two loops to compare each element with the remaining elements.
- Brute force: `O(n²)` time, `O(1)` extra space.
- Optimized using a **hash set** because we only need to check whether an element has appeared before.
- If the element is already in the set, return `True`. Otherwise, add it to the set.
- If no duplicates are found, return `False`.

### Python Solution

```python
def containsDuplicate(nums):
    seen = set()

    for num in nums:
        if num in seen:
            return True

        seen.add(num)

    return False
```

### Complexity

- **Time:** `O(n)` average — one loop, with average `O(1)` set operations.
- **Space:** `O(n)` — the set can store all elements if there are no duplicates.

### What I Learned

- Use a **set** when you only need to check whether an element exists.
- Use a **hash map** when you need to associate values with other information, such as indices.
- `seen.add(num)` inserts an element into a set; `append()` is used for lists.
- Space complexity depends on how much extra memory the algorithm stores, not just how many elements it visits.
