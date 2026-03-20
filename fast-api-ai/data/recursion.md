# Python Recursion

## What is Recursion?

Recursion is when a function calls itself.

Every recursive function must have:
- Base case
- Recursive case

## Example: Factorial

```python
def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)
```

## How Recursion Works

- Each call creates a new stack frame
- Execution continues until base case
- Then stack unwinds

## Base Case

The stopping condition.

Without base case → infinite recursion → RecursionError.

## Common Example: Fibonacci

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

## Recursion vs Iteration

Recursion:
- Elegant
- Cleaner for tree problems

Iteration:
- More memory efficient
- Avoids stack overflow

## Common Mistakes

- Missing base case
- Wrong base condition
- Infinite recursion
- Excessive recursive calls

## Edge Cases

- Large input values
- Stack overflow
- Performance issues in exponential recursion