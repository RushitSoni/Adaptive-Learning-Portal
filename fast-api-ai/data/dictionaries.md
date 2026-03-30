# Python Dictionaries

## What is a Dictionary?

A dictionary is an unordered collection of key-value pairs.
Keys must be unique and immutable (strings, numbers, tuples).
Values can be anything.

```python
student = {
    "name": "Alice",
    "age": 20,
    "grade": "A"
}

print(type(student))   # Output: <class 'dict'>
print(len(student))    # Output: 3
```

## Accessing Values

Access by key using square brackets or `.get()`.

```python
student = {"name": "Alice", "age": 20}

print(student["name"])       # Output: Alice
# print(student["phone"])    # KeyError — key doesn't exist

# .get() — safe access, returns None if key missing
print(student.get("age"))    # Output: 20
print(student.get("phone"))  # Output: None
print(student.get("phone", "N/A"))  # Output: N/A  (default)
```

## Adding and Updating

```python
person = {"name": "Bob"}

person["age"] = 25           # add new key
person["name"] = "Robert"    # update existing key
print(person)
# Output: {'name': 'Robert', 'age': 25}
```

## Removing Items

```python
d = {"a": 1, "b": 2, "c": 3}

d.pop("b")          # Remove key "b", returns value 2
del d["c"]          # Remove key "c"
d.clear()           # Remove all items → {}
```

## Dictionary Methods

```python
info = {"name": "Alice", "age": 20, "city": "Delhi"}

print(info.keys())     # Output: dict_keys(['name', 'age', 'city'])
print(info.values())   # Output: dict_values(['Alice', 20, 'Delhi'])
print(info.items())    # Output: dict_items([('name', 'Alice'), ...])
```

## Iterating Over a Dictionary

```python
scores = {"math": 90, "science": 85, "english": 78}

# Iterate keys
for subject in scores:
    print(subject)

# Iterate values
for score in scores.values():
    print(score)

# Iterate key-value pairs
for subject, score in scores.items():
    print(f"{subject}: {score}")
```

## Checking Key Existence

```python
d = {"a": 1, "b": 2}
print("a" in d)      # Output: True
print("c" in d)      # Output: False
print("c" not in d)  # Output: True
```

## Dictionary Comprehension

Create dictionaries in one line.

```python
# Square of numbers 1-5
squares = {x: x**2 for x in range(1, 6)}
print(squares)
# Output: {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}

# Filter: only even values
nums = {"a": 1, "b": 2, "c": 3, "d": 4}
evens = {k: v for k, v in nums.items() if v % 2 == 0}
print(evens)
# Output: {'b': 2, 'd': 4}
```

## Nested Dictionaries

A dictionary can contain other dictionaries as values.

```python
students = {
    "Alice": {"age": 20, "grade": "A"},
    "Bob":   {"age": 22, "grade": "B"}
}

print(students["Alice"]["grade"])   # Output: A

# Iterate nested
for name, info in students.items():
    print(f"{name}: age={info['age']}, grade={info['grade']}")
```

## Merging Dictionaries

```python
d1 = {"a": 1, "b": 2}
d2 = {"b": 3, "c": 4}

# Python 3.9+ — merge with |
merged = d1 | d2
print(merged)   # Output: {'a': 1, 'b': 3, 'c': 4}

# update() method — modifies in-place
d1.update(d2)
print(d1)       # Output: {'a': 1, 'b': 3, 'c': 4}
```

## setdefault()

Return value for a key; if key doesn't exist, insert it with a default value.

```python
d = {"a": 1}
d.setdefault("b", 0)   # "b" not in d → inserts "b": 0
d.setdefault("a", 99)  # "a" already in d → no change
print(d)   # Output: {'a': 1, 'b': 0}
```

## Counting with Dictionaries

```python
text = "hello world"
freq = {}
for char in text:
    freq[char] = freq.get(char, 0) + 1

print(freq)
# Output: {'h': 1, 'e': 1, 'l': 3, 'o': 2, ' ': 1, 'w': 1, 'r': 1, 'd': 1}
```

## Common Mistakes

- **KeyError**: Accessing a non-existent key directly. Use `.get()` for safe access.
- **Mutable keys**: Lists cannot be dictionary keys — they're mutable. Use tuples instead.
- **Assuming order**: In Python 3.7+ dicts maintain insertion order, but don't rely on sorted order.
- **Shallow copy**: `d2 = d1` doesn't copy — both point to same dict. Use `d2 = d1.copy()`.

```python
# WRONG — same object
d1 = {"a": 1}
d2 = d1
d2["b"] = 2
print(d1)   # Output: {'a': 1, 'b': 2}  ← d1 was modified!

# CORRECT
d2 = d1.copy()
```

## Edge Cases

- Empty dict is falsy: `if not {}:` is `True`.
- `dict()` constructor: `dict(name="Alice", age=20)` creates `{"name": "Alice", "age": 20}`.
- Dictionary keys are case-sensitive: `"Name"` and `"name"` are different keys.
