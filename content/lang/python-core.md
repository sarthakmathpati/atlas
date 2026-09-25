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

### simple
In Python, every value is an object, and a variable is just a name tag tied to an object, not a box that holds it. Two names can be tied to the same object, so changing the object through one name shows up through the other. Some objects can be changed in place (lists, dictionaries, sets) and others never change (numbers, strings, tuples), and that difference explains most surprising Python behavior.

### interview
- Every value is an **object** with an identity (`id`), a type and a value. **Variables are names bound to objects**; assignment `b = a` binds another name to the same object and copies nothing.
- **Mutable** objects (`list`, `dict`, `set`, most class instances) can change in place; **immutable** ones (`int`, `float`, `str`, `tuple`, `frozenset`) cannot, so "changing" them creates a new object.
- `==` compares **values** (calls `__eq__`); `is` compares **identity** (the same object). Use `is` only for singletons: `x is None`. Small-integer and string caching make `is` seem to work for equal values sometimes; that is a CPython implementation detail.
- Arguments are passed by **object reference** ("call by sharing"): a function can mutate a list you pass in, but rebinding the parameter name does not affect the caller.
- Copies: `list(a)`, `a[:]` and `copy.copy` are **shallow** (inner objects are shared); `copy.deepcopy` copies recursively. `[[0] * 3] * 2` repeats **one** inner list twice.
- Only **hashable** objects (immutable ones, and tuples of them) can be dict keys or set members.

### deep
#### Worked example

```python
a = [1, 2, 3]
b = a                    # a second name for the same list
c = list(a)              # a new list with the same items
b.append(4)
print(a, c)
print(a == c, a is c, a is b)

def add_item(items, x):
    items.append(x)      # mutates the caller's list
    items = [x]          # rebinds the local name only
    return items

print(add_item(a, 5), a)

t = (1, [2, 3])          # a tuple is immutable, but it can hold a mutable list
t[1].append(4)
print(t)
s = "cat"
print(s.upper(), s)      # str methods return new strings
x = None
print(x is None, type(t).__name__, isinstance(True, int))
grid = [[0] * 3] * 2     # two references to ONE inner list
grid[0][0] = 9
print(grid)
grid = [[0] * 3 for _ in range(2)]   # two separate lists
grid[0][0] = 9
print(grid)
```

Output:

```text
[1, 2, 3, 4] [1, 2, 3]
False False True
[5] [1, 2, 3, 4, 5]
(1, [2, 3, 4])
CAT cat
True tuple True
[[9, 0, 0], [9, 0, 0]]
[[9, 0, 0], [0, 0, 0]]
```

- `b.append(4)` changed the list that `a` also names; `c` is a separate list, so it kept three items.
- After the append, `a` and `c` differ, so `==` is False; `a is b` is True because they are one object.
- Inside `add_item`, `items.append(x)` reached the caller's list, but `items = [x]` only moved the local name.
- The tuple itself never changed (it still holds the same two objects), but the list inside it did.
- `bool` is a subclass of `int`, so `True` is an `int`.
- `[[0] * 3] * 2` copies the reference to one inner list, so a write through one row appears in both. The comprehension builds a new inner list per row, which is what a 2D grid needs.

#### Names, objects and references

```text
a ──┐
    ├──> [1, 2, 3, 4, 5]      c ───> [1, 2, 3]
b ──┘
```

Rebinding a name (`a = something_else`) moves only that tag; the object lives on while any name or container still refers to it. CPython frees an object when its reference count drops to zero, with a cycle collector for reference cycles.

#### Pitfalls

- `x == None` works but can be fooled by a custom `__eq__`; write `x is None`.
- Comparing numbers or strings with `is` gives results that change between values, versions and contexts; always use `==`.
- A mutable default argument (`def f(items=[])`) is one object shared by all calls (see functions and closures).
- Modifying a list while iterating over it skips elements; iterate over a copy or build a new list.

Connects to: built-in structures, functions and closures, classes in Python.

### questions
Q: What is the difference between is and == in Python?
A: == compares values by calling __eq__, while is checks whether two names refer to the very same object. Use is only for identity checks against singletons such as None; for numbers and strings it may appear to work because of caching, but that is an implementation detail.

Q: Are Python arguments passed by value or by reference?
A: By object reference, sometimes called call by sharing: the function receives a reference to the same object. Mutating a mutable argument, such as appending to a list, is visible to the caller, but assigning a new object to the parameter name only changes the local name.

Q: Why does [[0] * 3] * 2 behave strangely?
A: Multiplying a list repeats references, so the outer list contains the same inner list twice, and changing one row changes both. Build independent rows with a comprehension such as [[0] * 3 for _ in range(2)].

Q: Which objects can be dictionary keys?
A: Hashable ones: objects whose hash stays the same during their lifetime and that define equality consistently, which includes immutable built-ins like int, str, frozenset and tuples containing only hashable items. Lists, dicts and sets are mutable and therefore unhashable.

## lang.python-core.built-in-structures
name: "Built-in structures"
importance: must
prereqs: [lang.python-core.python-data-model]
scope: "list, tuple, dict, set and their operation costs"

### simple
Python gives you four everyday containers. A list is an ordered row you can grow, a tuple is a fixed row that cannot change, a dictionary looks up values by key like a phone book, and a set is a bag of unique items that answers "is this in here?" instantly. Picking the right one is often the difference between a solution that runs in a blink and one that crawls.

### interview
- `list`: a dynamic array. Indexing, `append` and `pop()` are O(1) (append amortized); `insert(0, x)`, `pop(0)`, `remove(x)`, `x in lst` and `index` are **O(n)**; slicing `lst[i:j]` copies, O(j − i); `sort` is O(n log n) and stable (Timsort).
- `tuple`: an immutable sequence; hashable if its items are, so it works as a dict key or set member (grid coordinates, memo keys).
- `dict`: a hash table with **O(1) average** get, set, delete and `in`; keys keep **insertion order** (guaranteed since Python 3.7). `d.get(k, default)` avoids `KeyError`.
- `set`: a hash table of keys only: O(1) average `add`, `remove`, `in`; set algebra with `|`, `&`, `-`. Converting a list to a set for repeated membership tests turns O(n) checks into O(1).
- Strings are immutable: build them with `"".join(parts)`, which is linear, instead of repeated `+=` in a loop.
- Worst cases: hash collisions can make dict and set operations O(n), and `list.pop(0)` in a loop is O(n^2) in total; use `collections.deque` for queues.

### deep
#### Worked example

```python
nums = [3, 1, 2]
nums.append(4)                   # amortized O(1)
nums.insert(0, 0)                # O(n): every element shifts right
print(nums, nums[-1], nums[1:3]) # a slice is a new list: O(k)
print(2 in nums, 2 in set(nums)) # O(n) scan versus O(1) average hash lookup

ages = {"ravi": 30, "ana": 25}
ages["bo"] = 41
print(list(ages), ages.get("zed", 0))   # keys keep insertion order
del ages["ana"]
print(ages)

point = (3, 4)                   # immutable and hashable: works as a key
seen = {point}
print((3, 4) in seen)
try:
    seen.add([3, 4])             # a list is mutable, so it is not hashable
except TypeError as e:
    print("TypeError:", e)

parts = [str(i) for i in range(5)]
print(",".join(parts))           # one pass over all the pieces
```

Output:

```text
[0, 3, 1, 2, 4] 4 [3, 1]
True True
['ravi', 'ana', 'bo'] 0
{'ravi': 30, 'bo': 41}
True
TypeError: unhashable type: 'list'
0,1,2,3,4
```

Both membership tests print True, but at very different costs: `2 in nums` scans the list, and building `set(nums)` costs O(n) once, after which each lookup is O(1) on average. Build the set once when you will test membership many times.

#### Costs

| operation | list | dict / set |
|---|---|---|
| index `a[i]` | O(1) | - |
| `x in c` | O(n) | O(1) average |
| append / add | O(1) amortized | O(1) average |
| insert or delete at the front | O(n) | - |
| delete by key or value | O(n) (`remove`) | O(1) average |
| `pop()` from the end | O(1) | - |
| copy, `list(c)`, `c[:]` | O(n) | O(n) |
| sort | O(n log n) | - |
| iterate | O(n) | O(n) |

`len` is O(1) for all of them. `min`, `max`, `sum` and `sorted` are O(n) or O(n log n) calls that are easy to hide inside a loop.

#### Pitfalls

- `list.index`, `count` and `remove` all scan; in a loop they make quadratic code.
- Iterating over a dict while adding or deleting keys raises `RuntimeError`; iterate over `list(d)` instead.
- Sets and dicts need hashable elements: convert inner lists to tuples first.
- Sorting with `key=` (`sorted(people, key=lambda p: (p.age, p.name))`) is clearer and faster than comparison functions.

Connects to: collections and heapq, Python data model, cost of built-in operations, hashing.

### questions
Q: What are the time complexities of the main list operations?
A: Indexing, len, append and pop from the end are O(1), with append amortized. Inserting or popping at the front or middle, remove, index, count and the in operator are O(n). Slicing copies k elements, and sort is O(n log n).

Q: Why is checking membership in a set faster than in a list?
A: A set is a hash table, so checking membership hashes the value and looks in one slot, which is O(1) on average. A list has no index by value, so in must compare against elements one by one, which is O(n).

Q: Are Python dictionaries ordered?
A: Yes. Since Python 3.7 the language guarantees that dicts preserve insertion order: iteration returns keys in the order they were first inserted, and updating an existing key keeps its position. Deleting and reinserting a key moves it to the end.

Q: When would you use a tuple instead of a list?
A: For fixed records whose items should not change, such as coordinates or return values with several parts, and whenever the value must be hashable, such as a dictionary key or a set member. Tuples are also slightly smaller and faster to create.

## lang.python-core.collections-and-heapq
name: "collections and heapq"
importance: must
prereqs: [lang.python-core.built-in-structures]
scope: "deque, Counter, defaultdict, heapq min-heap and the max-heap trick"

### simple
The collections and heapq modules are Python's toolbox of specialised containers. A deque is a line you can join or leave at either end quickly, a Counter tallies how often things appear, and a defaultdict fills in a starting value for keys it has not seen. heapq keeps a list arranged so the smallest item is always at the front, like a to-do list that sorts itself by urgency.

### interview
- `deque`: a double-ended queue with O(1) `append`, `appendleft`, `pop` and `popleft` (use it for BFS instead of `list.pop(0)`); `deque(maxlen=k)` keeps a sliding window of the last k items. Indexing the middle is O(n).
- `Counter`: a dict subclass for counts: `Counter(words)`, `most_common(k)`, arithmetic (`c1 + c2`, `c1 - c2`), and a missing key reads as 0 instead of raising.
- `defaultdict(factory)`: missing keys are created with `factory()`: `defaultdict(list)` for adjacency lists and grouping, `defaultdict(int)` for counting.
- `heapq` works on a plain list as a binary **min-heap**: `heappush`, `heappop` O(log n), `heap[0]` is the smallest, `heapify` O(n), `nlargest`/`nsmallest` for top-k.
- There is no max-heap: push **negated** keys (`-x`), or tuples `(-priority, item)`. Tuples compare element by element, so add a counter as a tie-breaker when items themselves cannot be compared: `(priority, count, item)`.
- Also useful: `OrderedDict` (`move_to_end` for LRU), `namedtuple`, and `bisect` for binary search on sorted lists.

### deep
#### Worked example

```python
from collections import deque, Counter, defaultdict
import heapq

q = deque([1, 2, 3])
q.appendleft(0)                  # O(1) at both ends
q.append(4)
print(q.popleft(), q.pop(), list(q))

words = "the cat and the hat and the bat".split()
freq = Counter(words)
print(freq.most_common(2), freq["dog"])      # a missing key counts as 0

graph = defaultdict(list)                   # missing keys start as []
for u, v in [(1, 2), (1, 3), (2, 3)]:
    graph[u].append(v)
print(dict(graph))

nums = [5, 1, 8, 3, 9, 2]
heapq.heapify(nums)                          # O(n), smallest at nums[0]
heapq.heappush(nums, 0)
print(heapq.heappop(nums), heapq.heappop(nums), heapq.nsmallest(2, nums))

max_heap = []
for x in [5, 1, 8]:
    heapq.heappush(max_heap, -x)             # negate for a max-heap
print(-heapq.heappop(max_heap))

tasks = []
heapq.heappush(tasks, (2, "review"))
heapq.heappush(tasks, (1, "deploy"))
heapq.heappush(tasks, (2, "email"))
print([heapq.heappop(tasks)[1] for _ in range(3)])
```

Output:

```text
0 4 [1, 2, 3]
[('the', 3), ('and', 2)] 0
{1: [2, 3], 2: [3]}
0 1 [2, 3]
8
['deploy', 'email', 'review']
```

- Reading `freq["dog"]` returned 0 without adding the key; a `defaultdict` would have inserted it.
- The two tasks with priority 2 came out alphabetically because tuples compare their second items on a tie. If the second items were objects without `<`, Python would raise `TypeError`, which is why a counter goes in the middle.

#### Costs

| structure | operation | cost |
|---|---|---|
| `deque` | append or pop at either end | O(1) |
| `deque` | `d[i]` in the middle | O(n) |
| `heapq` | `heappush`, `heappop`, `heapreplace` | O(log n) |
| `heapq` | `heapify` | O(n) |
| `heapq` | `nlargest(k, data)` | O(n log k) |
| `Counter` | build from n items | O(n) |
| `Counter` | `most_common(k)` | O(n log k) |

#### Pitfalls

- A heap list is not sorted: only `heap[0]` is guaranteed to be the minimum; printing the list shows heap order.
- `heapq` has no decrease-key; push the new entry and skip stale ones when popped, as in Dijkstra.
- Negating works for numbers only; for strings or custom objects wrap them in a class with a reversed `__lt__`.
- `Counter` subtraction drops zero and negative counts; use `subtract()` to keep them.

Connects to: built-in structures, binary heap, BFS, top-k elements, container adaptors.

### questions
Q: Why use deque instead of a list for a queue?
A: Removing from the front of a list with pop(0) shifts every remaining element, which is O(n), so a BFS over n nodes becomes quadratic. A deque is built for both ends and makes append, appendleft, pop and popleft O(1).

Q: How do you get a max-heap with heapq?
A: heapq only provides a min-heap, so push negated keys, for example heappush(h, -x), and negate again when popping. For records, push tuples such as (-priority, count, item), where the counter breaks ties and keeps incomparable items from being compared.

Q: What is the difference between Counter and defaultdict(int)?
A: Both count, but Counter is designed for it: it builds counts from an iterable in one call, returns 0 for missing keys without inserting them, and offers most_common and count arithmetic. defaultdict(int) inserts a 0 entry whenever a missing key is read.

Q: What does heapify do, and what does it cost?
A: It rearranges a list in place so it satisfies the heap property, with the smallest element at index 0, in O(n) time. That is faster than pushing n elements one at a time, which costs O(n log n).

## lang.python-core.comprehensions-and-generators
name: "Comprehensions and generators"
importance: important
scope: "lazy evaluation, `yield`, iterators"

### simple
A comprehension builds a whole list in one readable line, like a recipe that says "for every number, give me its square". A generator is the lazy version: instead of making everything at once, it hands you one item each time you ask, like a ticket machine printing the next ticket on demand. Laziness saves memory when there are many items, or when you might stop early.

### interview
- Comprehensions: `[f(x) for x in xs if cond(x)]` (list), `{k: v for ...}` (dict), `{x for ...}` (set). They are clearer and usually faster than an equivalent loop with `append`.
- A **generator expression** `(f(x) for x in xs)` or a function containing **`yield`** produces values **lazily**: nothing runs until you iterate, and each `next()` resumes the function where it paused.
- Generators use O(1) memory regardless of length (`sum(x * x for x in range(10**6))` never builds a list), and support infinite sequences.
- A generator (like any **iterator**) can be consumed **once**; a second pass yields nothing. Lists are **iterables** that create a fresh iterator on every loop.
- The iterator protocol: `iter(obj)` calls `__iter__`, `next(it)` calls `__next__`, which raises `StopIteration` at the end. `yield from` delegates to another iterable.
- `itertools` (`islice`, `chain`, `groupby`, `product`, `permutations`, `accumulate`) builds on the same lazy model.

### questions
Q: What is the difference between a list comprehension and a generator expression?
A: A list comprehension builds the whole list in memory immediately. A generator expression, written with parentheses, produces items one at a time as they are requested, using constant memory, but it can be iterated only once and does not support indexing or len.

Q: What does yield do?
A: It turns a function into a generator function: calling it returns a generator object without running the body. Each next call runs the body until the next yield, returns that value and pauses, keeping local variables, until it is resumed; when the body ends, StopIteration is raised.

Q: Why does iterating over the same generator twice give nothing the second time?
A: A generator is an iterator that keeps its position, and once it has produced all values it is exhausted. To iterate again, create a new generator, or store the values in a list if they are needed more than once.

## lang.python-core.functions-and-closures
name: "Functions and closures"
importance: important
scope: "`*args`, `**kwargs`, decorators, the mutable default argument pitfall"

### simple
Python functions are ordinary objects: you can store them, pass them around, and create them inside other functions. An inner function can remember variables from the function that made it, like a note that keeps a copy of the address it was written at; that memory is a closure. Decorators use this to wrap a function with extra behavior, such as logging or caching, without changing its code.

### interview
- `*args` collects extra positional arguments into a tuple; `**kwargs` collects extra keyword arguments into a dict. At a call site, `f(*lst, **d)` unpacks them.
- **Mutable default argument**: default values are evaluated **once**, when the `def` runs, so `def f(items=[])` shares one list across calls. Use `items=None` and create the list inside.
- A **closure** is an inner function that captures variables from an enclosing scope. Captured names are looked up when the inner function **runs** (late binding), so lambdas made in a loop all see the loop variable's final value; bind it with a default (`lambda i=i: i`). Use `nonlocal` to assign to a captured variable.
- A **decorator** is a function that takes a function and returns a replacement: `@logged` above `def area` means `area = logged(area)`. Wrap with `functools.wraps` to keep the name and docstring.
- Useful built-in decorators: `functools.cache`/`lru_cache` (memoization), `staticmethod`, `classmethod`, `property`, `dataclasses.dataclass`.

### questions
Q: What is the mutable default argument pitfall?
A: Default values are evaluated once, when the function is defined, not on each call. A default like items=[] is therefore one list shared by every call that omits the argument, so items appended in one call appear in the next. Use None as the default and create a new list inside the function.

Q: What is a closure, and what is late binding?
A: A closure is a function that remembers variables from the scope where it was created. Python looks up those variables when the closure runs, not when it is created, so lambdas created in a loop all see the loop variable's last value unless you bind the current value, for example with a default argument.

Q: What does a decorator do?
A: It is a callable that receives a function and returns another callable, usually a wrapper that adds behavior before or after calling the original. The syntax @decorator above a definition is shorthand for rebinding the name to decorator(function); functools.wraps copies the original's name and docstring onto the wrapper.

## lang.python-core.classes-in-python
name: "Classes in Python"
importance: important
scope: "dunder methods, inheritance, method resolution order"

### simple
A Python class is a blueprint for objects, and special "dunder" methods (names with double underscores, like `__init__` and `__eq__`) let your objects work with Python's built-in syntax: printing, comparing, adding, looping. Inheritance lets one class reuse and adjust another. When a class inherits from several parents, Python follows a fixed, predictable order to decide whose method runs.

### interview
- `__init__` initializes a new instance (`__new__` creates it); `self` is passed explicitly. `__repr__` (for developers) and `__str__` (for users) control printing.
- **Dunder methods** plug into syntax: `__eq__` and `__hash__` (equality and use as keys: defining `__eq__` alone makes instances unhashable), `__lt__` (sorting and heaps), `__len__`, `__iter__`, `__getitem__`, `__contains__`, `__add__`, `__call__`, `__enter__`/`__exit__` (the `with` statement).
- **Inheritance**: `class B(A)`; `super().method()` calls the next class in the method resolution order, not necessarily the direct parent.
- **MRO**: for multiple inheritance Python computes a C3 linearization (`D.__mro__`): children before parents, and the left-to-right order of bases is kept. In a diamond `D(B, C)` with `B(A)` and `C(A)`, the order is D, B, C, A, object, so `A` runs once.
- `@dataclass` generates `__init__`, `__repr__` and `__eq__` (plus ordering with `order=True` and hashing with `frozen=True`); `@property` gives computed attributes; `@classmethod` and `@staticmethod` for alternative constructors and helpers.
- Attributes are public by convention; a leading underscore means "internal", and double underscore triggers name mangling.

### questions
Q: What are dunder methods for?
A: They are special methods with double-underscore names that Python calls implicitly to support built-in syntax and functions, such as __init__ for construction, __eq__ for ==, __lt__ for sorting, __len__ for len, __iter__ for loops and __add__ for the + operator. Implementing them makes custom objects behave like built-in types.

Q: What is the method resolution order?
A: The order in which Python searches classes for an attribute or method, computed by the C3 linearization. It lists a class before its bases and keeps the order in which bases were declared, so in a diamond each class appears once; super follows this order, which lets cooperative methods call every class exactly once.

Q: Why can defining __eq__ make objects unusable as dictionary keys?
A: If a class defines __eq__ without __hash__, Python sets __hash__ to None, because the default identity-based hash would break the rule that equal objects must have equal hashes. Define __hash__ consistently from the same fields, or use a frozen dataclass.

## lang.python-core.the-gil
name: "The GIL"
importance: important
scope: "what it is, threads vs processes vs asyncio"

### simple
In the standard Python interpreter, a single lock called the global interpreter lock lets only one thread run Python code at a time, like a kitchen with one stove shared by several cooks. Threads still help when cooks spend most of their time waiting, such as for the network or a disk, because they hand the stove over while they wait. For heavy number crunching on many cores, you use several separate processes, each with its own kitchen.

### interview
- The **GIL** is a mutex in **CPython** (the standard interpreter) that lets only one thread execute Python bytecode at a time. It simplifies memory management (reference counting) and C extensions.
- **I/O-bound** work (network calls, disk, waiting on a database) scales with threads, because blocking I/O releases the GIL. **CPU-bound** pure-Python work does **not** get faster with threads.
- For CPU-bound parallelism use **processes** (`multiprocessing`, `concurrent.futures.ProcessPoolExecutor`): each has its own interpreter and GIL, at the cost of start-up time and pickling data between processes. NumPy and other C extensions often release the GIL inside heavy loops.
- **asyncio** runs many I/O tasks on **one** thread with an event loop and `async`/`await`: cheap for thousands of connections, but one blocking call stalls everything.
- The GIL does not make code thread-safe: operations such as `count += 1` are several bytecodes and can interleave, so shared state still needs a `threading.Lock`.
- CPython 3.13 added an optional **free-threaded** build without the GIL (PEP 703), and 3.14 made that build officially supported, though the default build still has the GIL.

### questions
Q: What is the GIL, and why does CPython have it?
A: The global interpreter lock is a mutex that allows only one thread at a time to execute Python bytecode in a CPython process. It makes reference counting and the internals of the interpreter and many C extensions simple and fast in the single-threaded case, at the cost of parallelism for CPU-bound Python code.

Q: When do threads help in Python, and when should you use processes?
A: Threads help with I/O-bound work, because a thread waiting on the network or disk releases the GIL so others can run. For CPU-bound pure-Python work, threads cannot run in parallel, so use multiple processes, each with its own interpreter, or libraries that release the GIL in native code.

Q: How is asyncio different from threading?
A: asyncio runs many tasks cooperatively on a single thread: each task gives up control at an await point, typically while waiting for I/O, and the event loop resumes another. It avoids thread overhead and most locking, but any blocking or CPU-heavy call stops all tasks until it finishes.

## lang.python-core.interview-performance-tips
name: "Interview performance tips"
importance: advanced
scope: "recursion limit, fast input, `bisect`, `lru_cache`"

### simple
A few small habits make Python solutions fast enough for online assessments. Read all the input at once instead of line by line, lean on built-in tools written in C, and cache the results of repeated function calls. Deep recursion needs extra care, because Python stops recursion early to protect itself.

### interview
- **Recursion limit**: CPython stops at a depth of 1000 by default (`RecursionError`). `sys.setrecursionlimit(10**6)` raises the limit but not the real stack size, so very deep recursion can crash; run it in a `threading.Thread` after `threading.stack_size(...)`, or rewrite it iteratively.
- **Fast input**: `input = sys.stdin.readline` (strip the newline), or read everything with `sys.stdin.buffer.read().split()` and walk the tokens. Print once with `"\n".join(map(str, results))` or `sys.stdout.write`.
- **bisect**: `bisect_left(a, x)` (first index with `a[i] >= x`) and `bisect_right` on a sorted list in O(log n); `insort` inserts in order (O(n) because of shifting).
- **Memoization**: `@functools.cache` or `@lru_cache(maxsize=None)` on a pure function with hashable arguments turns top-down DP into a few lines; arguments like lists must become tuples.
- Built-ins run in C: `sum`, `min`, `max`, `sorted`, `map`, `str.join`, set operations and comprehensions beat hand-written loops. Local variables are faster than globals, so put the main loop inside a function.

### questions
Q: How do you handle deep recursion in Python?
A: The default recursion limit is about 1000 frames. sys.setrecursionlimit raises it, but the underlying C stack can still overflow, so for very deep recursion also run the code in a thread with a larger stack set by threading.stack_size, or better, convert the recursion into an explicit loop.

Q: What is the fastest common way to read large input in Python?
A: Read everything at once with sys.stdin.buffer.read().split() and convert tokens as needed, or at least replace input with sys.stdin.readline. Both avoid the per-call overhead of input, which matters when there are hundreds of thousands of lines.

Q: What does functools.lru_cache do?
A: It memoizes a function: results are stored in a dictionary keyed by the arguments, so repeated calls with the same arguments return instantly. With maxsize=None, or functools.cache, nothing is evicted, which is ideal for top-down dynamic programming; the arguments must be hashable.
