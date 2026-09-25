---
topic: lang.java-core
name: "Java essentials"
subject: lang
order: 4
prereqs: []
---

## lang.java-core.jvm-jre-and-jdk
name: "JVM, JRE and JDK"
importance: must
scope: "bytecode, class loading, JIT compilation"

### simple
Java code is not turned straight into machine code. The compiler produces bytecode, a set of instructions for an imaginary machine, and the Java Virtual Machine runs that bytecode on whatever real computer you have, like one recipe followed by cooks in different kitchens. The JDK is the full kit for writing Java (the compiler and tools), and the runtime is just what is needed to run it.

### interview
- **javac** compiles `.java` source into `.class` files of platform-independent **bytecode**; the **JVM** loads and executes it, which is how the same `.class` runs on any operating system ("write once, run anywhere").
- **JDK** = development kit (compiler `javac`, `jar`, `javap`, `jshell`, debugger) plus a runtime. **JRE** = JVM plus the standard class library, only for running. Since Java 11 Oracle ships only the JDK (some vendors still package a JRE), and `jlink` builds a trimmed runtime for an application.
- **Class loading** is lazy: a class is loaded, verified, linked and then **initialized** (static fields and `static {}` blocks run) on first active use. Loaders form a hierarchy (bootstrap, platform, application) and delegate to their parent first.
- The JVM starts by **interpreting** bytecode and profiles it; hot methods are compiled to native code by the **JIT** compiler. HotSpot uses tiered compilation: C1 (fast to compile) then C2 (heavily optimized, using the profile, with inlining and escape analysis).
- Consequences: Java programs **warm up** (early iterations are slower), and benchmarks need warm-up runs (tools such as JMH).

### deep
#### From source to running code

| step | tool | result |
|---|---|---|
| compile | `javac Main.java` | `Main.class` containing bytecode |
| load | class loader | class data in the JVM, verified for safety |
| initialize | JVM | static fields set, static blocks run |
| execute | interpreter, then JIT | bytecode first interpreted, hot methods compiled to native code |

#### Worked example: lazy initialization

```java
public class Main {
    static class Config {
        static { System.out.println("Config initialized"); }
        static final String NAME = "atlas";    // a compile-time constant: copied into callers
        static int port = 8080;                // a real field: reading it needs the class
    }

    static int add(int a, int b) { return a + b; }

    public static void main(String[] args) {
        System.out.println("main starts");
        System.out.println(Config.NAME);       // does not initialize Config
        System.out.println(Config.port);       // first real use: runs the static block
        System.out.println(add(2, 3));
    }
}
```

Output:

```text
main starts
atlas
Config initialized
8080
5
```

`Config` is not initialized when the program starts. Reading `NAME` does not trigger it either, because `javac` copies the value of a `static final` compile-time constant into the caller. Reading `port` is the first active use, so the static block runs just before it.

#### What bytecode looks like

`javap -c Main` disassembles the class. The method `add` becomes four instructions for a stack machine:

```text
static int add(int, int);
  Code:
     0: iload_0
     1: iload_1
     2: iadd
     3: ireturn
```

Load both arguments onto the operand stack, add them, return the top of the stack. The JIT turns this into a single machine add once `add` is hot, and usually inlines it into its callers.

#### Why the JIT matters

The interpreter is simple but slow. The JIT compiles only methods that run often, and it can use what it observed at run time: it can inline a virtual call that always reaches the same class, and undo that ("deoptimize") if another class shows up later. So steady-state Java is fast, but the first seconds of a program, and each newly hot path, run slower. Ahead-of-time options (such as GraalVM native images) trade some peak speed for fast start-up.

#### Common confusions

- The JVM is a specification; HotSpot (in OpenJDK) is the most common implementation.
- Bytecode is portable; the JVM itself is platform-specific.
- `java Main.java` (Java 11 and later) compiles in memory and runs a single-file program, which is handy for quick tests.

Connects to: Java memory and garbage collection, keywords that matter, compilation model.

### questions
Q: What is the difference between the JDK, the JRE and the JVM?
A: The JVM executes bytecode. The JRE is the JVM plus the standard libraries needed to run programs. The JDK is the JRE plus development tools such as the javac compiler, jar and debuggers. Since Java 11 Oracle ships only the JDK, and jlink can build a trimmed runtime for one application.

Q: What is bytecode, and why does Java use it?
A: Bytecode is the instruction set of the Java Virtual Machine, stored in class files. Compiling to bytecode instead of machine code makes the same class files portable to any platform with a JVM, and gives the JVM a verifiable, compact form it can interpret or compile further.

Q: When is a Java class initialized?
A: Lazily, on its first active use: creating an instance, calling a static method, or reading or writing a static field that is not a compile-time constant. At that point static field initializers and static blocks run, once, in textual order.

Q: What does the JIT compiler do?
A: It compiles frequently executed bytecode into native machine code at run time, using profiling information gathered while interpreting. That allows optimizations such as inlining, including of virtual calls that always hit one class, so hot code becomes fast after a warm-up period.

## lang.java-core.java-memory-and-garbage-collection
name: "Java memory and garbage collection"
importance: must
prereqs: [lang.java-core.jvm-jre-and-jdk]
scope: "stack vs heap, references, generational GC, stop-the-world pauses"

### simple
In Java, every object lives in a shared area called the heap, and your variables hold references to those objects, like addresses written on sticky notes. You never free objects yourself: a garbage collector periodically finds objects that no sticky note points to any more and reclaims their space. It works like a cleaner who throws away only things nobody can reach, and sometimes has to pause everyone briefly to do it safely.

### interview
- Each thread has a **stack** of frames holding primitives and **references**; all **objects** (including arrays) live on the shared **heap**. Java passes everything **by value**, and for objects the value passed is the reference.
- The **garbage collector** frees objects that are **unreachable** from GC roots (local variables in live frames, static fields, active threads). Cycles are collected fine because reachability, not reference counting, decides.
- **Generational hypothesis**: most objects die young. The heap is split into a **young generation** (eden plus survivor spaces, collected often and cheaply by copying live objects) and an **old generation** for long-lived objects (collected less often).
- Some collector work needs **stop-the-world pauses** (all application threads halted). **G1** is the default collector (since Java 9), aiming at a pause-time target; **ZGC** and **Shenandoah** do most work concurrently for very short pauses.
- Java can still **leak**: objects kept reachable by accident (a static map that only grows, listeners never removed, caches without eviction). Symptoms: rising heap after each GC, finally `OutOfMemoryError`. Deep recursion throws `StackOverflowError`.
- Tuning basics: `-Xms`/`-Xmx` set the initial and maximum heap; fewer, shorter-lived allocations mean less GC work.

### deep
#### Stack and heap

```java
import java.util.*;

public class Refs {
    static void mutate(List<Integer> list) { list.add(4); }          // changes the shared object
    static void reassign(List<Integer> list) {                        // rebinds the local copy only
        list = new ArrayList<>();
        list.add(99);
    }
    static void bump(int x) { x++; }                                  // a copy of the value

    public static void main(String[] args) {
        int n = 1;                               // primitive: the value lives in the frame
        List<Integer> nums = new ArrayList<>(List.of(1, 2, 3));   // object on the heap
        List<Integer> alias = nums;              // copies the reference, not the list
        bump(n);
        mutate(nums);
        reassign(nums);
        alias.add(5);
        System.out.println(n + " " + nums);
        Integer a = 127, b = 127, c = 128, d = 128;
        System.out.println((a == b) + " " + (c == d) + " " + c.equals(d));
    }
}
```

Output:

```text
1 [1, 2, 3, 4, 5]
true false true
```

- `bump` received a copy of `n`, so `n` stays 1.
- `mutate` and `alias` changed the one list on the heap; `reassign` only pointed its local copy of the reference at a new list, which became garbage when the method returned.
- `Integer` values from −128 to 127 are cached, so `a == b` compares two references to the same cached object; 128 is boxed into two different objects. Compare boxed numbers with `equals`.

#### How a generational collector works

1. New objects are allocated in **eden** by bumping a pointer, which is very cheap.
2. When eden fills, a **minor GC** copies the live objects to a survivor space and treats eden as empty. Most objects are already dead, so little is copied.
3. Objects that survive several minor GCs are **promoted** to the old generation.
4. The old generation is collected by a **major** or **mixed** collection, which is more expensive; G1 does much of the marking concurrently and compacts in regions.

| collector | goal | pauses |
|---|---|---|
| Serial | small heaps, one core | stop-the-world |
| Parallel | throughput | stop-the-world, many threads |
| G1 (default) | balance, pause-time target | short, mostly incremental |
| ZGC, Shenandoah | very low latency | typically well under a few milliseconds |

#### Pitfalls

- `System.gc()` is only a hint; never rely on it or on finalizers (deprecated) for cleanup. Use try-with-resources for files and sockets.
- Allocation-heavy hot loops (boxing in `List<Integer>`, temporary strings) create GC pressure; primitive arrays avoid it.
- A "memory leak" in Java is almost always a reachable reference you forgot about.

Connects to: JVM, JRE and JDK, strings in Java, collections framework, stack vs heap memory.

### questions
Q: Where do objects and local variables live in Java?
A: Objects, including arrays, always live on the heap. Local variables live in the current thread's stack frame: primitives directly, and object variables as references pointing into the heap. The frame disappears when the method returns; objects stay until they become unreachable and are collected.

Q: Is Java pass by value or pass by reference?
A: Always pass by value. For an object, the value passed is a copy of the reference, so the method can modify the object through it, and the caller sees that, but reassigning the parameter to a new object does not affect the caller's variable.

Q: What is generational garbage collection?
A: A design based on the observation that most objects die young. New objects go into a young generation that is collected frequently by copying the few survivors, and objects that survive several collections are promoted to an old generation that is collected less often. This keeps most collections short and cheap.

Q: What is a stop-the-world pause?
A: A period during garbage collection when all application threads are halted so the collector can safely move or scan objects. Pause lengths depend on the collector and heap size; low-latency collectors like ZGC do most of their work concurrently to keep pauses very short.

Q: How can a Java program leak memory if there is a garbage collector?
A: The collector frees only unreachable objects, so any object that stays reachable by mistake is never freed: a static collection that keeps growing, a cache without eviction, or listeners that are registered and never removed. Eventually the heap fills and the program throws OutOfMemoryError.

## lang.java-core.strings-in-java
name: "Strings in Java"
importance: must
scope: "immutability, string pool, StringBuilder, `equals` vs `==`"

### simple
A Java String is like text carved in stone: once made, it never changes, and every "change" actually carves a new stone. Because they never change, identical string literals can safely share one stone from a common pool. When you need to build text piece by piece, use a StringBuilder, which is more like a whiteboard you can keep writing on.

### interview
- `String` is **immutable**: methods such as `toUpperCase`, `replace`, `substring` and `concat` return **new** strings. That makes strings thread-safe, safe as `HashMap` keys, and lets them cache their hash code.
- String **literals** are **interned** in the string pool: two identical literals are the same object. `new String("hi")` creates a separate object; `intern()` returns the pooled one.
- `==` compares **references**; `equals` compares **characters**. Always use `equals` (or `Objects.equals` when either side may be null).
- Concatenating with `+` in a loop creates a new string each time, O(n^2) in total for n pieces; use **`StringBuilder`** (amortized O(1) `append`, not synchronized) or `String.join`. `StringBuffer` is the old synchronized version.
- Since Java 9, strings containing only Latin-1 characters are stored one byte per character (compact strings); `length()` counts UTF-16 code units, so some emoji count as 2.
- `switch` on strings, `compareTo` (lexicographic), `chars()`, `toCharArray()` (a copy) and `charAt` (O(1)) are the common tools in interview code.

### deep
#### Worked example

```java
public class Strs {
    public static void main(String[] args) {
        String a = "hi";
        String b = "hi";                         // the same pooled literal
        String c = new String("hi");             // a new object with the same characters
        System.out.println((a == b) + " " + (a == c) + " " + a.equals(c) + " " + (a == c.intern()));

        String s = "cat";
        s.toUpperCase();                         // returns a new string; s is unchanged
        String t = s.replace('c', 'b');
        System.out.println(s + " " + t);

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5; i++) sb.append(i).append(',');   // amortized O(1) appends
        sb.setLength(sb.length() - 1);           // drop the last comma
        System.out.println(sb.reverse());
        String x = "a" + "b";                    // folded at compile time into "ab"
        String y = a.substring(0, 1) + "b";      // built at run time
        System.out.println((x == "ab") + " " + (y == "hb") + " " + y.equals("hb"));
    }
}
```

Output:

```text
true false true true
cat bat
4,3,2,1,0
true false true
```

- `a == b` is true only because both come from the pool; `a == c` is false although the text is equal.
- `s.toUpperCase()` produced "CAT" and threw it away: ignoring the return value of a string method is a classic bug.
- `"a" + "b"` is a constant expression, so the compiler stores the pooled "ab"; a string built at run time is a new object, which is why `==` on strings seems to work "sometimes".

#### Why immutability helps

| benefit | reason |
|---|---|
| safe sharing | no one can change a string you hold, so no defensive copies |
| thread safety | immutable objects need no locks |
| hash keys | the hash code never changes, and it is cached after the first `hashCode()` call |
| security | a validated file name or URL cannot be changed afterwards |

The cost is that every modification allocates. Build strings with `StringBuilder`, then call `toString()` once.

#### Pitfalls

- `str == ""` instead of `str.isEmpty()`; `str.equals(null)` is fine, but `null.equals(str)` throws, so write `"literal".equals(str)`.
- `substring` copies (since Java 7), so it is O(length), not O(1).
- Sorting strings compares UTF-16 code units, which is not the same as a human alphabetical order for accented letters; use a `Collator` when that matters.

Connects to: Java memory and garbage collection, HashMap internals, immutability, strings (DSA).

### questions
Q: Why are strings immutable in Java?
A: So they can be shared safely: the string pool can reuse one object for identical literals, strings can be used as HashMap keys with a cached hash code, and they are thread-safe without locks. It also prevents a validated value, such as a file path, from being changed after the check.

Q: What is the difference between == and equals for strings?
A: == checks whether two references point to the same object, while equals compares the characters. Two equal literals are usually the same pooled object, so == may seem to work, but strings built at run time are separate objects, so always use equals for content.

Q: What is the string pool?
A: A table the JVM keeps of unique string instances. Literals and compile-time constant strings are placed in it automatically, so identical literals share one object, and intern returns the pooled instance for any string. Since Java 7 the pool lives in the ordinary heap.

Q: Why use StringBuilder instead of + in a loop?
A: Each + creates a new String and copies all previous characters, so building a string from n pieces costs O(n squared). StringBuilder keeps a growable buffer with amortized O(1) appends, and toString copies once at the end.

## lang.java-core.collections-framework
name: "Collections framework"
importance: must
scope: "List, Set, Map, Queue; ArrayList vs LinkedList; HashSet vs TreeSet"

### simple
The collections framework is Java's standard set of containers, organized by what they promise rather than how they work. A List keeps order and allows repeats, a Set never holds duplicates, a Map looks values up by key, and a Queue hands items out in a chosen order. You write code against these promises and pick the implementation, such as a hash-based or tree-based set, depending on the speed and ordering you need.

### interview
- Interfaces: `List` (ordered, duplicates, index access), `Set` (no duplicates), `Map` (key to value; not a `Collection`), `Queue` and `Deque` (FIFO, LIFO, both ends). Declare variables by interface: `List<Integer> xs = new ArrayList<>();`.
- `ArrayList`: resizable array; O(1) `get`, amortized O(1) `add` at the end, O(n) insert or remove elsewhere. `LinkedList`: doubly linked; O(1) at the ends, O(n) `get(i)`. Prefer `ArrayList`, and `ArrayDeque` for queues and stacks.
- `HashSet`/`HashMap`: O(1) average, no order. `LinkedHashSet`/`LinkedHashMap`: insertion (or access) order. `TreeSet`/`TreeMap`: red-black trees, sorted, O(log n), with `floor`, `ceiling`, `headSet`, `subMap`.
- Collections hold **objects** only: `int` is boxed into `Integer`, which costs memory and time; use primitive arrays for heavy numeric work.
- Iterators are **fail-fast**: modifying a collection while looping over it with for-each throws `ConcurrentModificationException`. Use `iterator.remove()` or `removeIf`.
- `List.of`, `Set.of` and `Map.of` create **immutable** collections (and reject nulls); `Collections.unmodifiableList` is only a read-only view.

### deep
#### Worked example

```java
import java.util.*;

public class Colls {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("pear", "fig", "apple", "fig"));
        Set<String> hash = new HashSet<>(list);          // no duplicates, no order promised
        Set<String> linked = new LinkedHashSet<>(list);  // insertion order
        Set<String> tree = new TreeSet<>(list);          // sorted
        System.out.println(list + " " + linked + " " + tree + " " + hash.size());

        Map<String, Integer> count = new TreeMap<>();
        for (String w : list) count.merge(w, 1, Integer::sum);
        System.out.println(count);

        Deque<Integer> dq = new ArrayDeque<>();
        dq.offerFirst(1);
        dq.offerLast(2);
        dq.push(0);                                      // push adds at the front
        System.out.println(dq + " " + dq.pollLast());

        try {
            for (String w : list) if (w.equals("fig")) list.remove(w);   // modifies while iterating
        } catch (ConcurrentModificationException e) {
            System.out.println("ConcurrentModificationException");
        }
        list.removeIf(w -> w.equals("fig"));             // the safe way
        System.out.println(list);
        List<Integer> fixed = List.of(1, 2, 3);
        try {
            fixed.add(4);
        } catch (UnsupportedOperationException e) {
            System.out.println("immutable");
        }
    }
}
```

Output:

```text
[pear, fig, apple, fig] [pear, fig, apple] [apple, fig, pear] 3
{apple=1, fig=2, pear=1}
[0, 1, 2] 2
ConcurrentModificationException
[pear, apple]
immutable
```

The program prints only the size of `hash` on purpose: a `HashSet`'s order depends on hash codes and capacity and may change between runs of different data or Java versions, so never rely on it.

#### Choosing an implementation

| need | use | cost |
|---|---|---|
| indexed list, append at end | `ArrayList` | `get` O(1), `add` amortized O(1) |
| queue, stack or deque | `ArrayDeque` | O(1) at both ends |
| fast membership, no order | `HashSet`, `HashMap` | O(1) average |
| keep insertion order | `LinkedHashSet`, `LinkedHashMap` | O(1) average |
| sorted, range queries, floor/ceiling | `TreeSet`, `TreeMap` | O(log n) |
| smallest or largest first | `PriorityQueue` | O(log n) offer and poll |

#### Pitfalls

- `list.remove(1)` on a `List<Integer>` removes **index** 1; `list.remove(Integer.valueOf(1))` removes the value 1.
- `Arrays.asList(arr)` is fixed-size: `add` throws.
- Sorting objects needs `Comparable` or a `Comparator`; `Comparator.comparing(Person::age).thenComparing(Person::name)` builds multi-key orders.
- `TreeSet` uses `compareTo`, not `equals`, to detect duplicates, so a comparator that ignores a field merges objects that differ in it.

Connects to: HashMap internals, specialised collections, generics, sequence containers.

### questions
Q: When would you use LinkedList instead of ArrayList?
A: Rarely. LinkedList gives O(1) insertion and removal at the ends or through an iterator, but O(n) indexed access and poor cache behavior. For queues and stacks ArrayDeque is faster, so ArrayList plus ArrayDeque cover almost every case.

Q: What is the difference between HashSet, LinkedHashSet and TreeSet?
A: HashSet is a hash table with O(1) average operations and no ordering. LinkedHashSet adds a linked list through the entries to keep insertion order at a small cost. TreeSet is a red-black tree that keeps elements sorted with O(log n) operations and offers floor, ceiling and range views.

Q: What is a ConcurrentModificationException?
A: It is thrown by fail-fast iterators when a collection is structurally modified while being iterated, other than through the iterator itself, such as calling list.remove inside a for-each loop. Use iterator.remove, removeIf, or collect changes and apply them after the loop.

Q: Why can collections not hold int directly?
A: Generics work only with reference types, so primitives are boxed into wrapper objects like Integer. Boxing costs an allocation and extra memory per element, and == on boxed values compares references, so for large numeric data primitive arrays are better.

## lang.java-core.hashmap-internals
name: "HashMap internals"
importance: must
prereqs: [lang.java-core.collections-framework]
scope: "buckets, hashing, equals and hashCode contract, resizing, treeification"

### simple
A HashMap is a row of numbered drawers. To store a value, Java turns the key into a number (its hash code), picks a drawer from that number, and puts the entry there; to find it again, it computes the same drawer and looks only inside it. When the drawers get too crowded, it builds a row twice as long and redistributes everything.

### interview
- A `HashMap` is an array of **buckets** (the table, length a power of two, 16 by default, allocated on first `put`). The bucket index is `(h ^ (h >>> 16)) & (n - 1)` where `h = key.hashCode()`: the high bits are mixed into the low bits, then masked.
- Colliding entries in one bucket form a **linked list**; since Java 8, adding to a bucket that already holds **8** entries converts it into a **red-black tree** (only when the table has at least 64 buckets; otherwise the table resizes instead), and a tree bucket that shrinks to 6 entries during a resize becomes a list again. Worst-case lookups become O(log n) instead of O(n).
- **Resizing**: when size exceeds capacity × load factor (0.75 by default, so 12 for 16 buckets), the table **doubles** and each entry either stays at its index or moves up by the old capacity.
- **Contract**: if `a.equals(b)` then `a.hashCode() == b.hashCode()`. Overriding `equals` without `hashCode` breaks lookups; records and IDE-generated methods get both right.
- Never mutate a field used by `hashCode` while the object is a key: the entry becomes unreachable. Use immutable keys.
- `HashMap` allows one `null` key and `null` values, is **not thread-safe** (use `ConcurrentHashMap`), and has no iteration order (`LinkedHashMap` keeps one).

### deep
#### Worked example

```java
import java.util.*;

public class Hm {
    static final class Key {
        int x, y;
        Key(int x, int y) { this.x = x; this.y = y; }
        @Override public boolean equals(Object o) {
            return o instanceof Key k && k.x == x && k.y == y;
        }
        @Override public int hashCode() { return Objects.hash(x, y); }
    }

    static int bucket(Object key, int capacity) {      // how HashMap picks a bucket
        int h = key.hashCode();
        return (h ^ (h >>> 16)) & (capacity - 1);      // spread high bits, then mask
    }

    public static void main(String[] args) {
        Map<Key, String> map = new HashMap<>();
        Key k = new Key(1, 2);
        map.put(k, "A");
        System.out.println(map.get(new Key(1, 2)) + " bucket " + bucket(k, 16));
        k.x = 5;                                        // mutating a key already in the map
        System.out.println(map.get(k) + " " + map.get(new Key(1, 2)) + " bucket " + bucket(k, 16));
        System.out.println(map.size() + " " + map.containsValue("A"));

        Map<String, Integer> m = new HashMap<>();
        m.put(null, 0);                                 // one null key is allowed
        m.put("a", 1);
        m.put("a", 2);                                  // same key: replaces the value
        System.out.println(m.get(null) + " " + m.get("a") + " " + m.getOrDefault("z", -1));
    }
}
```

Output:

```text
A bucket 2
null null bucket 14
1 true
0 2 -1
```

After `k.x = 5`, the entry still sits in bucket 2 with its old hash. Looking up `k` computes bucket 14 and finds nothing; looking up a fresh `Key(1, 2)` reaches bucket 2, but `equals` fails because the stored key now says x = 5. The entry is still counted and still holds "A", but no key can reach it.

#### A lookup, step by step

1. Compute `h = key.hashCode()`, spread it with `h ^ (h >>> 16)`, and mask with `n - 1` to get the bucket.
2. In that bucket, compare each entry's stored hash first (cheap), then call `equals` only when the hashes match.
3. A list bucket is scanned in O(length); a tree bucket is searched in O(log length), ordering by hash and, when keys are `Comparable`, by `compareTo`.

#### Resizing

| entries | capacity | threshold (0.75 × capacity) |
|---|---|---|
| 0 to 12 | 16 | 12 |
| 13 to 24 | 32 | 24 |
| 25 to 48 | 64 | 48 |

Because capacity is a power of two, doubling adds one bit to the mask: each entry stays at index i or moves to i + old capacity, so a resize splits each bucket into two without recomputing hashes. Pass an expected size to the constructor to avoid repeated resizes.

#### Pitfalls

- A `hashCode` that returns a constant keeps the map correct but puts every entry in one bucket (treeified, so O(log n) if keys are `Comparable`, otherwise O(n)).
- Concurrent writes from several threads can lose entries or corrupt the table; `Collections.synchronizedMap` locks every call, while `ConcurrentHashMap` scales.
- `get` returning `null` does not tell "missing" from "mapped to null"; use `containsKey` or `getOrDefault`.

Connects to: hash table internals, collisions and load factor, collections framework, specialised collections, equality and hashing.

### questions
Q: How does HashMap find the bucket for a key?
A: It calls the key's hashCode, spreads the high bits into the low bits with h XOR (h unsigned-shifted right by 16), and masks the result with the table length minus one. Because the length is a power of two, the mask is a fast replacement for the modulo operation.

Q: What happens when many keys land in the same bucket?
A: They are chained in a linked list. Since Java 8, when an insert finds 8 entries already in the bucket and the table has at least 64 buckets, the list is converted into a red-black tree so lookups in that bucket take O(log n) instead of O(n); a smaller table resizes instead.

Q: What is the equals and hashCode contract, and what breaks if you violate it?
A: Objects that are equal must have equal hash codes. If you override equals but not hashCode, two equal keys usually get different identity hash codes, land in different buckets, and the map stores duplicates or fails to find a key that is logically present.

Q: When does a HashMap resize, and what does it cost?
A: When the number of entries exceeds capacity times the load factor, 0.75 by default. The table doubles and every entry is moved to its new bucket, which is O(n) for that insert, but inserts remain amortized O(1). Giving an expected size up front avoids the repeated resizes.

Q: Why should HashMap keys be immutable?
A: The bucket is chosen from the key's hash when it is inserted. If a field used by hashCode changes afterwards, lookups compute a different bucket, and the entry becomes unreachable even though it is still in the map. Strings, boxed numbers and records make safe keys.

## lang.java-core.specialised-collections
name: "Specialised collections"
importance: important
prereqs: [lang.java-core.collections-framework]
scope: "PriorityQueue, ArrayDeque, TreeMap floor and ceiling, LinkedHashMap as LRU"

### simple
Beyond basic lists and maps, Java offers a few containers built for particular jobs. A PriorityQueue always hands you the smallest item first, like a triage desk; an ArrayDeque is a fast line you can join or leave at either end. A TreeMap can answer "what is the closest key below this one?", and a LinkedHashMap can remember which entries you used most recently.

### interview
- `PriorityQueue<E>`: a binary **min-heap**; `offer`/`poll` O(log n), `peek` O(1), `remove(Object)` and `contains` O(n). For a max-heap: `new PriorityQueue<>(Comparator.reverseOrder())`. Iterating it does **not** give sorted order.
- `ArrayDeque<E>`: a circular array; O(1) `offerFirst`, `offerLast`, `pollFirst`, `pollLast`, `push`, `pop`. The recommended stack and queue (faster than `Stack` and `LinkedList`); it rejects `null`.
- `TreeMap<K, V>`: a red-black tree with navigation: `floorKey(k)` (largest ≤ k), `ceilingKey(k)` (smallest ≥ k), `lowerKey`, `higherKey`, `firstKey`, `lastKey`, `headMap`, `tailMap`, all O(log n). Methods return `null` when no such key exists.
- `LinkedHashMap` keeps a doubly linked list through its entries. Constructed with `accessOrder = true`, each `get` moves an entry to the end; override `removeEldestEntry` to cap the size, and you have an **LRU cache** in a few lines.
- `EnumMap`, `EnumSet` (compact arrays and bit sets for enum keys) and `BitSet` are handy for fixed small key spaces.

### questions
Q: How do you create a max-heap in Java?
A: Pass a reversing comparator to PriorityQueue, for example new PriorityQueue<Integer>(Comparator.reverseOrder()), or a lambda such as (a, b) -> Integer.compare(b, a). Avoid writing b - a, which can overflow for large values of opposite signs.

Q: How can LinkedHashMap implement an LRU cache?
A: Construct it with accessOrder set to true so every get moves the entry to the most recently used end, and override removeEldestEntry to return true when size exceeds the capacity. The map then evicts the least recently used entry automatically after each insertion.

Q: What do floorKey and ceilingKey return in a TreeMap?
A: floorKey(k) returns the greatest key less than or equal to k, and ceilingKey(k) the least key greater than or equal to k, each in O(log n), or null when no such key exists. They are useful for interval lookups and nearest-value questions.

Q: Why prefer ArrayDeque over Stack?
A: Stack extends Vector, whose methods are synchronized, so every push and pop pays for locking that single-threaded code does not need, and it exposes list methods that break the stack abstraction. ArrayDeque is a fast, unsynchronized circular array with proper stack and queue methods.

## lang.java-core.generics
name: "Generics"
importance: important
scope: "type erasure, bounded types, wildcards"

### simple
Generics let you write a container or method once and use it with many types while the compiler checks you never mix them up, like a labelled box that only accepts one kind of item. Java checks the labels while compiling and then removes them, so at run time a box of strings and a box of numbers look the same. That removal is called type erasure, and it explains most of the odd rules around generics.

### interview
- Generic types and methods (`List<String>`, `static <T> T first(List<T> xs)`) give **compile-time type safety** and remove casts.
- **Type erasure**: the compiler checks types and then erases them to their bounds (usually `Object`), inserting casts. So `List<String>` and `List<Integer>` are the same class at run time; you cannot write `new T()`, `new T[n]`, `instanceof List<String>`, or overload methods that differ only by type argument.
- Primitives cannot be type arguments: `List<int>` is illegal, so values are boxed (`List<Integer>`).
- **Bounded types**: `<T extends Comparable<T>>` lets the method call `compareTo`; multiple bounds use `&`.
- **Wildcards**: `List<? extends Number>` can be read as `Number` but not added to (a producer); `List<? super Integer>` accepts `Integer` additions (a consumer). Rule of thumb PECS: producer `extends`, consumer `super`.
- Generics are **invariant**: a `List<Integer>` is not a `List<Number>`, even though `Integer` is a `Number` (arrays are covariant, which is why they can throw `ArrayStoreException`).

### questions
Q: What is type erasure?
A: Java generics are checked at compile time and then removed: type parameters are replaced by their bounds, usually Object, and casts are inserted where needed. As a result, the JVM sees one class for all instantiations, so run-time checks like instanceof List<String> or creating new T() are impossible.

Q: Why is List<Integer> not a subtype of List<Number>?
A: Generics are invariant. If it were a subtype, you could add a Double through the List<Number> reference into a list that must hold only Integers, breaking type safety. Wildcards such as List<? extends Number> express the read-only relationship safely.

Q: What does PECS mean?
A: Producer extends, consumer super. Use ? extends T for a parameter you only read T values from, and ? super T for one you only put T values into, as in Collections.copy, which reads from a List<? extends T> and writes into a List<? super T>.

## lang.java-core.exceptions
name: "Exceptions"
importance: important
scope: "checked vs unchecked, try-with-resources, finally"

### simple
Exceptions are Java's way of saying "something went wrong, and this code cannot carry on normally", passed up until someone who knows what to do catches it. Some problems, such as a missing file, are expected and the compiler makes you plan for them; others, such as a null value or a bad index, are programming bugs. Cleanup code in a finally block, or a try-with-resources block, runs whether things went well or not.

### interview
- Hierarchy: `Throwable` splits into `Error` (serious JVM problems such as `OutOfMemoryError`; do not catch) and `Exception`. `RuntimeException` and its subclasses are **unchecked**; every other `Exception` is **checked**.
- **Checked** exceptions (`IOException`, `SQLException`) must be caught or declared with `throws`: they model recoverable, expected failures. **Unchecked** ones (`NullPointerException`, `IllegalArgumentException`, `IndexOutOfBoundsException`) usually signal bugs and need not be declared.
- `finally` runs after `try`/`catch` whether or not an exception occurred (unless the JVM exits). A `return` inside `finally` overrides the earlier return or exception, so avoid it.
- **try-with-resources**: `try (var in = new FileInputStream(f)) { ... }` closes every `AutoCloseable` automatically, in reverse order of opening. If both the body and `close` throw, the close exception is attached as a **suppressed** exception rather than hiding the original.
- Catch the most specific type first, never swallow exceptions silently, keep the cause when wrapping (`new ServiceException("...", e)`), and use multi-catch (`catch (IOException | SQLException e)`) for shared handling.

### questions
Q: What is the difference between checked and unchecked exceptions?
A: Checked exceptions extend Exception but not RuntimeException, and the compiler forces callers to catch them or declare them with throws; they represent expected, recoverable conditions such as I/O failures. Unchecked exceptions extend RuntimeException, need no declaration, and usually indicate programming errors like null dereferences.

Q: What does try-with-resources do?
A: It declares resources that implement AutoCloseable in the try header and closes them automatically when the block ends, normally or by an exception, in reverse order of creation. If closing also throws, that exception is added as suppressed to the original, so the root cause is not lost.

Q: Does finally always run?
A: It runs after the try block and any matching catch block, whether they complete normally, return or throw. It does not run if the JVM stops first, for example through System.exit or a crash, or if the thread is killed. A return inside finally discards any pending exception, which is why it is discouraged.

## lang.java-core.modern-java-features
name: "Modern Java features"
importance: important
scope: "lambdas, streams, Optional, functional interfaces"

### simple
Since Java 8, you can pass small pieces of behavior around as values, written as short lambda expressions, instead of writing whole classes. Streams let you describe a data pipeline, such as filter these, transform those, then add them up, and Java runs it for you. Optional is a box that may or may not hold a value, which makes "there might be no answer" explicit instead of returning null.

### interview
- A **functional interface** has exactly one abstract method (`Runnable`, `Comparator<T>`, `Function<T, R>`, `Predicate<T>`, `Supplier<T>`, `Consumer<T>`); a **lambda** (`x -> x * 2`) or a **method reference** (`String::length`) implements it.
- Lambdas can use local variables only if they are **effectively final** (never reassigned).
- **Streams**: a source, lazy **intermediate** operations (`filter`, `map`, `sorted`, `distinct`) and one **terminal** operation (`collect`, `sum`, `count`, `forEach`) that runs the pipeline. A stream can be consumed only once. `Collectors.groupingBy` and `toMap` build maps; `IntStream` avoids boxing.
- **Optional<T>** makes a possibly missing result explicit: `findFirst().orElse(default)`, `map`, `ifPresent`. Use it for return values, not for fields or parameters, and never call `get()` without checking.
- Newer additions worth recognizing: `var` for local type inference (10), records (16), switch expressions (14), text blocks (15), pattern matching for `instanceof` (16) and `switch` (21), sealed classes (17), and virtual threads (21).
- In interviews, streams are fine for clarity, but plain loops are often faster and easier to debug in hot code.

### questions
Q: What is a functional interface?
A: An interface with exactly one abstract method, such as Runnable, Comparator or Function. Lambdas and method references can be used wherever one is expected, and the optional @FunctionalInterface annotation makes the compiler check that there is only one abstract method.

Q: What does lazy evaluation mean for streams?
A: Intermediate operations like filter and map only describe the pipeline; nothing runs until a terminal operation such as collect or count is called. Elements then flow through the whole pipeline one at a time, and short-circuiting operations like findFirst can stop early without processing the rest.

Q: How should Optional be used?
A: As a return type for methods that may have no result, so callers must handle the empty case with orElse, orElseGet, map or ifPresent. It should not replace every null: avoid it for fields, parameters and collections, and never call get without first checking isPresent.

## lang.java-core.keywords-that-matter
name: "Keywords that matter"
importance: important
scope: "final, static, abstract, interfaces with default methods"

### simple
A few Java keywords change the meaning of a declaration a lot. final means "cannot change" (a variable that cannot be reassigned, a method that cannot be overridden, a class that cannot be extended). static means "belongs to the class, not to each object", and abstract marks something that is only a template to be filled in by a subclass.

### interview
- `final` variable: assigned once (for an object reference, the object itself can still change). `final` method: cannot be overridden. `final` class: cannot be extended (`String`, the wrapper classes).
- `static` field: one copy shared by all instances. `static` method: called on the class, has no `this`, cannot use instance members directly. `static` nested class: no link to an outer instance (prefer it over inner classes unless you need the outer object). `static` blocks run when the class is initialized.
- `abstract` class: cannot be instantiated and may have abstract methods, constructors, fields and concrete methods. A class can extend only one class.
- Interfaces: a class can implement many. Since Java 8 they can have **default** methods (with a body, so interfaces can evolve without breaking implementers) and static methods; since Java 9, private methods. If two interfaces provide the same default method, the class must override it (and may call `A.super.m()`).
- Choose an interface for a capability that unrelated classes share; an abstract class for a base with shared state and partial implementation.

### questions
Q: What does final mean on a variable, a method and a class?
A: A final variable can be assigned only once, although a referenced object can still be modified. A final method cannot be overridden in subclasses. A final class cannot be subclassed, as with String, which protects its immutability.

Q: Why were default methods added to interfaces?
A: To let interfaces evolve: Java 8 needed to add methods such as stream and forEach to existing collection interfaces without breaking every class that implemented them. A default method provides a body that implementers inherit unless they override it.

Q: When would you use an abstract class instead of an interface?
A: When related classes share state, constructors or a partial implementation that needs fields, since interfaces cannot have instance fields. Use an interface to describe a capability that unrelated classes can have, especially because a class can implement several interfaces but extend only one class.

## lang.java-core.java-threads-overview
name: "Java threads overview"
importance: advanced
scope: "Thread vs Runnable, ExecutorService, synchronized, volatile, ConcurrentHashMap"

### simple
Java lets a program do several things at once by running threads, each following its own path through the code while sharing the same objects. Rather than creating threads by hand, you usually hand tasks to an executor, a managed team of worker threads. When threads share data, Java's locking keywords and concurrent collections keep them from tripping over each other.

### interview
- Create work as a `Runnable` (or `Callable` for a result) rather than subclassing `Thread`: it separates the task from how it runs. `thread.start()` starts a new thread; calling `run()` directly just runs the code on the current thread.
- `ExecutorService` (`Executors.newFixedThreadPool(n)`) reuses a pool of threads; `submit` returns a `Future`, and `shutdown` ends the pool. `CompletableFuture` chains asynchronous steps. Java 21's **virtual threads** (`Executors.newVirtualThreadPerTaskExecutor()`) make a thread per blocking task cheap.
- `synchronized` methods or blocks take the object's intrinsic lock (a monitor): mutual exclusion plus visibility of changes made under the lock. `wait`/`notifyAll` must be called while holding it.
- `volatile` guarantees **visibility** and ordering of reads and writes to one variable, but not atomicity: `count++` on a volatile field is still a race. Use `AtomicInteger` or a lock.
- `ConcurrentHashMap` allows concurrent reads and writes (lock-free reads, CAS and per-bucket locking for writes since Java 8), offers atomic `compute`, `merge` and `putIfAbsent`, and rejects `null` keys and values.

### questions
Q: Why implement Runnable instead of extending Thread?
A: A Runnable describes only the task, so the class can still extend another class, and the same task can be run by a plain thread, an executor or a virtual thread. Extending Thread ties the task to one way of running it and uses up the single superclass.

Q: What is the difference between volatile and synchronized?
A: volatile makes every read see the latest write to that one variable and prevents certain reorderings, but it does not make compound actions like count++ atomic. synchronized provides mutual exclusion over a block of code as well as visibility, so a whole sequence of reads and writes happens atomically.

Q: Why use ConcurrentHashMap instead of a synchronized HashMap?
A: A synchronized map serializes every operation behind one lock, while ConcurrentHashMap lets reads proceed without locking and locks only the bucket being written, so many threads work in parallel. It also provides atomic compound operations such as computeIfAbsent and merge.
