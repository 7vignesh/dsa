## State Transition Explained

The most important part of Maximum Product Subarray is understanding how `max_product` and `min_product` change when we process each element.

### 1. What are the states?

At every index, we maintain three variables:

- `max_product`: Maximum product of a subarray ending at the current element.
- `min_product`: Minimum product of a subarray ending at the current element.
- `result`: Maximum product found anywhere so far.

We track both the maximum and minimum because multiplying two negative numbers can produce a large positive number.

### 2. Three possible choices

For every current element `num`, we have three candidates:

1. Start a new subarray: `num`
2. Extend the previous maximum product: `max_product * num`
3. Extend the previous minimum product: `min_product * num`

We compare these three candidates to calculate the new maximum and minimum.

### 3. State transition equations

Let `M` be the previous maximum product, `m` the previous minimum product, and `x` the current element.

```text
new_max = max(M * x, m * x, x)
new_min = min(M * x, m * x, x)

result = max(result, new_max)
```

**Important:** Calculate `new_max` and `new_min` using the previous values before updating either variable.

### 4. Python implementation

```python
class Solution(object):
    def maxProduct(self, nums):
        max_product = nums[0]
        min_product = nums[0]
        result = nums[0]

        for i in range(1, len(nums)):
            num = nums[i]

            new_max = max(
                max_product * num,
                min_product * num,
                num
            )

            new_min = min(
                max_product * num,
                min_product * num,
                num
            )

            max_product = new_max
            min_product = new_min

            result = max(result, max_product)

        return result
```

### 5. Dry run

Input:

```python
nums = [2, -5, -2, -4, 3]
```

| Current element | New max product | New min product | Overall result |
|---:|---:|---:|---:|
| 2 (initial) | 2 | 2 | 2 |
| -5 | -5 | -10 | 2 |
| -2 | 20 | -2 | 20 |
| -4 | 8 | -80 | 20 |
| 3 | 24 | -240 | 24 |

**Output:** `24`

The maximum-product subarray is `[-2, -4, 3]`.

### 6. Why do we need the minimum product?

Suppose:

```python
max_product = 6
min_product = -8
num = -2
```

The three candidates are:

```text
6 * -2  = -12
-8 * -2 = 16
-2      = -2
```

The new maximum is `16`, and the new minimum is `-12`.

If we tracked only the maximum product, we would lose the negative product `-8`, which becomes the new maximum after multiplication by `-2`.

### 7. Difference from Maximum Subarray

| Maximum Subarray | Maximum Product Subarray |
|---|---|
| Tracks the best ending sum | Tracks the best and worst ending products |
| Uses addition | Uses multiplication |
| A negative sum can reduce the total | A negative product can become positive |
| Tracks `current_sum` and `max_sum` | Tracks `max_product`, `min_product`, and `result` |

### 8. Complexity

- **Time:** O(n) — traverse the array once.
- **Space:** O(1) — use a constant amount of extra space.

### Key takeaway

For multiplication, negative numbers can reverse the roles of maximum and minimum. Always track both the maximum and minimum products ending at the current element.
