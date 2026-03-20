# Python Object-Oriented Programming (OOP)

## What is OOP?

OOP is a programming paradigm based on objects and classes.

Core Concepts:
- Class
- Object
- Inheritance
- Encapsulation
- Polymorphism
- Abstraction

## Creating a Class

```python
class Person:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return f"Hello, my name is {self.name}"
```

## Object Creation

```python
p1 = Person("Rushit")
print(p1.greet())
```

## Inheritance

```python
class Student(Person):
    def __init__(self, name, grade):
        super().__init__(name)
        self.grade = grade
```

## Encapsulation

- Use private variables with `_` or `__`
- Control access via methods

Example:
```python
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance
```

## Polymorphism

Different classes implementing same method name.

## Common Mistakes

- Forgetting self parameter
- Not calling super() in inheritance
- Misunderstanding class vs instance variables
- Modifying class attributes incorrectly

## Edge Cases

- Mutable class variables
- Overriding methods incorrectly
- Incorrect constructor chaining