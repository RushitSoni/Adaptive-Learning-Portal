# Python Exception Handling

## What is an Exception?

An exception is an error that occurs during program execution and disrupts normal flow.
Python uses exceptions to signal that something went wrong.

```python
x = 10 / 0   # Raises ZeroDivisionError
```

## Basic try-except

Wrap risky code in `try`. If an exception occurs, execution jumps to `except`.

```python
try:
    x = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero")
# Output: Cannot divide by zero
```

## Catching Multiple Exceptions

Handle different exception types separately, or catch multiple in a tuple.

```python
try:
    value = int("abc")
except ValueError:
    print("Invalid number format")
except TypeError:
    print("Wrong type provided")

# Catch multiple in one line:
try:
    result = int(input("Enter number: "))
except (ValueError, TypeError):
    print("Invalid input")
```

## The else Clause

`else` runs only if no exception was raised in `try`.

```python
try:
    number = int("42")
except ValueError:
    print("Conversion failed")
else:
    print(f"Converted successfully: {number}")
# Output: Converted successfully: 42
```

## The finally Block

`finally` always executes regardless of whether an exception occurred. Used for cleanup.

```python
try:
    file = open("data.txt", "r")
    content = file.read()
except FileNotFoundError:
    print("File not found")
finally:
    print("Cleanup complete")
    # file.close() would go here
```

## Raising Exceptions

Use `raise` to trigger an exception manually.

```python
def divide(a, b):
    if b == 0:
        raise ValueError("Division by zero is not allowed")
    return a / b

try:
    result = divide(10, 0)
except ValueError as e:
    print(f"Error: {e}")
# Output: Error: Division by zero is not allowed
```

## Exception Chaining with raise from

Preserve the original exception context when re-raising.

```python
try:
    int("abc")
except ValueError as original:
    raise RuntimeError("Processing failed") from original
```

## Custom Exceptions

Create your own exception classes by inheriting from `Exception`.

```python
class InsufficientFundsError(Exception):
    def __init__(self, amount, balance):
        self.amount = amount
        self.balance = balance
        super().__init__(f"Cannot withdraw {amount}. Balance is {balance}.")

class BankAccount:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            raise InsufficientFundsError(amount, self.balance)
        self.balance -= amount

account = BankAccount(100)
try:
    account.withdraw(200)
except InsufficientFundsError as e:
    print(e)
# Output: Cannot withdraw 200. Balance is 100.
```

## Common Built-in Exceptions

| Exception | When it occurs |
|---|---|
| `ValueError` | Wrong value type (e.g. `int("abc")`) |
| `TypeError` | Wrong type for operation (e.g. `"a" + 1`) |
| `IndexError` | List index out of range |
| `KeyError` | Dictionary key not found |
| `AttributeError` | Object has no such attribute |
| `FileNotFoundError` | File does not exist |
| `ZeroDivisionError` | Division by zero |
| `RecursionError` | Maximum recursion depth exceeded |

## The Exception Hierarchy

All exceptions inherit from `BaseException`. Most inherit from `Exception`.
`KeyboardInterrupt` and `SystemExit` inherit from `BaseException` directly.

## Common Mistakes

- **Catching bare `Exception`**: Too broad — hides bugs. Catch specific types.
- **Silent except**: `except: pass` swallows errors silently — always log or handle.
- **Not closing resources**: Use `finally` or `with` statement for file/DB cleanup.
- **Raising without message**: `raise ValueError()` gives no info — always include a message.
- **Misusing finally**: `return` inside `finally` overrides the `try` return value.

## Edge Cases

- Nested `try` blocks: inner exception propagates to outer if inner `except` doesn't handle it.
- `except Exception as e` — `e` is only accessible inside the `except` block.
- An exception in `finally` suppresses the original exception.

```python
try:
    raise ValueError("original")
finally:
    raise RuntimeError("from finally")
# RuntimeError is raised; ValueError is lost
```
