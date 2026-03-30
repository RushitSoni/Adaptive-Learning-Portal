# Python Lists

## What is a List?

A list is an ordered, mutable collection of items. Items can be of any type.
Lists are defined with square brackets `[]`.

```python
fruits = ["apple", "banana", "cherry"]
mixed = [1, "hello", 3.14, True]
empty = []

print(type(fruits))   # Output: <class 'list'>
print(len(fruits))    # Output: 3
```

## Accessing Elements — Indexing

Lists are zero-indexed. Negative indices count from the end.

```python
nums = [10, 20, 30, 40, 50]

print(nums[0])    # Output: 10   (first)
print(nums[-1])   # Output: 50   (last)
print(nums[-2])   # Output: 40   (second from last)
```

## Slicing

Extract a portion of a list: `list[start:end:step]` — end is exclusive.

```python
nums = [0, 1, 2, 3, 4, 5]

print(nums[1:4])    # Output: [1, 2, 3]
print(nums[:3])     # Output: [0, 1, 2]
print(nums[3:])     # Output: [3, 4, 5]
print(nums[::2])    # Output: [0, 2, 4]  (every 2nd)
print(nums[::-1])   # Output: [5, 4, 3, 2, 1, 0]  (reversed)
```

## Modifying Lists

Lists are mutable — you can change items after creation.

```python
fruits = ["apple", "banana", "cherry"]
fruits[1] = "mango"
print(fruits)   # Output: ['apple', 'mango', 'cherry']
```

## Common List Methods

```python
nums = [3, 1, 4, 1, 5]

nums.append(9)          # Add to end → [3, 1, 4, 1, 5, 9]
nums.insert(0, 0)       # Insert at index 0 → [0, 3, 1, 4, 1, 5, 9]
nums.extend([6, 7])     # Add multiple items from iterable
nums.remove(1)          # Remove first occurrence of 1
popped = nums.pop()     # Remove and return last item
popped_idx = nums.pop(0)  # Remove and return item at index

nums.sort()             # Sort in-place (ascending)
nums.sort(reverse=True) # Sort descending
nums.reverse()          # Reverse in-place
nums.clear()            # Remove all items

copy = nums.copy()      # Shallow copy
idx = nums.index(4)     # Index of first occurrence
count = nums.count(1)   # Count occurrences
```

## Checking Membership

```python
fruits = ["apple", "banana", "cherry"]
print("apple" in fruits)      # Output: True
print("mango" not in fruits)  # Output: True
```

## List Comprehension

Create a new list from an iterable in one line.

```python
# Squares of 1 to 5
squares = [x**2 for x in range(1, 6)]
print(squares)   # Output: [1, 4, 9, 16, 25]

# Only even numbers
evens = [x for x in range(10) if x % 2 == 0]
print(evens)     # Output: [0, 2, 4, 6, 8]

# Uppercase all strings
words = ["hello", "world"]
upper = [w.upper() for w in words]
print(upper)     # Output: ['HELLO', 'WORLD']
```

## Nested Lists (2D Lists)

A list of lists — used for grids and matrices.

```python
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

print(matrix[1][2])   # Output: 6  (row 1, col 2)

# Iterate nested list
for row in matrix:
    for val in row:
        print(val, end=" ")
    print()
```

## Sorting

```python
nums = [3, 1, 4, 1, 5, 9, 2]
nums.sort()                # in-place, returns None
sorted_nums = sorted(nums) # returns NEW sorted list

words = ["banana", "apple", "cherry"]
words.sort(key=len)        # sort by string length
print(words)               # Output: ['apple', 'banana', 'cherry']
```

## Unpacking

```python
a, b, c = [1, 2, 3]
print(a, b, c)   # Output: 1 2 3

first, *rest = [1, 2, 3, 4, 5]
print(first)   # Output: 1
print(rest)    # Output: [2, 3, 4, 5]
```

## Common Mistakes

- **Index out of range**: `lst[5]` on a 3-element list raises `IndexError`.
- **Modifying while iterating**: Can skip elements or behave unexpectedly.

```python
nums = [1, 2, 3, 4, 5]
# WRONG
for n in nums:
    if n % 2 == 0:
        nums.remove(n)   # skips elements!

# CORRECT — iterate over a copy
for n in nums[:]:
    if n % 2 == 0:
        nums.remove(n)
```

- **`append` vs `extend`**: `append([1,2])` adds a list as one item; `extend([1,2])` adds each item separately.
- **`sort()` vs `sorted()`**: `sort()` modifies in-place and returns `None`; `sorted()` returns a new list.

## Edge Cases

- Empty list is falsy: `if not []:` is `True`.
- `list * n` repeats the list: `[0] * 3 → [0, 0, 0]`.
- `list + list` concatenates: `[1,2] + [3,4] → [1, 2, 3, 4]`.
- Slicing never raises `IndexError` even if range exceeds list size.
