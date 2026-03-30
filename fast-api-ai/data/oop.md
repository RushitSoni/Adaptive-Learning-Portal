# Python Object-Oriented Programming (OOP)

## What is OOP?

Object-Oriented Programming is a paradigm that organises code around objects and classes.
Instead of writing procedures, you model real-world entities as objects that have data (attributes) and behaviour (methods).

Core pillars: Encapsulation, Inheritance, Polymorphism, Abstraction.

## Classes and Objects

A **class** is a blueprint. An **object** is an instance created from that blueprint.

```python
class Dog:
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed

    def bark(self):
        return f"{self.name} says: Woof!"

# Creating objects
dog1 = Dog("Bruno", "Labrador")
dog2 = Dog("Max", "Poodle")

print(dog1.bark())   # Output: Bruno says: Woof!
print(dog2.name)     # Output: Max
```

## The __init__ Method

`__init__` is the constructor — called automatically when an object is created.
`self` refers to the current instance.

```python
class Person:
    def __init__(self, name, age):
        self.name = name   # instance attribute
        self.age = age

p = Person("Alice", 30)
print(p.name)   # Output: Alice
```

## Instance vs Class Attributes

Instance attributes belong to one object. Class attributes are shared by all instances.

```python
class Circle:
    pi = 3.14159   # class attribute — shared

    def __init__(self, radius):
        self.radius = radius   # instance attribute — unique per object

    def area(self):
        return Circle.pi * self.radius ** 2

c1 = Circle(5)
c2 = Circle(10)
print(c1.area())   # Output: 78.53975
print(c2.area())   # Output: 314.159
```

## Encapsulation

Encapsulation restricts direct access to internal data using private attributes.
Use `_name` (convention, "protected") or `__name` (name-mangled, "private").

```python
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance   # private

    def deposit(self, amount):
        if amount > 0:
            self.__balance += amount

    def withdraw(self, amount):
        if amount > self.__balance:
            raise ValueError("Insufficient funds")
        self.__balance -= amount

    def get_balance(self):
        return self.__balance

account = BankAccount(1000)
account.deposit(500)
print(account.get_balance())   # Output: 1500
# print(account.__balance)     # AttributeError — private!
```

## Inheritance

A child class inherits attributes and methods from a parent class.
Use `super()` to call the parent's `__init__`.

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "Some sound"

class Cat(Animal):
    def __init__(self, name, color):
        super().__init__(name)   # call parent __init__
        self.color = color

    def speak(self):            # override parent method
        return f"{self.name} says: Meow!"

cat = Cat("Whiskers", "white")
print(cat.speak())    # Output: Whiskers says: Meow!
print(cat.name)       # Output: Whiskers  (inherited)
```

## isinstance() and issubclass()

```python
class Vehicle:
    pass

class Car(Vehicle):
    pass

car = Car()
print(isinstance(car, Car))       # True
print(isinstance(car, Vehicle))   # True — because Car inherits Vehicle
print(issubclass(Car, Vehicle))   # True
```

## Polymorphism

Different classes implementing the same method name, each with their own behaviour.

```python
class Shape:
    def area(self):
        return 0

class Rectangle(Shape):
    def __init__(self, w, h):
        self.w = w
        self.h = h

    def area(self):
        return self.w * self.h

class Circle(Shape):
    def __init__(self, r):
        self.r = r

    def area(self):
        return 3.14 * self.r ** 2

shapes = [Rectangle(4, 5), Circle(3)]
for shape in shapes:
    print(shape.area())
# Output:
# 20
# 28.26
```

## Abstraction with Abstract Classes

Abstract classes define a common interface. Cannot be instantiated directly.
Use `abc` module.

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        pass

class Square(Shape):
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side ** 2

# Shape()  # TypeError — cannot instantiate abstract class
s = Square(4)
print(s.area())   # Output: 16
```

## Dunder / Magic Methods

Special methods with double underscores that customize object behaviour.

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        return f"Point({self.x}, {self.y})"

    def __repr__(self):
        return f"Point(x={self.x}, y={self.y})"

    def __add__(self, other):
        return Point(self.x + other.x, self.y + other.y)

p1 = Point(1, 2)
p2 = Point(3, 4)
print(p1)           # Output: Point(1, 2)    — uses __str__
print(p1 + p2)      # Output: Point(4, 6)    — uses __add__
```

## @classmethod and @staticmethod

`@classmethod` receives the class as first argument (`cls`). Used as alternative constructors.
`@staticmethod` receives no implicit first argument. Utility functions.

```python
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    @classmethod
    def from_fahrenheit(cls, f):
        return cls((f - 32) * 5 / 9)

    @staticmethod
    def is_freezing(celsius):
        return celsius <= 0

t = Temperature.from_fahrenheit(212)
print(t.celsius)                     # Output: 100.0
print(Temperature.is_freezing(-5))   # Output: True
```

## Common Mistakes

- **Forgetting `self`**: Every instance method must have `self` as first parameter.
- **Not calling `super().__init__()`**: Parent attributes won't be initialised in child.
- **Confusing class and instance attributes**: Mutable class attributes are shared — modifying them affects all instances.
- **Wrong use of `__str__` vs `__repr__`**: `__str__` is for end-users; `__repr__` is for developers/debugging.

## Edge Cases

- Multiple inheritance is supported: `class C(A, B)`. Python uses MRO (Method Resolution Order).
- `__init__` is not a constructor in the strict sense — `__new__` creates the object.
- Accessing a private attribute externally: `obj._ClassName__attr` (name mangling).
