# Python Functions

## What is a Function?

A function is a named, reusable block of code that performs a specific task.
Functions help avoid repetition, improve readability, and break code into logical units.

```python
def greet(name):
    return f"Hello, {name}!"

print(greet("Alice"))   # Output: Hello, Alice!
```

## Defining a Function

Use the `def` keyword, followed by the function name, parameters in parentheses, and a colon.

```python
def add(a, b):
    result = a + b
    return result

print(add(3, 4))   # Output: 7
```

## The return Statement

`return` sends a value back to the caller. Without `return`, the function returns `None`.

```python
def square(n):
    return n * n

def no_return():
    x = 5  # No return statement

print(square(4))      # Output: 16
print(no_return())    # Output: None
```

## Returning Multiple Values

Python functions can return multiple values as a tuple.

```python
def min_max(numbers):
    return min(numbers), max(numbers)

low, high = min_max([3, 1, 7, 2, 9])
print(low, high)   # Output: 1 9
```

## Default Arguments

Parameters can have default values. Used when argument is not passed.

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Bob"))              # Output: Hello, Bob!
print(greet("Bob", "Hi"))        # Output: Hi, Bob!
```

## Keyword Arguments

Pass arguments by name — order doesn't matter.

```python
def describe(name, age, city):
    return f"{name}, {age}, from {city}"

print(describe(age=25, city="Delhi", name="Raj"))
# Output: Raj, 25, from Delhi
```

## *args — Variable Positional Arguments

Accept any number of positional arguments as a tuple.

```python
def total(*args):
    return sum(args)

print(total(1, 2, 3))       # Output: 6
print(total(10, 20, 30, 40))  # Output: 100
```

## **kwargs — Variable Keyword Arguments

Accept any number of keyword arguments as a dictionary.

```python
def show_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")

show_info(name="Alice", age=30, city="Mumbai")
# Output:
# name: Alice
# age: 30
# city: Mumbai
```

## Variable Scope

Variables defined inside a function are local — not accessible outside.
Variables defined outside are global.

```python
x = 10   # global

def test():
    x = 5   # local — does NOT change global x
    print(x)

test()      # Output: 5
print(x)    # Output: 10
```

Use `global` keyword to modify a global variable inside a function.

```python
count = 0

def increment():
    global count
    count += 1

increment()
print(count)   # Output: 1
```

## Lambda Functions

Anonymous one-line functions using `lambda`. Used for short, throwaway functions.

```python
square = lambda x: x * x
print(square(5))   # Output: 25

# With map()
numbers = [1, 2, 3, 4]
doubled = list(map(lambda x: x * 2, numbers))
print(doubled)   # Output: [2, 4, 6, 8]
```

## Docstrings

A string literal at the start of a function body that documents it.

```python
def add(a, b):
    """
    Add two numbers and return the result.

    Args:
        a: First number
        b: Second number
    Returns:
        Sum of a and b
    """
    return a + b

print(add.__doc__)
```

## Higher-Order Functions

Functions that take other functions as arguments or return functions.

```python
def apply(func, value):
    return func(value)

print(apply(abs, -10))      # Output: 10
print(apply(str.upper, "hello"))  # Output: HELLO
```

## Common Mistakes

- **Forgetting `return`**: Printing inside a function is not the same as returning.
- **Mutable default arguments**: Using `[]` or `{}` as default is a common bug.

```python
# WRONG — list is shared across all calls
def add_item(item, lst=[]):
    lst.append(item)
    return lst

print(add_item(1))   # [1]
print(add_item(2))   # [1, 2]  ← unexpected!

# CORRECT
def add_item(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

- **Confusing `print` and `return`**: `print` shows output; `return` sends data back.
- **Shadowing built-ins**: Naming a variable `list`, `str`, `len` breaks those built-ins.

## Edge Cases

- A function with no arguments: `def greet(): ...`
- Returning `None` explicitly: `return None` is the same as `return` alone.
- Functions are first-class objects — they can be stored in variables and passed around.
