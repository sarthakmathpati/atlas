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

### simple
Computers store numbers as rows of bits, and hexadecimal is a short way to write them: each hex digit stands for four bits. Negative numbers use two's complement, where the top bit counts as a large negative amount instead of a positive one. It works like a car's odometer rolling back past zero: one below 0000 is 9999, and two's complement simply agrees to read that as minus one.

### interview
- An $n$-bit **unsigned** value is $\sum b_i 2^i$, from 0 to $2^n - 1$. **Two's complement** gives the top bit weight $-2^{n-1}$, so the range is $-2^{n-1}$ to $2^{n-1} - 1$ (int8: $-128$ to $127$).
- Negate by inverting the bits and adding 1; $-1$ is all ones, and $-2^{n-1}$ is its own negation.
- One adder handles signed and unsigned numbers: the bits of the result are the same; only the interpretation differs.
- **Sign extension**: widening a signed value copies the top bit; widening an unsigned one fills with zeros.
- C++20 requires two's complement. Unsigned overflow wraps modulo $2^n$; **signed overflow is undefined behavior**; narrowing conversions keep the low bits.
- Mixed signed/unsigned comparisons convert the signed side to unsigned, so `-1 < 1u` is false.

### deep
#### Intuition

Two's complement is arithmetic modulo $2^n$ with half the circle labelled negative. Going one step below 0 lands on the largest pattern, all ones, which is read as $-1$. Addition, subtraction and multiplication then work on the raw bits without caring about signs.

#### Worked example

```cpp
string bits(uint8_t x) { return bitset<8>(x).to_string(); }

int main() {
    // 8-bit patterns: the same bits read as unsigned and as two's complement.
    for (int8_t v : {5, -5, 127, -128, -1}) {
        uint8_t u = static_cast<uint8_t>(v);  // same bits, reinterpreted (well defined)
        printf("%4d = %s = 0x%02X, as unsigned %3u\n", v, bits(u).c_str(), u, u);
    }
    // Negation is "invert the bits, add 1".
    uint8_t five = 5;
    printf("~5 + 1 = %s, which is -5\n", bits(static_cast<uint8_t>(~five + 1)).c_str());
    // Range of an n-bit signed type: -2^(n-1) to 2^(n-1) - 1.
    printf("int8 %d..%d, int32 %d..%d\n", INT8_MIN, INT8_MAX, INT32_MIN, INT32_MAX);

    // Widening copies the sign bit (sign extension); unsigned widening fills with zeros.
    int8_t m = -5;
    printf("int8 -5 -> int32 0x%08X; uint8 0xFB -> uint32 0x%08X\n",
           static_cast<uint32_t>(int32_t{m}), static_cast<uint32_t>(uint8_t{0xFB}));
    // Narrowing keeps the low bits (defined as modulo 2^n since C++20).
    printf("int 300 -> int8 %d; int -1 -> uint32 %u\n", static_cast<int8_t>(300),
           static_cast<uint32_t>(-1));

    // Right shift of a negative number is arithmetic (C++20); it rounds down, division rounds
    // toward zero.
    printf("-7 >> 1 = %d, -7 / 2 = %d, -7 %% 2 = %d\n", -7 >> 1, -7 / 2, -7 % 2);

    // Unsigned arithmetic wraps around. Writing -1 < 1u compares as unsigned, like this:
    unsigned a = 3, b = 5;
    printf("3u - 5u = %u; (unsigned)-1 < 1u is %s\n", a - b,
           static_cast<unsigned>(-1) < 1u ? "true" : "false");
    // |INT_MIN| does not fit in an int; computed in unsigned it is 2^31.
    printf("0u - (unsigned)INT_MIN = %u\n", 0u - static_cast<unsigned>(INT_MIN));
}
```

Output:

```text
   5 = 00000101 = 0x05, as unsigned   5
  -5 = 11111011 = 0xFB, as unsigned 251
 127 = 01111111 = 0x7F, as unsigned 127
-128 = 10000000 = 0x80, as unsigned 128
  -1 = 11111111 = 0xFF, as unsigned 255
~5 + 1 = 11111011, which is -5
int8 -128..127, int32 -2147483648..2147483647
int8 -5 -> int32 0xFFFFFFFB; uint8 0xFB -> uint32 0x000000FB
int 300 -> int8 44; int -1 -> uint32 4294967295
-7 >> 1 = -4, -7 / 2 = -3, -7 % 2 = -1
3u - 5u = 4294967294; (unsigned)-1 < 1u is false
0u - (unsigned)INT_MIN = 2147483648
```

#### Reading the output

- **Same bits, two readings**: `11111011` is 251 unsigned and $-5$ signed, because the top bit is worth $-128$ instead of $+128$: $251 - 256 = -5$.
- **Negation**: inverting 5 (`00000101`) gives `11111010`, and adding 1 gives $-5$.
- **Widening**: $-5$ becomes `0xFFFFFFFB` (sign extension), while the unsigned byte `0xFB` becomes `0x000000FB`.
- **Narrowing** keeps the low 8 bits: $300 = 256 + 44$ becomes 44; $-1$ as a 32-bit unsigned is $2^{32} - 1$.
- **Shifts and division round differently**: `-7 >> 1` is $-4$ (rounds down), `-7 / 2` is $-3$ (rounds toward zero), and the remainder takes the sign of the dividend.
- **Unsigned wraps**: $3 - 5$ in unsigned is $2^{32} - 2$. Comparing $-1$ with `1u` converts $-1$ to $2^{32} - 1$, so it is not less (compilers warn with `-Wsign-compare`).
- **The asymmetric range**: $|\text{INT\_MIN}| = 2^{31}$ doesn't fit in an `int`; computed in unsigned arithmetic it is fine.

#### Signed overflow

`INT_MAX + 1` in `int` is undefined behavior, not a wrap: the compiler may assume it never happens (for example, fold `x + 1 > x` to true). Built with `-fsanitize=undefined`, a function returning `x + 1` called with `INT_MAX` reports `runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'`. Do overflow-prone arithmetic in a wider or unsigned type, or check first.

#### Common mistakes

- **Loop counters of unsigned type counting down**: `for (unsigned i = n - 1; i >= 0; --i)` never ends.
- **Assuming `>>` divides by 2** for negative numbers: it rounds down, not toward zero.
- **Computing `abs(INT_MIN)`**: it overflows.

Connects to: [bitwise operators](#/concept/dsa.bits.bitwise-operators), [integer overflow and limits](#/concept/lang.general.integer-overflow-and-limits), [floating point (IEEE 754)](#/concept/arch.representation.floating-point-ieee-754), [endianness](#/concept/arch.representation.endianness).

### questions
Q: How is minus five stored as an 8-bit two's complement number?
A: Invert the bits of 5 (00000101) to get 11111010 and add 1, giving 11111011, which is 0xFB. Read as unsigned it would be 251, which is 256 minus 5.

Q: What is the range of a 32-bit signed integer, and why is it not symmetric?
A: From minus 2 to the 31 up to 2 to the 31 minus 1. Zero takes one of the non-negative patterns, so there is one more negative value than positive, and the most negative value has no positive counterpart.

Q: What happens when a signed int overflows in C++, compared with an unsigned int?
A: Unsigned arithmetic wraps modulo 2 to the n by definition. Signed overflow is undefined behavior, so the compiler may assume it never happens and optimize accordingly; UBSan reports it at run time.

Q: What is sign extension?
A: When a signed value is widened, the new high bits are filled with copies of its sign bit, so the value is preserved: minus 5 as a byte (0xFB) becomes 0xFFFFFFFB as a 32-bit int.

Q: Why is comparing a negative int with an unsigned value dangerous?
A: The usual arithmetic conversions turn the int into an unsigned value first, so minus 1 becomes the largest unsigned number and minus 1 is not less than 1u. Compilers warn about it with sign-compare warnings.

## arch.representation.floating-point-ieee-754
name: "Floating point (IEEE 754)"
importance: must
prereqs: [arch.representation.binary-hex-and-twos-complement]
scope: "sign, exponent, mantissa, why 0.1 + 0.2 is not 0.3"

### simple
A floating-point number stores a value like scientific notation in binary: a sign, a significand of fixed length and a power of two. Because the significand has a limited number of bits, most decimals, such as 0.1, can't be stored exactly, only as the nearest binary fraction. It is like writing one third as 0.333333: close, but add three of them and you get 0.999999, not 1.

### interview
- A `double` has 1 sign bit, 11 exponent bits (bias 1023) and 52 fraction bits: value $= (-1)^s \times 1.f \times 2^{e - 1023}$. A `float` has 1, 8 (bias 127) and 23.
- 0.1, 0.2 and 0.3 are all rounded to the nearest representable value; $0.1 + 0.2$ rounds to the value just above the stored 0.3, so they compare unequal.
- Spacing (one **ulp**) grows with magnitude; **machine epsilon** is $2^{-52} \approx 2.2 \times 10^{-16}$ for double. Integers are exact up to $2^{53}$ (double) and $2^{24}$ (float).
- Special values: $\pm\infty$, NaN (never equal to anything, including itself), $-0.0 = 0.0$, and subnormals below the smallest normal number.
- Floating-point addition is not associative: the order of a sum changes the result. Compare with a tolerance, sum small terms first, or use compensated (Kahan) summation.

### deep
#### Intuition

Between 1 and 2 a double has $2^{52}$ equally spaced values; between 2 and 4 the same number, twice as far apart. Any real number is rounded to the nearest one. The fraction $\frac{1}{10}$ has an infinitely repeating binary expansion (0.000110011…), so it is always rounded.

#### Worked example

The program splits doubles into their fields, prints the exact decimal value of what is stored for 0.1, 0.2, their sum and 0.3, and sums $\frac{1}{k}$ for $k$ up to $10^7$ in single precision three ways.

```cpp
// Split a double into its IEEE 754 fields: 1 sign bit, 11 exponent bits, 52 fraction bits.
void fields(double x) {
    uint64_t b = bit_cast<uint64_t>(x);
    unsigned sign = b >> 63, exponent = (b >> 52) & 0x7FF;
    uint64_t fraction = b & ((1ULL << 52) - 1);
    printf("%-8g sign %u, exponent %4u ", x, sign, exponent);
    if (exponent == 0) printf("(subnormal)");
    else printf("(2^%+d)", int(exponent) - 1023);
    printf(", fraction 0x%013llX\n", (unsigned long long)fraction);
}

int main() {
    for (double x : {1.0, -2.5, 0.1, 1e-310}) fields(x);
    // The exact values stored for 0.1, 0.2, their sum and 0.3.
    printf("0.1       = %.55f\n0.2       = %.55f\n", 0.1, 0.2);
    printf("0.1 + 0.2 = %.55f\n0.3       = %.55f\n", 0.1 + 0.2, 0.3);
    printf("0.1 + 0.2 == 0.3 is %s; they differ by %.3g; one step (ulp) at 0.3 is %.3g\n",
           0.1 + 0.2 == 0.3 ? "true" : "false", 0.1 + 0.2 - 0.3, nextafter(0.3, 1.0) - 0.3);
    printf("epsilon: double %.3g, float %.3g\n", DBL_EPSILON, double(FLT_EPSILON));

    // Integers are exact up to 2^53 (2^24 for float); beyond that, gaps of 2 or more.
    double big = 9007199254740992.0;  // 2^53
    printf("2^53 + 1 == 2^53 is %s; float 16777216 + 1 = %.1f\n",
           big + 1 == big ? "true" : "false", double(16777216.0f + 1.0f));

    // Special values.
    double inf = numeric_limits<double>::infinity(), nan = numeric_limits<double>::quiet_NaN();
    printf("1/inf = %g; inf - inf is NaN: %s; nan == nan is %s; -0.0 == 0.0 is %s\n", 1 / inf,
           isnan(inf - inf) ? "yes" : "no", nan == nan ? "true" : "false",
           -0.0 == 0.0 ? "true" : "false");
    printf("smallest normal %.3g, smallest subnormal %.3g\n", DBL_MIN,
           numeric_limits<double>::denorm_min());

    // Order matters: add 1/k for k = 1..10^7 in float, forward, backward and compensated.
    float forward = 0, backward = 0, kahan = 0, carry = 0;
    const int n = 10'000'000;
    for (int k = 1; k <= n; ++k) forward += 1.0f / k;
    for (int k = n; k >= 1; --k) backward += 1.0f / k;
    for (int k = 1; k <= n; ++k) {  // Kahan summation keeps the lost low-order bits in carry
        float y = 1.0f / k - carry, t = kahan + y;
        carry = (t - kahan) - y;
        kahan = t;
    }
    double exact = 0;
    for (int k = n; k >= 1; --k) exact += 1.0 / k;
    printf("sum of 1/k: double %.6f; float forward %.6f, backward %.6f, Kahan %.6f\n", exact,
           forward, backward, kahan);
}
```

Output:

```text
1        sign 0, exponent 1023 (2^+0), fraction 0x0000000000000
-2.5     sign 1, exponent 1024 (2^+1), fraction 0x4000000000000
0.1      sign 0, exponent 1019 (2^-4), fraction 0x999999999999A
1e-310   sign 0, exponent    0 (subnormal), fraction 0x012688B70E62B
0.1       = 0.1000000000000000055511151231257827021181583404541015625
0.2       = 0.2000000000000000111022302462515654042363166809082031250
0.1 + 0.2 = 0.3000000000000000444089209850062616169452667236328125000
0.3       = 0.2999999999999999888977697537484345957636833190917968750
0.1 + 0.2 == 0.3 is false; they differ by 5.55e-17; one step (ulp) at 0.3 is 5.55e-17
epsilon: double 2.22e-16, float 1.19e-07
2^53 + 1 == 2^53 is true; float 16777216 + 1 = 16777216.0
1/inf = 0; inf - inf is NaN: yes; nan == nan is false; -0.0 == 0.0 is true
smallest normal 2.23e-308, smallest subnormal 4.94e-324
sum of 1/k: double 16.695311; float forward 15.403683, backward 16.686031, Kahan 16.695311
```

#### Reading the output

- **Fields**: $-2.5 = -1.25 \times 2^1$, so the exponent field is $1024$ and the fraction is $0.25$ (`0x4…`). For 0.1 the fraction is the repeating pattern `999…9A`, rounded up at the end. $10^{-310}$ is below the smallest normal double, so it is stored as a subnormal with a zero exponent field.
- **Why 0.1 + 0.2 ≠ 0.3**: both inputs are stored slightly above their decimal values, the sum is rounded again, and it lands one step (one ulp, $5.55 \times 10^{-17}$) above the double nearest 0.3.
- **Integer gaps**: above $2^{53}$ doubles are 2 apart, so adding 1 changes nothing; for floats the same happens at $2^{24} = 16777216$.
- **Special values**: $\infty - \infty$ is NaN, NaN is not equal to itself (use `isnan`), and $-0.0$ compares equal to $0.0$.
- **Summation order**: adding $\frac{1}{k}$ from large to small in float stalls at 15.40, because once the total is large, tiny terms round away entirely. Adding small terms first gives 16.686, and Kahan summation, which carries the rounding error forward, matches the double result 16.695311.

#### Common mistakes

- **Comparing with `==`.** Use a tolerance scaled to the magnitude, such as `fabs(a - b) <= 1e-9 * max(fabs(a), fabs(b))`.
- **Storing money in doubles.** Use integer cents.
- **Enabling `-ffast-math` casually.** It lets the compiler reorder sums and assume no NaN, which can undo Kahan summation.

Connects to: [floating point pitfalls](#/concept/lang.general.floating-point-pitfalls), [binary search on real numbers](#/concept/dsa.binary-search.binary-search-on-real-numbers), [binary, hex and two's complement](#/concept/arch.representation.binary-hex-and-twos-complement), [SIMD basics](#/concept/arch.performance.simd-basics).

### questions
Q: Why is 0.1 + 0.2 not equal to 0.3 in double precision?
A: None of the three decimals has a finite binary expansion, so each is stored as the nearest double. The stored 0.1 and 0.2 are slightly too large, and their rounded sum is one step above the double closest to 0.3.

Q: What are the parts of an IEEE 754 double?
A: One sign bit, an 11-bit exponent stored with a bias of 1023, and a 52-bit fraction. A normal number is plus or minus 1 point fraction times 2 to the exponent minus 1023; an exponent field of zero means a subnormal or zero, and all ones means infinity or NaN.

Q: What is machine epsilon?
A: The gap between 1 and the next representable number, 2 to the minus 52 for double, about 2.2 times 10 to the minus 16. It bounds the relative rounding error of a single operation.

Q: Up to what size can a double hold every integer exactly?
A: Up to 2 to the 53. Beyond it neighbouring doubles are 2 or more apart, so 2 to the 53 plus 1 rounds back to 2 to the 53.

Q: Why can the order of a floating-point sum matter, and how do you reduce the error?
A: Each addition rounds, and adding a tiny term to a large total can lose it completely, so addition is not associative. Add small terms first, sum in higher precision, or use Kahan summation, which keeps the lost low-order part in a correction term.

## arch.representation.endianness
name: "Endianness"
importance: important
prereqs: [arch.representation.binary-hex-and-twos-complement]
scope: "big-endian vs little-endian"

### simple
A number bigger than one byte has to be stored as several bytes, and endianness is the order in which they go into memory. Big-endian puts the most significant byte first, as we write numbers; little-endian puts the least significant byte first. It is like writing a date as year-month-day or day-month-year: both are fine, but two people must agree before they swap notes.

### interview
- **Little-endian**: least significant byte at the lowest address (x86-64, most ARM systems in practice). **Big-endian**: most significant first; network protocols use it ("network byte order").
- Within a single machine endianness is invisible; it matters when bytes cross a boundary: files, network packets, memory viewed through a different type.
- Convert with `htonl`/`htons` and `ntohl`/`ntohs` (host to network and back), or byte swaps; C++20 has `std::endian::native` to test the machine.
- The portable way to read a multi-byte field is to assemble it from bytes with shifts, which works on any machine.
- Reading an object's bytes through `memcpy` or `std::bit_cast` is well defined; type-punning through a pointer cast or a union is not.

### deep
#### Worked example

```cpp
void dump(const char* label, const void* p, size_t n) {
    printf("%-26s", label);
    for (size_t i = 0; i < n; ++i) printf(" %02X", static_cast<const unsigned char*>(p)[i]);
    printf("\n");
}

// Portable: build the value from bytes with shifts, whatever the machine's byte order.
uint32_t readBigEndian(const unsigned char* b) {
    return uint32_t(b[0]) << 24 | uint32_t(b[1]) << 16 | uint32_t(b[2]) << 8 | b[3];
}
uint32_t swapBytes(uint32_t x) {
    return (x >> 24) | ((x >> 8) & 0xFF00) | ((x << 8) & 0xFF0000) | (x << 24);
}

int main() {
    printf("this machine is %s-endian\n", endian::native == endian::little ? "little" : "big");
    uint32_t x = 0x0A0B0C0D;
    dump("0x0A0B0C0D in memory:", &x, 4);
    uint32_t net = htonl(x);  // host to network byte order (big-endian)
    dump("htonl(0x0A0B0C0D):", &net, 4);
    printf("swapBytes(0x0A0B0C0D) = 0x%08X, ntohl(htonl(x)) = 0x%08X\n", swapBytes(x), ntohl(net));

    unsigned char header[4] = {0x00, 0x00, 0x01, 0x2C};  // a length field sent big-endian
    uint32_t wrong;
    memcpy(&wrong, header, 4);  // copies bytes as they are: wrong on a little-endian machine
    printf("length read by memcpy: %u; read as big-endian: %u\n", wrong, readBigEndian(header));

    double d = 1.0;
    dump("1.0 as a double:", &d, 8);
    uint16_t port = 8080;
    dump("port 8080 (host order):", &port, 2);
    uint16_t netPort = htons(port);
    dump("port 8080 (network order):", &netPort, 2);
}
```

Output:

```text
this machine is little-endian
0x0A0B0C0D in memory:      0D 0C 0B 0A
htonl(0x0A0B0C0D):         0A 0B 0C 0D
swapBytes(0x0A0B0C0D) = 0x0D0C0B0A, ntohl(htonl(x)) = 0x0A0B0C0D
length read by memcpy: 738263040; read as big-endian: 300
1.0 as a double:           00 00 00 00 00 00 F0 3F
port 8080 (host order):    90 1F
port 8080 (network order): 1F 90
```

#### Reading the output

- **The same value, two layouts**: this x86-64 machine stores `0x0A0B0C0D` as `0D 0C 0B 0A`. `htonl` rearranges it to `0A 0B 0C 0D`, the order the network expects.
- **The bug**: a length field arrives as the bytes `00 00 01 2C`. Copying them straight into a `uint32_t` on a little-endian machine reads $\texttt{0x2C010000} = 738{,}263{,}040$ instead of 300. Assembling from bytes with shifts gives 300 on any machine.
- **Every multi-byte type is affected**: the double 1.0 (`0x3FF0000000000000`) appears with its `3F F0` at the end; the port 8080 (`0x1F90`) is stored `90 1F` and sent `1F 90`.

#### Common mistakes

- **Swapping twice**, once when writing and again when reading on the same machine; convert exactly at the boundary.
- **Forgetting 16-bit fields**: ports and lengths need `htons` too.
- **Reading structs straight from the wire**: besides byte order, padding and alignment differ between compilers.

Connects to: [binary, hex and two's complement](#/concept/arch.representation.binary-hex-and-twos-complement), [character encodings](#/concept/arch.representation.character-encodings), [TCP/IP model](#/concept/cn.fundamentals.tcp-ip-model), [bitwise operators](#/concept/dsa.bits.bitwise-operators).

### questions
Q: What is the difference between big-endian and little-endian?
A: The order of bytes in memory for a multi-byte value. Big-endian stores the most significant byte at the lowest address; little-endian stores the least significant byte there. The value 0x0A0B0C0D is 0A 0B 0C 0D in big-endian and 0D 0C 0B 0A in little-endian.

Q: What is network byte order and how do you convert to it?
A: Big-endian, the order used by network protocol headers. In C and C++ use htonl and htons to convert 32-bit and 16-bit values from host to network order, and ntohl and ntohs to convert back.

Q: How do you read a big-endian 32-bit field from a byte buffer portably?
A: Shift and combine the bytes: the first byte shifted left by 24, the second by 16, the third by 8, then the fourth. This gives the same result on any machine, unlike copying the bytes into an integer.

Q: When does endianness matter in a program?
A: Only when bytes leave the program's own typed view: writing binary files, sending data over a network, or inspecting an object's bytes. Arithmetic and shifts on integers behave the same on every machine.

## arch.representation.character-encodings
name: "Character encodings"
importance: important
scope: "ASCII, UTF-8"

### simple
Text is stored as numbers, and an encoding is the agreed table between characters and those numbers. ASCII covers 128 characters, enough for English letters, digits and punctuation, while Unicode numbers every character in every script and UTF-8 stores those numbers in one to four bytes. It is like a phone number that is short for local calls and gets a longer prefix for international ones.

### interview
- **ASCII**: 7-bit codes 0 to 127 (`'A'` is 65, `'0'` is 48, `'a'` is 97).
- **Unicode** assigns a code point to each character, from U+0000 to U+10FFFF. An encoding turns code points into bytes.
- **UTF-8**: 1 byte below U+0080 (exactly ASCII), 2 bytes up to U+07FF, 3 up to U+FFFF, 4 beyond. Lead bytes start `0`, `110`, `1110`, `11110`; continuation bytes start `10`.
- UTF-8 is self-synchronizing (you can find character boundaries from any point) and ASCII-compatible; it is the common default for files and the web.
- **UTF-16** uses 2 bytes for most characters and a **surrogate pair** (4 bytes) above U+FFFF.
- `std::string::size()` counts bytes, not characters. Validate input: reject overlong forms, surrogates and truncated sequences.

### deep
#### Worked example

An encoder and a validating decoder, written from the bit layout.

```cpp
// Encode one code point as UTF-8: 1 to 4 bytes, the leading bits say how many.
string encode(char32_t c) {
    string s;
    if (c < 0x80) s += char(c);
    else if (c < 0x800) s += char(0xC0 | c >> 6), s += char(0x80 | (c & 0x3F));
    else if (c < 0x10000)
        s += char(0xE0 | c >> 12), s += char(0x80 | (c >> 6 & 0x3F)), s += char(0x80 | (c & 0x3F));
    else
        s += char(0xF0 | c >> 18), s += char(0x80 | (c >> 12 & 0x3F)),
            s += char(0x80 | (c >> 6 & 0x3F)), s += char(0x80 | (c & 0x3F));
    return s;
}

// Decode, rejecting malformed input: bad lead bytes, missing continuation bytes, overlong forms,
// surrogates and values above U+10FFFF. Returns the code points, or nothing if invalid.
optional<vector<char32_t>> decode(const string& s) {
    vector<char32_t> out;
    for (size_t i = 0; i < s.size();) {
        unsigned char b = s[i];
        int len = b < 0x80 ? 1 : (b >> 5) == 6 ? 2 : (b >> 4) == 14 ? 3 : (b >> 3) == 30 ? 4 : 0;
        if (len == 0 || i + len > s.size()) return nullopt;
        char32_t c = len == 1 ? b : b & (0x7F >> len);
        for (int k = 1; k < len; ++k) {
            unsigned char cont = s[i + k];
            if ((cont & 0xC0) != 0x80) return nullopt;
            c = c << 6 | (cont & 0x3F);
        }
        const char32_t smallest[] = {0, 0, 0x80, 0x800, 0x10000};
        if (c < smallest[len] || (c >= 0xD800 && c <= 0xDFFF) || c > 0x10FFFF) return nullopt;
        out.push_back(c);
        i += len;
    }
    return out;
}

int main() {
    for (char32_t c : {U'A', U'é', U'€', U'\U0001F600'}) {
        string s = encode(c);
        printf("U+%04X ->", unsigned(c));
        for (unsigned char b : s) printf(" %02X", b);
        printf(" (%zu byte%s)\n", s.size(), s.size() > 1 ? "s" : "");
    }
    string word = "caf" + encode(U'é');  // "cafe" with an accent on the e
    printf("\"caf\\u00e9\": %zu bytes, %zu code points\n", word.size(), decode(word)->size());
    for (string bad : {string("\xC0\xAF"), string("\xE2\x82"), string("\xED\xA0\x80")})
        printf("%zu-byte sequence starting %02X: %s\n", bad.size(), (unsigned char)bad[0],
               decode(bad) ? "valid" : "rejected");
    char32_t c = U'\U0001F600', v = c - 0x10000;  // UTF-16 needs a surrogate pair above U+FFFF
    printf("UTF-16 for U+1F600: %04X %04X\n", unsigned(0xD800 + (v >> 10)),
           unsigned(0xDC00 + (v & 0x3FF)));
}
```

Output:

```text
U+0041 -> 41 (1 byte)
U+00E9 -> C3 A9 (2 bytes)
U+20AC -> E2 82 AC (3 bytes)
U+1F600 -> F0 9F 98 80 (4 bytes)
"caf\u00e9": 5 bytes, 4 code points
2-byte sequence starting C0: rejected
2-byte sequence starting E2: rejected
3-byte sequence starting ED: rejected
UTF-16 for U+1F600: D83D DE00
```

#### Reading the output

- **Lengths grow with the code point**: "A" stays one byte, "é" (U+00E9) takes 2, the euro sign (U+20AC) 3, and an emoji (U+1F600) 4. The lead byte's high bits (`110`, `1110`, `11110`) announce the length.
- **Bytes are not characters**: "café" is 5 bytes but 4 code points.
- **Rejected input**: `C0 AF` is an overlong encoding of `/` (a classic way to sneak past filters); `E2 82` is cut off; `ED A0 80` would encode U+D800, a surrogate, which UTF-8 forbids.
- **UTF-16**: subtract 0x10000, then split the remaining 20 bits into two 10-bit halves added to 0xD800 and 0xDC00, giving `D83D DE00`.

#### Common mistakes

- **Indexing a UTF-8 string by character**: `s[3]` is the 4th byte, which may be half of a character.
- **Truncating by bytes** in the middle of a multi-byte sequence.
- **Changing case byte by byte**: only ASCII letters can be handled that way.

Connects to: [string basics](#/concept/dsa.strings.string-basics), [bitwise operators](#/concept/dsa.bits.bitwise-operators), [endianness](#/concept/arch.representation.endianness).

### questions
Q: What is the difference between Unicode and UTF-8?
A: Unicode assigns a number, a code point, to every character. UTF-8 is one way to store those numbers as bytes, using one to four bytes per code point.

Q: How many bytes does UTF-8 use for a character?
A: One for code points below 128 (the ASCII range), two up to U+07FF, three up to U+FFFF and four up to U+10FFFF. The lead byte's high bits say how many bytes follow.

Q: Why is UTF-8 compatible with ASCII?
A: Code points 0 to 127 are encoded as the same single byte as in ASCII, and every byte of a multi-byte sequence has its top bit set, so it can never be mistaken for an ASCII character.

Q: What does std::string::size return for a UTF-8 string?
A: The number of bytes, not characters. A word with an accented letter or an emoji has more bytes than characters; counting characters requires decoding.

Q: What is an overlong encoding and why must a decoder reject it?
A: Encoding a code point with more bytes than needed, such as C0 AF for the slash. Accepting it lets the same character be written several ways, which can bypass security checks that look for the short form.
