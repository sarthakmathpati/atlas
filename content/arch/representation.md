---
topic: arch.representation
name: "Data representation"
subject: arch
order: 1
prereqs: []
---

## arch.representation.binary-hex-and-twos-complement
name: "Binary, hex and two's complement"
importance: must
scope: "signed integer representation"

## arch.representation.floating-point-ieee-754
name: "Floating point (IEEE 754)"
importance: must
prereqs: [arch.representation.binary-hex-and-twos-complement]
scope: "sign, exponent, mantissa, why 0.1 + 0.2 is not 0.3"

## arch.representation.endianness
name: "Endianness"
importance: important
prereqs: [arch.representation.binary-hex-and-twos-complement]
scope: "big-endian vs little-endian"

## arch.representation.character-encodings
name: "Character encodings"
importance: important
scope: "ASCII, UTF-8"
