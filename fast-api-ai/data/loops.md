# Python Loops

## What is a Loop?

A loop is a control flow statement that repeats a block of code multiple times.
Python has two types of loops: `for` and `while`.

## The for Loop

A `for` loop iterates over a sequence (list, tuple, string, range, etc.).

```python
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)
# Output:
# apple
# banana
# cherry
```

## The range() Function

`range()` generates a sequence of numbers. Used with `for` loops.

```python
for i in range(5):
    print(i)
# Output: 0 1 2 3 4

for i in range(2, 8):
    print(i)
# Output: 2 3 4 5 6 7

for i in range(0, 10, 2):
    print(i)
# Output: 0 2 4 6 8  (step=2)
```

## The while Loop

A `while` loop runs as long as a condition is True.

```python
count = 0
while count < 5:
    print(count)
    count += 1
# Output: 0 1 2 3 4
```

## break Statement

`break` exits the loop immediately.

```python
for i in range(10):
    if i == 5:
        break
    print(i)
# Output: 0 1 2 3 4
```

## continue Statement

`continue` skips the rest of the current iteration and moves to the next.

```python
for i in range(6):
    if i == 3:
        continue
    print(i)
# Output: 0 1 2 4 5  (3 is skipped)
```

## pass Statement

`pass` is a no-op placeholder. Does nothing but allows syntactically empty blocks.

```python
for i in range(5):
    pass  # Will add logic later
```

## else Clause in Loops

A `for` or `while` loop can have an `else` block that runs when the loop finishes normally (not via `break`).

```python
for i in range(3):
    print(i)
else:
    print("Loop finished")
# Output: 0 1 2 Loop finished

for i in range(3):
    if i == 1:
        break
else:
    print("This will NOT print because break was used")
```

## Nested Loops

A loop inside another loop. Inner loop completes all iterations for each outer iteration.

```python
for i in range(1, 4):
    for j in range(1, 4):
        print(f"{i} x {j} = {i*j}")
```

## Looping with enumerate()

`enumerate()` gives both index and value while iterating.

```python
colors = ["red", "green", "blue"]
for index, color in enumerate(colors):
    print(f"{index}: {color}")
# Output:
# 0: red
# 1: green
# 2: blue
```

## Looping with zip()

`zip()` iterates over two or more sequences in parallel.

```python
names = ["Alice", "Bob", "Charlie"]
scores = [85, 92, 78]

for name, score in zip(names, scores):
    print(f"{name}: {score}")
# Output:
# Alice: 85
# Bob: 92
# Charlie: 78
```

## List Comprehension (Loop in One Line)

A concise way to create lists using a loop.

```python
squares = [x**2 for x in range(1, 6)]
print(squares)
# Output: [1, 4, 9, 16, 25]

evens = [x for x in range(10) if x % 2 == 0]
print(evens)
# Output: [0, 2, 4, 6, 8]
```

## Infinite Loop

A `while True` loop runs forever unless broken with `break`.

```python
while True:
    user_input = input("Enter 'quit' to stop: ")
    if user_input == "quit":
        break
```

## Common Mistakes

- **Off-by-one errors**: `range(5)` gives 0–4, not 1–5.
- **Infinite loop**: Forgetting to update the loop variable in `while`.
- **Modifying a list while iterating**: Can skip elements or crash. Iterate over a copy instead.
- **Confusing `break` and `continue`**: `break` exits loop; `continue` skips one iteration.
- **Not using `enumerate`**: Using `range(len(list))` when `enumerate` is cleaner.

## Edge Cases

- `range(0)` produces an empty sequence — loop body never executes.
- `zip()` stops at the shortest sequence.
- Nested `break` only breaks the innermost loop.
- `for` loop variable persists after the loop ends (retains its last value).

```python
for i in range(3):
    pass
print(i)  # Output: 2 (last value of i)
```
