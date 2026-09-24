---
topic: dsa.math
name: "Math for coding interviews"
subject: dsa
order: 35
prereqs: [dsa.complexity]
---

## dsa.math.gcd-and-lcm
name: "GCD and LCM"
importance: must
scope: "Euclid's algorithm and its complexity"

## dsa.math.primes
name: "Primes"
importance: must
scope: "trial division, Sieve of Eratosthenes, prime factorization"

## dsa.math.modular-arithmetic
name: "Modular arithmetic"
importance: must
scope: "sums and products mod m, negative mod, 1e9+7"

## dsa.math.fast-exponentiation
name: "Fast exponentiation"
importance: must
scope: "binary exponentiation in O(log n)"

## dsa.math.modular-inverse-and-ncr-mod-p
name: "Modular inverse and nCr mod p"
importance: important
prereqs: [dsa.math.modular-arithmetic, dsa.math.fast-exponentiation]
scope: "Fermat's little theorem, factorial precomputation"

## dsa.math.combinatorics-in-code
name: "Combinatorics in code"
importance: important
scope: "nCr with Pascal's triangle, Catalan numbers"

## dsa.math.randomized-algorithms
name: "Randomized algorithms"
importance: important
pattern: true
scope: "reservoir sampling, Fisher-Yates shuffle, weighted random pick, rand7 to rand10"

## dsa.math.geometry-basics
name: "Geometry basics"
importance: advanced
scope: "cross product, orientation, points on a line, convex hull idea"

## dsa.math.number-theory-extras
name: "Number theory extras"
importance: advanced
prereqs: [dsa.math.gcd-and-lcm]
scope: "Euler's totient, extended Euclid"
