---
topic: dsa.stacks-queues
name: "Stacks and queues"
subject: dsa
order: 14
prereqs: [dsa.arrays, dsa.linked-lists]
---

## dsa.stacks-queues.stack-basics
name: "Stack basics"
importance: must
scope: "LIFO, array and list implementations, real uses (undo, call stack)"

## dsa.stacks-queues.queue-and-deque-basics
name: "Queue and deque basics"
importance: must
scope: "FIFO, circular buffer, deque operations"

## dsa.stacks-queues.bracket-matching
name: "Bracket matching"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.stack-basics]
scope: "valid parentheses, longest valid parentheses"

## dsa.stacks-queues.expression-evaluation
name: "Expression evaluation"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.bracket-matching]
scope: "postfix evaluation, infix with precedence, basic calculator"

## dsa.stacks-queues.stack-based-string-processing
name: "Stack-based string processing"
importance: important
pattern: true
prereqs: [dsa.stacks-queues.stack-basics]
scope: "decode string, simplify path, adjacent duplicates, asteroid collision"

## dsa.stacks-queues.stack-and-queue-designs
name: "Stack and queue designs"
importance: important
scope: "min stack, queue using stacks, stack using queues"
