---
topic: dsa.bits
name: "Bit manipulation"
subject: dsa
order: 34
prereqs: [dsa.complexity]
---

## dsa.bits.bitwise-operators
name: "Bitwise operators"
importance: must
scope: "AND, OR, XOR, NOT, shifts, two's complement"

## dsa.bits.single-bit-tricks
name: "Single-bit tricks"
importance: must
prereqs: [dsa.bits.bitwise-operators]
scope: "check, set, clear, toggle, lowest set bit, clearing the lowest set bit"

## dsa.bits.xor-tricks
name: "XOR tricks"
importance: must
pattern: true
prereqs: [dsa.bits.bitwise-operators]
scope: "single number, missing number, swapping without a temporary"

## dsa.bits.counting-set-bits
name: "Counting set bits"
importance: important
prereqs: [dsa.bits.single-bit-tricks]
scope: "popcount, Brian Kernighan's method, DP counting bits"

## dsa.bits.bitmask-enumeration
name: "Bitmask enumeration"
importance: important
pattern: true
prereqs: [dsa.bits.bitwise-operators]
scope: "iterating subsets and submasks"

## dsa.bits.arithmetic-with-bits
name: "Arithmetic with bits"
importance: important
prereqs: [dsa.bits.bitwise-operators]
scope: "add without plus, divide two integers, power of two checks"

## dsa.bits.meet-in-the-middle
name: "Meet in the middle"
importance: advanced
prereqs: [dsa.bits.bitmask-enumeration]
scope: "splitting subsets of size up to 40"
