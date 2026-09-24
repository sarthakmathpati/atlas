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

## lang.java-core.java-memory-and-garbage-collection
name: "Java memory and garbage collection"
importance: must
prereqs: [lang.java-core.jvm-jre-and-jdk]
scope: "stack vs heap, references, generational GC, stop-the-world pauses"

## lang.java-core.strings-in-java
name: "Strings in Java"
importance: must
scope: "immutability, string pool, StringBuilder, `equals` vs `==`"

## lang.java-core.collections-framework
name: "Collections framework"
importance: must
scope: "List, Set, Map, Queue; ArrayList vs LinkedList; HashSet vs TreeSet"

## lang.java-core.hashmap-internals
name: "HashMap internals"
importance: must
prereqs: [lang.java-core.collections-framework]
scope: "buckets, hashing, equals and hashCode contract, resizing, treeification"

## lang.java-core.specialised-collections
name: "Specialised collections"
importance: important
prereqs: [lang.java-core.collections-framework]
scope: "PriorityQueue, ArrayDeque, TreeMap floor and ceiling, LinkedHashMap as LRU"

## lang.java-core.generics
name: "Generics"
importance: important
scope: "type erasure, bounded types, wildcards"

## lang.java-core.exceptions
name: "Exceptions"
importance: important
scope: "checked vs unchecked, try-with-resources, finally"

## lang.java-core.modern-java-features
name: "Modern Java features"
importance: important
scope: "lambdas, streams, Optional, functional interfaces"

## lang.java-core.keywords-that-matter
name: "Keywords that matter"
importance: important
scope: "final, static, abstract, interfaces with default methods"

## lang.java-core.java-threads-overview
name: "Java threads overview"
importance: advanced
scope: "Thread vs Runnable, ExecutorService, synchronized, volatile, ConcurrentHashMap"
