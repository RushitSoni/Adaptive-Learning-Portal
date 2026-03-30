# Python Recursion

## What is Recursion?

Recursion is when a function calls itself to solve a smaller version of the same problem.
Every recursive function must have two parts:
- **Base case**: the stopping condition — prevents infinite recursion.
- **Recursive case**: the function calls itself with a simpler input.

```python
def countdown(n):
    if n == 0:          # base case
        print("Go!")
        return
    print(n)
    countdown(n - 1)    # recursive case

countdown(3)
# Output: 3  2  1  Go!
```

## How Recursion Works — The Call Stack

Each function call creates a new **stack frame** in memory.
The stack grows with each call and unwinds as each call returns.

```
factorial(4)
  → 4 * factorial(3)
       → 3 * factorial(2)
            → 2 * factorial(1)
                 → 1 * factorial(0)
                      → returns 1   ← base case
                 → returns 1
            → returns 2
       → returns 6
  → returns 24
```

## Example: Factorial

```python
def factorial(n):
    if n == 0 or n == 1:   # base case
        return 1
    return n * factorial(n - 1)   # recursive case

print(factorial(5))   # Output: 120
print(factorial(0))   # Output: 1
```

## Example: Fibonacci

Each Fibonacci number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8...

```python
def fibonacci(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(6))   # Output: 8
```

**Warning**: This naive implementation is O(2^n) — very slow for large n.

## Example: Sum of a List

```python
def list_sum(lst):
    if len(lst) == 0:      # base case: empty list
        return 0
    return lst[0] + list_sum(lst[1:])   # first element + rest

print(list_sum([1, 2, 3, 4, 5]))   # Output: 15
```

## Example: Power Function

```python
def power(base, exp):
    if exp == 0:           # base case: anything^0 = 1
        return 1
    return base * power(base, exp - 1)

print(power(2, 5))   # Output: 32
```

## RecursionError — Stack Overflow

Python has a default recursion limit of ~1000. Exceeding it raises `RecursionError`.

```python
import sys
print(sys.getrecursionlimit())   # Output: 1000 (default)

def infinite(n):
    return infinite(n + 1)   # no base case!

# infinite(0)   # RecursionError: maximum recursion depth exceeded
```

You can increase the limit (use cautiously):
```python
sys.setrecursionlimit(5000)
```

## Memoization — Fixing Slow Recursion

Cache already-computed results to avoid redundant calls.

```python
# Manual memoization
cache = {}

def fib_memo(n):
    if n in cache:
        return cache[n]
    if n <= 1:
        return n
    cache[n] = fib_memo(n - 1) + fib_memo(n - 2)
    return cache[n]

print(fib_memo(35))   # Output: 9227465 — fast!
```

Using Python's built-in `functools.lru_cache`:

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(50))   # Output: 12586269025
```

## Recursion vs Iteration

| | Recursion | Iteration |
|---|---|---|
| Readability | Often cleaner for tree/nested problems | Better for simple loops |
| Memory | Uses call stack (one frame per call) | Constant memory |
| Speed | Slower due to function call overhead | Generally faster |
| Risk | Stack overflow for deep recursion | No stack risk |
| Best for | Trees, graphs, divide-and-conquer | Sequences, counters |

```python
# Recursive sum
def rec_sum(n):
    if n == 0:
        return 0
    return n + rec_sum(n - 1)

# Iterative sum — better for this case
def iter_sum(n):
    total = 0
    for i in range(n + 1):
        total += i
    return total
```

## Common Mistakes

- **Missing base case**: Leads to infinite recursion → `RecursionError`.
- **Wrong base case condition**: `if n == 0` when input can be negative — loop runs forever.
- **Not simplifying input**: If recursive call doesn't move toward base case, it never terminates.
- **Ignoring return value**: Calling `factorial(n-1)` without `return` gives `None`.

```python
# WRONG — missing return
def factorial(n):
    if n == 0:
        return 1
    n * factorial(n - 1)   # forgot return!

print(factorial(5))   # Output: None
```

## Edge Cases

- `factorial(0)` must return 1 by mathematical definition.
- Deep recursion on large inputs: use iteration or memoization instead.
- Mutual recursion: function A calls B, B calls A — both need base cases.
