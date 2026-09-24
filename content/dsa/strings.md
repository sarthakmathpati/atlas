---
topic: dsa.strings
name: "Strings"
subject: dsa
order: 9
prereqs: [dsa.arrays, dsa.hashing]
---

## dsa.strings.string-basics
name: "String basics"
importance: must
scope: "immutability, building strings efficiently, character arithmetic, ASCII and Unicode basics"

## dsa.strings.palindromes
name: "Palindromes"
importance: must
pattern: true
prereqs: [dsa.strings.string-basics]
scope: "two-pointer checks, expand around center"

## dsa.strings.anagrams-and-character-counts
name: "Anagrams and character counts"
importance: must
prereqs: [dsa.strings.string-basics]
scope: "fixed-size count arrays"

## dsa.strings.parsing-strings
name: "Parsing strings"
importance: important
prereqs: [dsa.strings.string-basics]
scope: "tokenizing, atoi rules, signs and spaces"

## dsa.strings.classic-string-manipulation
name: "Classic string manipulation"
importance: important
scope: "reverse words, longest common prefix, isomorphic strings, Roman numerals"

## dsa.strings.big-number-arithmetic-on-strings
name: "Big-number arithmetic on strings"
importance: important
scope: "add and multiply strings"
