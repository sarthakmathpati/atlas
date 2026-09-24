---
topic: oop.foundations
name: "OOP foundations"
subject: oop
order: 1
prereqs: []
---

## oop.foundations.classes-and-objects
name: "Classes and objects"
importance: must
scope: "state and behavior, instances, `this`"

## oop.foundations.constructors-and-destructors
name: "Constructors and destructors"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "default, parameterized, copy constructors, initialization order"

## oop.foundations.access-modifiers
name: "Access modifiers"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "public, private, protected, package-private in Java"

## oop.foundations.static-members
name: "Static members"
importance: must
prereqs: [oop.foundations.classes-and-objects]
scope: "class-level vs instance-level data and methods"

## oop.foundations.object-lifecycle
name: "Object lifecycle"
importance: important
prereqs: [oop.foundations.constructors-and-destructors]
scope: "creation, copying, destruction, garbage collection vs manual cleanup"
