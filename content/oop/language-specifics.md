---
topic: oop.language-specifics
name: "Copying, equality and language specifics"
subject: oop
order: 4
prereqs: [oop.pillars]
---

## oop.language-specifics.shallow-vs-deep-copy
name: "Shallow vs deep copy"
importance: must
scope: "copy constructors, clone, copy assignment"

## oop.language-specifics.rule-of-three-and-five-in-cpp
name: "Rule of three and five in C++"
importance: important
prereqs: [oop.language-specifics.shallow-vs-deep-copy]
scope: "when you write one special member, write the others"

## oop.language-specifics.equals-and-hashcode-in-java
name: "equals and hashCode in Java"
importance: important
scope: "the contract and what breaks when violated"

## oop.language-specifics.immutability
name: "Immutability"
importance: important
scope: "immutable objects, benefits for thread safety"

## oop.language-specifics.operator-overloading-and-friend-functions
name: "Operator overloading and friend functions"
importance: important
scope: "C++ specifics"

## oop.language-specifics.virtual-destructors
name: "Virtual destructors"
importance: important
prereqs: [oop.pillars.polymorphism]
scope: "why base classes need them"
