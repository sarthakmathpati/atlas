---
topic: lld.method
name: "LLD method"
subject: lld
order: 1
prereqs: [oop.principles]
---

## lld.method.clarifying-requirements
name: "Clarifying requirements"
importance: must
scope: "functional vs non-functional, scope for a 45 to 90 minute round"

## lld.method.identifying-entities
name: "Identifying entities"
importance: must
prereqs: [lld.method.clarifying-requirements]
scope: "nouns to classes, verbs to methods"

## lld.method.defining-relationships-and-class-diagrams
name: "Defining relationships and class diagrams"
importance: must
prereqs: [lld.method.identifying-entities]
scope: "associations, composition, interfaces"

## lld.method.designing-apis-and-methods
name: "Designing APIs and methods"
importance: must
prereqs: [lld.method.defining-relationships-and-class-diagrams]
scope: "signatures, responsibilities, validation"

## lld.method.applying-design-patterns
name: "Applying design patterns"
importance: must
prereqs: [lld.method.designing-apis-and-methods]
scope: "where strategy, factory, observer and state fit"

## lld.method.handling-concurrency-in-lld
name: "Handling concurrency in LLD"
importance: important
scope: "locks around shared state, thread-safe booking"

## lld.method.extensibility-and-testing
name: "Extensibility and testing"
importance: important
prereqs: [lld.method.applying-design-patterns]
scope: "adding features without rewrites, unit-testable design"

## lld.method.machine-coding-round-strategy
name: "Machine coding round strategy"
importance: important
scope: "working code first, clean structure, demo flow"
