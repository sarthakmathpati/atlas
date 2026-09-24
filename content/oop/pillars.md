---
topic: oop.pillars
name: "The four pillars"
subject: oop
order: 2
prereqs: [oop.foundations]
---

## oop.pillars.encapsulation
name: "Encapsulation"
importance: must
prereqs: [oop.foundations.access-modifiers]
scope: "hiding state, getters and setters, invariants"

## oop.pillars.abstraction
name: "Abstraction"
importance: must
scope: "exposing what, hiding how; abstract classes and interfaces"

## oop.pillars.inheritance
name: "Inheritance"
importance: must
scope: "single, multilevel, hierarchical, multiple; is-a relationships"

## oop.pillars.polymorphism
name: "Polymorphism"
importance: must
prereqs: [oop.pillars.inheritance]
scope: "compile-time (overloading, templates) vs runtime (overriding, virtual dispatch)"

## oop.pillars.abstract-class-vs-interface
name: "Abstract class vs interface"
importance: must
prereqs: [oop.pillars.abstraction]
scope: "differences, when to use each, default methods"

## oop.pillars.the-diamond-problem
name: "The diamond problem"
importance: important
prereqs: [oop.pillars.inheritance]
scope: "multiple inheritance ambiguity, virtual inheritance in C++, interfaces in Java"

## oop.pillars.method-overloading-vs-overriding
name: "Method overloading vs overriding"
importance: important
prereqs: [oop.pillars.polymorphism]
scope: "rules, return types, covariant returns"
