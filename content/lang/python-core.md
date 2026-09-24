---
topic: lang.python-core
name: "Python essentials"
subject: lang
order: 5
prereqs: []
---

## lang.python-core.python-data-model
name: "Python data model"
importance: must
scope: "everything is an object, mutability, references, `is` vs `==`"

## lang.python-core.built-in-structures
name: "Built-in structures"
importance: must
prereqs: [lang.python-core.python-data-model]
scope: "list, tuple, dict, set and their operation costs"

## lang.python-core.collections-and-heapq
name: "collections and heapq"
importance: must
prereqs: [lang.python-core.built-in-structures]
scope: "deque, Counter, defaultdict, heapq min-heap and the max-heap trick"

## lang.python-core.comprehensions-and-generators
name: "Comprehensions and generators"
importance: important
scope: "lazy evaluation, `yield`, iterators"

## lang.python-core.functions-and-closures
name: "Functions and closures"
importance: important
scope: "`*args`, `**kwargs`, decorators, the mutable default argument pitfall"

## lang.python-core.classes-in-python
name: "Classes in Python"
importance: important
scope: "dunder methods, inheritance, method resolution order"

## lang.python-core.the-gil
name: "The GIL"
importance: important
scope: "what it is, threads vs processes vs asyncio"

## lang.python-core.interview-performance-tips
name: "Interview performance tips"
importance: advanced
scope: "recursion limit, fast input, `bisect`, `lru_cache`"
