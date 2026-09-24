---
topic: lang.cpp-modern
name: "Modern C++"
subject: lang
order: 3
prereqs: [lang.cpp-core]
---

## lang.cpp-modern.raii
name: "RAII"
importance: must
scope: "tying resources to object lifetime, destructors, exception safety"

## lang.cpp-modern.smart-pointers
name: "Smart pointers"
importance: must
prereqs: [lang.cpp-core.pointers-and-memory, lang.cpp-modern.raii]
scope: "unique_ptr, shared_ptr (reference counting cost), weak_ptr (breaking cycles)"

## lang.cpp-modern.move-semantics
name: "Move semantics"
importance: must
scope: "lvalues vs rvalues, move constructor and assignment, `std::move`, rule of three, five and zero"

## lang.cpp-modern.templates
name: "Templates"
importance: important
scope: "function and class templates, specialization basics, compile-time polymorphism"

## lang.cpp-modern.const-constexpr-and-inline
name: "const, constexpr and inline"
importance: important
scope: "compile-time computation and its uses"

## lang.cpp-modern.virtual-function-internals
name: "Virtual function internals"
importance: important
scope: "vtable, vptr, cost of virtual calls, virtual destructors"

## lang.cpp-modern.crtp-and-static-polymorphism
name: "CRTP and static polymorphism"
importance: advanced
tracks: [quant]
prereqs: [lang.cpp-modern.templates, lang.cpp-modern.virtual-function-internals]
scope: "avoiding virtual dispatch in low-latency code"

## lang.cpp-modern.object-memory-layout
name: "Object memory layout"
importance: advanced
tracks: [quant]
scope: "size, alignment, padding, cache-friendly structs"
