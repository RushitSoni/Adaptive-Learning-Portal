# Python Exception Handling

## What is an Exception?

An exception is an error that occurs during program execution.

## Basic Try-Except

```python
try:
    x = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero")
```

## Multiple Exceptions

```python
try:
    value = int("abc")
except ValueError:
    print("Invalid number")
```

## Finally Block

Executes regardless of error.

```python
try:
    file = open("test.txt")
finally:
    print("Execution finished")
```

## Raising Exceptions

```python
def divide(a, b):
    if b == 0:
        raise ValueError("Division by zero not allowed")
    return a / b
```

## Custom Exceptions

```python
class CustomError(Exception):
    pass
```

## Common Mistakes

- Catching broad Exception unnecessarily
- Ignoring errors silently
- Not closing resources
- Misusing finally

## Edge Cases

- Nested try blocks
- Exception chaining
- Resource cleanup failures