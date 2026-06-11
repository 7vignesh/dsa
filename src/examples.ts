export interface Example {
  id: string;
  label: string;
  code: string;
  input: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'two-sum',
    label: 'Two Sum (Hashmap)',
    code: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
    input: 'nums = [2, 7, 11, 15], target = 9',
  },
  {
    id: 'valid-parens',
    label: 'Valid Parentheses (Stack)',
    code: `def isValid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack`,
    input: 's = "()[]{}"',
  },
  {
    id: 'binary-search',
    label: 'Binary Search (Two-pointer)',
    code: `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
    input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9',
  },
];
