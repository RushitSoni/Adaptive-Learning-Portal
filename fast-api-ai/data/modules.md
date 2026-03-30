# Python Modules and Imports

## What is a Module?

A module is a Python file (`.py`) containing functions, classes, and variables that can be reused in other files.
Python comes with a large standard library of built-in modules.

```python
import math
print(math.sqrt(16))   # Output: 4.0
```

## import Statement

Import an entire module. Access its contents with dot notation.

```python
import math

print(math.pi)          # Output: 3.141592653589793
print(math.floor(3.7))  # Output: 3
print(math.ceil(3.2))   # Output: 4
print(math.pow(2, 8))   # Output: 256.0
```

## from ... import

Import specific names from a module — no need for dot notation.

```python
from math import sqrt, pi

print(sqrt(25))   # Output: 5.0
print(pi)         # Output: 3.141592653589793
```

## import as — Aliases

Give a module or name a shorter alias.

```python
import math as m
print(m.sqrt(9))   # Output: 3.0

from math import factorial as fact
print(fact(5))   # Output: 120
```

## The os Module

Interact with the operating system — files, directories, paths.

```python
import os

print(os.getcwd())              # Current working directory
print(os.listdir("."))          # List files in current dir
os.mkdir("new_folder")          # Create directory
print(os.path.exists("file.txt"))  # Check if file exists
print(os.path.join("folder", "file.txt"))  # Build path safely
```

## The sys Module

Access Python interpreter information.

```python
import sys

print(sys.version)          # Python version string
print(sys.path)             # List of module search paths
print(sys.getrecursionlimit())  # Default: 1000
sys.exit(0)                 # Exit with status code
```

## The math Module

Mathematical functions and constants.

```python
import math

print(math.pi)           # 3.14159...
print(math.e)            # 2.71828...
print(math.sqrt(144))    # 12.0
print(math.log(100, 10)) # 2.0
print(math.sin(math.pi/2))  # 1.0
print(math.factorial(6))    # 720
print(math.gcd(12, 8))      # 4
```

## The random Module

Generate random numbers and make random selections.

```python
import random

print(random.random())           # Float between 0.0 and 1.0
print(random.randint(1, 10))     # Random int between 1 and 10
print(random.choice([1,2,3,4]))  # Random element from list

items = [1, 2, 3, 4, 5]
random.shuffle(items)            # Shuffle list in-place
print(items)

print(random.sample([1,2,3,4,5], 3))  # 3 unique random items
```

## The datetime Module

Work with dates and times.

```python
from datetime import datetime, date, timedelta

now = datetime.now()
print(now)                       # Current date and time
print(now.year, now.month, now.day)

today = date.today()
print(today)                     # Output: 2024-01-15 (example)

# Arithmetic with dates
tomorrow = today + timedelta(days=1)
print(tomorrow)

# Formatting
print(now.strftime("%d/%m/%Y %H:%M"))  # Output: 15/01/2024 14:30
```

## Creating Your Own Module

Any `.py` file is a module. Save this as `myutils.py`:

```python
# myutils.py
def greet(name):
    return f"Hello, {name}!"

PI = 3.14159
```

Then import it in another file:

```python
import myutils
print(myutils.greet("Alice"))   # Output: Hello, Alice!
print(myutils.PI)               # Output: 3.14159
```

## The __name__ == "__main__" Guard

Prevents code from running when a module is imported.

```python
# calculator.py
def add(a, b):
    return a + b

if __name__ == "__main__":
    # This only runs if you execute calculator.py directly
    # Not when it's imported
    print(add(3, 4))
```

## Packages

A package is a directory of modules with an `__init__.py` file.

```
mypackage/
    __init__.py
    math_utils.py
    string_utils.py
```

```python
from mypackage import math_utils
from mypackage.string_utils import clean_text
```

## Common Mistakes

- **Import order matters**: Standard library → third-party → local imports (PEP 8).
- **Circular imports**: Module A imports B, B imports A — causes `ImportError`.
- **`from module import *`**: Pollutes namespace, makes code hard to read — avoid.
- **Shadowing module names**: Naming your file `math.py` or `os.py` shadows the built-in module.

## Edge Cases

- `import` is cached: importing the same module twice only runs it once.
- `sys.path` determines where Python looks for modules — you can append to it.
- `__init__.py` can be empty — it just marks the directory as a package.
