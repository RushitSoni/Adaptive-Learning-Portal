# Python Variables and Data Types

## What is a Variable?

A variable is a named container that stores a value in memory.
In Python, you don't declare a type — Python infers it automatically (dynamic typing).

```python
name = "Alice"
age = 25
height = 5.6
is_student = True
```

## Rules for Variable Names

- Must start with a letter or underscore `_`
- Can contain letters, digits, underscores
- Case-sensitive: `name` and `Name` are different
- Cannot use reserved keywords (`if`, `for`, `class`, etc.)

```python
my_var = 10       # valid
_private = 5      # valid
var2 = "hello"    # valid
# 2var = 10       # SyntaxError — starts with digit
```

## Python Data Types

### int — Integer

Whole numbers, positive or negative, no limit in size.

```python
x = 10
y = -5
big = 1_000_000   # underscores for readability

print(type(x))    # Output: <class 'int'>
```

### float — Floating Point

Numbers with a decimal point.

```python
pi = 3.14159
temp = -0.5
sci = 1.5e3     # scientific notation = 1500.0

print(type(pi))   # Output: <class 'float'>
```

### str — String

Sequence of characters, enclosed in single or double quotes.

```python
name = "Alice"
greeting = 'Hello'
multi = """This is
a multiline string"""

print(type(name))   # Output: <class 'str'>
```

### bool — Boolean

Only two values: `True` or `False`. Used in conditions.

```python
is_active = True
is_admin = False

print(type(is_active))   # Output: <class 'bool'>
print(True + True)       # Output: 2  (bool is subclass of int)
```

### None — Null Value

Represents absence of a value. Not the same as `0`, `""`, or `False`.

```python
result = None
print(result is None)   # Output: True
print(type(None))       # Output: <class 'NoneType'>
```

## Type Conversion (Casting)

Convert between types using built-in functions.

```python
# int to str
x = 42
s = str(x)
print(s, type(s))   # Output: 42 <class 'str'>

# str to int
num = int("100")
print(num + 5)      # Output: 105

# str to float
pi = float("3.14")
print(pi)           # Output: 3.14

# int to float
f = float(5)
print(f)            # Output: 5.0

# bool conversions
print(bool(0))      # Output: False
print(bool(""))     # Output: False
print(bool(42))     # Output: True
print(bool("hi"))   # Output: True
```

## Checking Types

Use `type()` to get the type, or `isinstance()` to check.

```python
x = 3.14
print(type(x))              # Output: <class 'float'>
print(isinstance(x, float)) # Output: True
print(isinstance(x, int))   # Output: False
```

## Multiple Assignment

Assign multiple variables in one line.

```python
a, b, c = 1, 2, 3
print(a, b, c)   # Output: 1 2 3

# Swap two variables
x, y = 10, 20
x, y = y, x
print(x, y)      # Output: 20 10

# Same value to multiple variables
a = b = c = 0
```

## Constants (Convention)

Python has no built-in constant type. Use ALL_CAPS names by convention.

```python
MAX_SIZE = 100
PI = 3.14159
```

## Arithmetic Operators

```python
a, b = 10, 3

print(a + b)    # Output: 13   (addition)
print(a - b)    # Output: 7    (subtraction)
print(a * b)    # Output: 30   (multiplication)
print(a / b)    # Output: 3.333... (division — always float)
print(a // b)   # Output: 3    (floor division)
print(a % b)    # Output: 1    (modulus — remainder)
print(a ** b)   # Output: 1000 (exponentiation)
```

## Common Mistakes

- **Integer division**: `7 / 2` gives `3.5` (float), not `3`. Use `//` for integer result.
- **Type errors in operations**: `"age: " + 25` raises `TypeError` — must cast to str first.
- **Comparing with `==` vs `is`**: `==` checks value equality; `is` checks identity (same object in memory).

```python
a = [1, 2]
b = [1, 2]
print(a == b)   # True  — same values
print(a is b)   # False — different objects

x = None
print(x is None)   # Correct way to check None
```

## Edge Cases

- `int` division of negatives: `-7 // 2 = -4` (floors toward negative infinity, not zero).
- `float` precision: `0.1 + 0.2` is not exactly `0.3` due to floating-point representation.
- Very large integers work fine in Python with no overflow — unlike C/Java.

```python
print(0.1 + 0.2)          # Output: 0.30000000000000004
print(round(0.1 + 0.2, 1))  # Output: 0.3
```
