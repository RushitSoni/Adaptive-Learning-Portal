# Python Functions

## What is a Function?
A function is a reusable block of code that performs a specific task.

Functions help:
- Avoid repetition
- Improve readability
- Break code into logical units

## Defining a Function

Example:
```python
def greet(name):
    return f"Hello, {name}"
```

## Function Parameters

Types:
- Positional arguments
- Keyword arguments
- Default arguments

Example:
```python
def add(a, b=10):
    return a + b
```

## Return Statement

A function returns a value using `return`.

If no return is specified, it returns `None`.

Example:
```python
def print_message():
    print("Hello")

result = print_message()
print(result)  # None
```

## Variable Scope

- Local variables exist inside function
- Global variables exist outside

Example:
```python
x = 10

def test():
    x = 5
    print(x)

test()
print(x)
```

## Lambda Functions

Anonymous functions defined using `lambda`.

Example:
```python
square = lambda x: x * x
print(square(4))
```

## Common Mistakes

- Forgetting return statement
- Confusing print() with return
- Modifying mutable default arguments
- Using global variables incorrectly

## Edge Cases

- Mutable default arguments
- Shadowing variable names
- Returning multiple values