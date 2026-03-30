# Python Strings

## What is a String?

A string is an immutable sequence of characters enclosed in single `'`, double `"`, or triple quotes `"""`.

```python
s1 = "Hello"
s2 = 'World'
s3 = """Multiline
string"""

print(type(s1))   # Output: <class 'str'>
print(len(s1))    # Output: 5
```

## Indexing and Slicing

Strings are sequences — access characters by index. Zero-indexed.

```python
s = "Python"

print(s[0])     # Output: P
print(s[-1])    # Output: n
print(s[1:4])   # Output: yth
print(s[::-1])  # Output: nohtyP  (reversed)
```

## String Concatenation and Repetition

```python
first = "Hello"
last = "World"

combined = first + " " + last
print(combined)      # Output: Hello World

repeated = "Ha" * 3
print(repeated)      # Output: HaHaHa
```

## f-Strings (Formatted String Literals)

Embed expressions directly in strings with `f"..."`. Python 3.6+.

```python
name = "Alice"
age = 30

print(f"My name is {name} and I am {age} years old.")
# Output: My name is Alice and I am 30 years old.

print(f"2 + 2 = {2 + 2}")   # Output: 2 + 2 = 4
print(f"{name.upper()}")     # Output: ALICE
print(f"{3.14159:.2f}")      # Output: 3.14  (2 decimal places)
```

## .format() Method

Older but still widely used formatting.

```python
print("Hello, {}!".format("Bob"))
print("Name: {name}, Age: {age}".format(name="Alice", age=25))
```

## Common String Methods

```python
s = "  Hello, World!  "

print(s.strip())         # "Hello, World!"  — remove whitespace
print(s.lstrip())        # "Hello, World!  "
print(s.rstrip())        # "  Hello, World!"

s2 = "Hello, World!"
print(s2.upper())        # "HELLO, WORLD!"
print(s2.lower())        # "hello, world!"
print(s2.title())        # "Hello, World!"

print(s2.replace("World", "Python"))  # "Hello, Python!"
print(s2.split(", "))    # ['Hello', 'World!']
print(s2.startswith("Hello"))  # True
print(s2.endswith("!"))        # True
print(s2.find("World"))        # 7  (index of first match)
print(s2.count("l"))           # 3
print("hello".capitalize())    # "Hello"
```

## split() and join()

`split()` breaks a string into a list. `join()` combines a list into a string.

```python
sentence = "apple,banana,cherry"
fruits = sentence.split(",")
print(fruits)   # Output: ['apple', 'banana', 'cherry']

joined = " | ".join(fruits)
print(joined)   # Output: apple | banana | cherry
```

## Checking String Content

```python
print("hello123".isalnum())   # True  — only letters and digits
print("hello".isalpha())      # True  — only letters
print("123".isdigit())        # True  — only digits
print("  ".isspace())         # True  — only whitespace
print("Hello".islower())      # False
print("HELLO".isupper())      # True
```

## String Immutability

Strings cannot be changed after creation. Every modification creates a new string.

```python
s = "hello"
# s[0] = "H"    # TypeError — strings are immutable

s = "H" + s[1:]  # Create new string
print(s)          # Output: Hello
```

## Escape Characters

```python
print("She said \"hello\"")   # She said "hello"
print("Line1\nLine2")          # Line1 (newline) Line2
print("Tab\there")             # Tab    here
print("Backslash: \\")         # Backslash: \
```

## Raw Strings

Prefix with `r` to ignore escape sequences. Useful for file paths and regex.

```python
path = r"C:\Users\name\folder"
print(path)   # Output: C:\Users\name\folder
```

## String Membership

```python
print("hello" in "say hello world")   # True
print("xyz" in "hello")               # False
```

## Common Mistakes

- **Strings are immutable**: Can't do `s[0] = "X"`. Build a new string.
- **`+` with non-strings**: `"Age: " + 25` raises `TypeError`. Use f-string or `str(25)`.
- **`split()` default**: `"a  b".split()` splits on any whitespace. `"a  b".split(" ")` gives `['a', '', 'b']`.
- **Case sensitivity**: `"Hello" == "hello"` is `False`. Use `.lower()` for comparisons.

## Edge Cases

- Empty string `""` is falsy: `if not "":` is `True`.
- Comparing strings uses lexicographic order: `"banana" > "apple"` is `True`.
- `str * 0` gives empty string: `"hi" * 0 == ""`.
- `in` checks substring: `"ell" in "hello"` is `True`.
