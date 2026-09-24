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

### simple
Computers store integers as rows of bits, zeros and ones, and bitwise operators work on those bits directly, position by position. AND keeps a 1 only where both numbers have a 1, OR where either does, and XOR where exactly one does, like comparing two rows of light switches. Shifting slides all the bits left or right, which multiplies or divides by powers of two.

### interview
- `a & b` (AND), `a | b` (OR), `a ^ b` (XOR), `~a` (NOT), `a << k` (multiply by 2ᵏ), `a >> k` (divide by 2ᵏ, rounding down for non-negative a).
- **Two's complement**: negative x is stored as `~|x| + 1`; an n-bit signed int ranges from −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1; the top bit is the sign.
- XOR facts: `x ^ x = 0`, `x ^ 0 = x`, commutative and associative, so pairs cancel.
- Pitfalls: operator precedence (`a & b == c` parses as `a & (b == c)`; use parentheses), shifting by ≥ the bit width is undefined in C++, `1 << 31` overflows a 32-bit int (use `1LL` or `1U`).
- Right shift of negatives: arithmetic (sign-extending) in Java `>>` and Python, logical in Java `>>>`; C++20 defines it as arithmetic.
- Python integers are unbounded: mask with `& 0xFFFFFFFF` to imitate 32-bit behavior.

### deep
#### Intuition

A bitwise operation treats an integer as an array of up to 64 booleans and processes all of them in one instruction. That makes bits a compact way to store small sets (bit i on means item i is present) and a fast way to do certain arithmetic.

#### Truth tables

| a | b | a & b | a \| b | a ^ b |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 |

#### Worked example (8-bit)

`a = 12 = 00001100`, `b = 10 = 00001010`.

| expression | bits | value |
|---|---|---|
| a & b | 00001000 | 8 |
| a \| b | 00001110 | 14 |
| a ^ b | 00000110 | 6 |
| ~a (8-bit) | 11110011 | −13 as signed |
| a << 2 | 00110000 | 48 |
| a >> 2 | 00000011 | 3 |

Two's complement of 5: `00000101` → invert `11111010` → add 1 `11111011` = −5. That's why `~a == -a - 1` for every integer.

#### Code

```cpp
// Print the low `width` bits of x, most significant first.
string toBinary(unsigned int x, int width = 8) {
    string s;
    for (int i = width - 1; i >= 0; i--) s += ((x >> i) & 1) ? '1' : '0';
    return s;
}

// Reverse the bits of a 32-bit unsigned integer.
uint32_t reverseBits(uint32_t x) {
    uint32_t r = 0;
    for (int i = 0; i < 32; i++) {
        r = (r << 1) | (x & 1);        // append x's lowest bit to r
        x >>= 1;
    }
    return r;
}

bool oppositeSigns(int a, int b) { return (a ^ b) < 0; }   // sign bits differ
```

```python
def to_signed_32(x):
    """Interpret the low 32 bits of a Python int as a signed 32-bit value."""
    x &= 0xFFFFFFFF
    return x - (1 << 32) if x & (1 << 31) else x

def hamming_distance(a, b):
    return bin(a ^ b).count("1")   # differing bits are exactly the 1s of a XOR b
```

#### Complexity

Each bitwise operation is $O(1)$ on machine words. Loops over bits are $O(w)$ for a $w$-bit word (32 or 64).

#### Edge cases and bugs

- Precedence: `==` binds tighter than `&`, `^`, `|`; always parenthesize `(x & mask) == 0`.
- `1 << 31` is undefined for `int` in older C++ (overflow); `1 << 32` is undefined for any 32-bit type.
- `~0` is −1 (all ones), not 1.
- Python's `~x` is `-x - 1` and `>>` never loses the sign; emulate fixed width with masks.
- Mixing signed and unsigned in C++ comparisons leads to surprising results.

#### Variants

- Bit fields and flags (permissions: `READ | WRITE`), packing several small values into one integer.
- Gray code: `i ^ (i >> 1)` (consecutive values differ in one bit).
- Bitsets for fast set operations on many elements.

Connects to: single-bit tricks, XOR tricks, bitmask enumeration, data representation.

### questions
Q: What do AND, OR and XOR do bit by bit?
A: AND gives 1 only where both bits are 1, OR gives 1 where at least one bit is 1, and XOR gives 1 where exactly one bit is 1. They apply to every bit position independently.

Q: How are negative integers represented in two's complement?
A: A negative number −x is stored as the bitwise NOT of x plus one. The highest bit acts as the sign, so an n-bit type holds values from −2^(n−1) to 2^(n−1) − 1, and addition works the same for positive and negative numbers.

Q: What do left and right shifts compute?
A: x << k multiplies x by 2^k (if it doesn't overflow), and x >> k divides a non-negative x by 2^k, rounding down. For negative numbers, an arithmetic right shift keeps the sign and rounds toward negative infinity.

Q: What is a common precedence bug with bitwise operators?
A: Writing x & 1 == 0, which parses as x & (1 == 0) in C, C++ and Java because comparison binds tighter than bitwise AND. Parenthesize: (x & 1) == 0.

Q: What is the difference between >> and >>> in Java?
A: >> is an arithmetic shift that copies the sign bit into the vacated positions, so negative numbers stay negative. >>> is a logical shift that fills with zeros, treating the value as unsigned.

## dsa.bits.single-bit-tricks
name: "Single-bit tricks"
importance: must
prereqs: [dsa.bits.bitwise-operators]
scope: "check, set, clear, toggle, lowest set bit, clearing the lowest set bit"

### simple
Single-bit tricks read or change one bit of a number using a mask, a number with a 1 only where you want to act. It is like flipping one light switch in a long row without touching the others. Two clever formulas also find or remove the lowest 1 bit in a single step.

### interview
- Mask for bit i: `1 << i` (use `1LL << i` for 64-bit).
- **Check**: `(x >> i) & 1`. **Set**: `x | (1 << i)`. **Clear**: `x & ~(1 << i)`. **Toggle**: `x ^ (1 << i)`.
- **Lowest set bit**: `x & -x` (two's complement: `-x = ~x + 1` flips everything above the lowest 1).
- **Clear the lowest set bit**: `x & (x - 1)`; used to count bits and test powers of two.
- **Power of two**: `x > 0 && (x & (x - 1)) == 0`.
- **Keep the low k bits**: `x & ((1 << k) - 1)`.

### deep
#### Intuition

Subtracting 1 from a number flips its lowest 1 bit to 0 and every 0 below it to 1, leaving the higher bits unchanged. So `x & (x - 1)` erases exactly the lowest 1. Similarly `-x = ~x + 1` has the same lowest 1 as `x` but every higher bit inverted, so `x & -x` keeps only that lowest 1.

#### Worked example: x = 44 = 101100

| expression | bits | value |
|---|---|---|
| x | 101100 | 44 |
| x − 1 | 101011 | 43 |
| x & (x − 1) | 101000 | 40 (lowest 1 cleared) |
| −x (two's complement, low bits) | …010100 | |
| x & −x | 000100 | 4 (lowest 1 isolated) |
| x \| (1 << 0) | 101101 | 45 (bit 0 set) |
| x ^ (1 << 3) | 100100 | 36 (bit 3 toggled) |

#### Code

```cpp
bool getBit(long long x, int i) { return (x >> i) & 1; }
long long setBit(long long x, int i) { return x | (1LL << i); }
long long clearBit(long long x, int i) { return x & ~(1LL << i); }
long long toggleBit(long long x, int i) { return x ^ (1LL << i); }
long long lowestSetBit(long long x) { return x & -x; }
long long clearLowest(long long x) { return x & (x - 1); }
bool isPowerOfTwo(long long x) { return x > 0 && (x & (x - 1)) == 0; }

// Index of the lowest set bit (x != 0): count trailing zeros.
int lowestIndex(unsigned long long x) { return __builtin_ctzll(x); }
```

```python
def bits_set(x):
    """Indices of the set bits of a non-negative int, lowest first."""
    out = []
    while x:
        low = x & -x                 # isolate the lowest set bit
        out.append(low.bit_length() - 1)
        x &= x - 1                   # clear it
    return out

def is_power_of_four(n):
    return n > 0 and n & (n - 1) == 0 and n & 0x55555555 != 0   # the single 1 is at an even position
```

#### Where these show up

Flags packed into one integer (a set of features, a visited set of up to 64 items) are read and changed with exactly these four operations. `x & -x` drives Fenwick trees, `x & (x - 1)` counts bits and tests powers of two, and "is bit i set" is the inner test of every bitmask DP. Memorize the four one-liners and the two lowest-bit identities; most bit problems combine them.

#### Complexity

Every operation is $O(1)$. Iterating over set bits with `x &= x - 1` takes $O(\text{number of set bits})$.

#### Edge cases and bugs

- `1 << 40` with a 32-bit `1`: use `1LL << 40`.
- `x & -x` for the most negative value (`INT_MIN`): `-x` overflows in signed arithmetic; use unsigned types.
- `isPowerOfTwo(0)` must be false; hence `x > 0`.
- Python's `0x55555555` covers 32 bits; larger inputs need a wider mask.

#### Variants

- Fenwick trees use `i & -i` to jump between responsible ranges.
- Iterating set bits of a mask (used in bitmask DP).
- Next higher number with the same number of set bits (Gosper's hack).

Connects to: bitwise operators, counting set bits, Fenwick tree, bitmask enumeration.

### questions
Q: How do you check, set, clear and toggle bit i of x?
A: Check with (x >> i) & 1, set with x | (1 << i), clear with x & ~(1 << i), and toggle with x ^ (1 << i). Use a 64-bit one (1LL) when i can be 31 or more.

Q: Why does x & (x − 1) clear the lowest set bit?
A: Subtracting 1 turns the lowest 1 into 0 and all the 0s below it into 1s, while higher bits stay the same. ANDing with the original keeps the higher bits and clears everything from the lowest 1 downward, which removes exactly that one bit.

Q: How do you test whether a number is a power of two?
A: A power of two has exactly one set bit, so clearing the lowest set bit leaves zero: x > 0 and (x & (x − 1)) == 0.

Q: What does x & −x give, and where is it used?
A: The value of the lowest set bit of x (for 12, which is 1100, it gives 4). Fenwick trees use it to find the size of the range each index covers.

Q: How do you check whether a number is a power of four?
A: It must be a power of two, and its single set bit must be at an even position, which you test by ANDing with 0x55555555 (binary 0101…01) and checking the result is non-zero.

## dsa.bits.xor-tricks
name: "XOR tricks"
importance: must
pattern: true
prereqs: [dsa.bits.bitwise-operators]
scope: "single number, missing number, swapping without a temporary"

### simple
XOR has a magic property: XOR-ing a number with itself gives zero, so pairs of equal numbers cancel out. If every number in a list appears twice except one, XOR-ing them all leaves exactly the odd one out, like matching socks from a pile until one lonely sock remains. The same cancelling trick finds missing numbers without extra memory.

### interview
- Properties: `x ^ x = 0`, `x ^ 0 = x`, commutative and associative, so order doesn't matter and pairs cancel.
- **Single number** (others appear twice): XOR all elements. O(n), O(1).
- **Missing number** in 0..n: XOR all indices 0..n and all values; the missing one survives.
- **Two numbers appear once**: XOR all gives `a ^ b`; pick a set bit (`diff & -diff`), split elements by that bit, XOR each group.
- **Others appear three times**: count each bit's ones mod 3 (or the ones/twos state machine).
- **Swap without a temporary**: `a ^= b; b ^= a; a ^= b` (breaks if a and b are the same variable). Mostly a curiosity; use `swap`.

### deep
#### Intuition

XOR is addition without carries (mod 2 per bit). Adding the same number twice returns to where you started, and the order of additions doesn't matter. So XOR over a multiset keeps exactly the bits contributed by elements that appear an odd number of times.

#### Worked example: single number in `4 1 2 1 2`

| step | running XOR (binary) | value |
|---|---|---|
| start | 000 | 0 |
| ^4 | 100 | 4 |
| ^1 | 101 | 5 |
| ^2 | 111 | 7 |
| ^1 | 110 | 6 |
| ^2 | 100 | 4 |

The 1s and 2s cancel; **4** remains.

#### Worked example: two single numbers in `1 2 1 3 2 5`

XOR of all = `3 ^ 5 = 011 ^ 101 = 110`. The lowest set bit is `010`: 3 has it, 5 doesn't. Group with the bit: 2, 3, 2 → XOR = 3. Group without: 1, 1, 5 → XOR = 5. Answer: 3 and 5.

#### Code

```cpp
int singleNumber(const vector<int>& a) {
    int x = 0;
    for (int v : a) x ^= v;                     // pairs cancel
    return x;
}

int missingNumber(const vector<int>& a) {       // values 0..n with one missing
    int x = a.size();                           // include n itself
    for (int i = 0; i < (int)a.size(); i++) x ^= i ^ a[i];
    return x;
}

pair<int, int> twoSingles(const vector<int>& a) {
    unsigned int diff = 0;
    for (int v : a) diff ^= v;                  // = p ^ q
    unsigned int bit = diff & -diff;            // a bit where p and q differ
    int p = 0, q = 0;
    for (int v : a) {
        if (v & bit) p ^= v;                    // group containing one of them
        else q ^= v;                            // group containing the other
    }
    return {p, q};
}
```

```python
def single_number_thrice(nums):
    """Every number appears three times except one; bitwise state machine."""
    ones = twos = 0
    for x in nums:
        ones = (ones ^ x) & ~twos       # bits seen 1 time (mod 3)
        twos = (twos ^ x) & ~ones       # bits seen 2 times (mod 3)
    return ones

def xor_range(a, b):
    """XOR of all integers from a to b (inclusive), using the period-4 pattern of 0^1^...^n."""
    def upto(n):
        return [n, 1, n + 1, 0][n % 4] if n >= 0 else 0
    return upto(b) ^ upto(a - 1)
```

#### Complexity

$O(n)$ time, $O(1)$ space for all of these.

#### Edge cases and bugs

- Negative numbers work with XOR; in Python, the "three times" machine works for negatives too because Python ints behave like infinite two's complement.
- `diff & -diff` with `diff = INT_MIN` overflows for signed ints; use unsigned.
- XOR swap on the same memory location zeroes it.

#### Variants

- Find the duplicate and the missing number (set mismatch): XOR plus the split trick.
- Decode an XOR-encoded array, XOR queries on subarrays (prefix XOR).
- Maximum XOR pair (bitwise trie).
- XOR of all numbers from 1 to n has period 4: n, 1, n + 1, 0.

Connects to: bitwise operators, prefix XOR, bitwise trie, cyclic sort.

### questions
Q: How do you find the one number that appears once when every other appears twice?
A: XOR all the numbers. Equal pairs cancel because x ^ x = 0, and XOR is commutative and associative, so only the single number remains. It's O(n) time and O(1) space.

Q: How do you find the missing number in an array containing 0 to n with one value missing?
A: XOR every index from 0 to n together with every value in the array. Each present value cancels with its matching index, leaving the missing value. Summing and subtracting from n(n + 1)/2 also works but can overflow in some languages.

Q: How do you find two numbers that each appear once when all others appear twice?
A: XOR everything to get a ^ b, which is non-zero. Pick any set bit of it (for example the lowest, diff & −diff); a and b differ at that bit. Split all numbers by that bit and XOR each group separately; the groups yield a and b.

Q: How can you swap two variables with XOR, and why is it rarely used?
A: a ^= b; b ^= a; a ^= b swaps them without a temporary. It fails if both refer to the same memory location (the value becomes 0), it's harder to read, and modern compilers make ordinary swaps just as fast.

Q: How do you find the number that appears once when every other appears three times?
A: Count, for each bit position, how many numbers have that bit set, modulo 3; the remaining bits form the answer. The ones/twos state machine does the same in O(1) extra space with bitwise operations.

### signals
- every element appears twice (or an even number of times) except one or two
- find a missing or extra number with O(1) extra space
- pairs of equal values should cancel each other
- XOR of ranges or of subarrays

### template
```cpp
// XOR accumulation: elements with even counts cancel, odd counts survive.
int xorOfAll(const vector<int>& a) {
    int acc = 0;
    for (int v : a) acc ^= v;
    return acc;
}

// Split by a distinguishing bit when two values survive.
pair<int, int> splitByBit(const vector<int>& a) {
    unsigned int both = 0;
    for (int v : a) both ^= v;
    unsigned int bit = both & -both;             // lowest differing bit
    int x = 0, y = 0;
    for (int v : a) ((v & bit) ? x : y) ^= v;
    return {x, y};
}
```

## dsa.bits.counting-set-bits
name: "Counting set bits"
importance: important
prereqs: [dsa.bits.single-bit-tricks]
scope: "popcount, Brian Kernighan's method, DP counting bits"

### simple
Counting set bits means counting how many 1s appear in a number's binary form, called its popcount. The quick trick is to repeatedly erase the lowest 1 until the number becomes zero, counting the erasures. To get counts for every number up to n, reuse earlier answers: a number has the same count as itself shifted right, plus its last bit.

### interview
- Built-ins: C++ `__builtin_popcount` / `__builtin_popcountll` / C++20 `std::popcount`, Java `Integer.bitCount`, Python `int.bit_count()` (3.10+) or `bin(x).count("1")`.
- **Brian Kernighan**: `while (x) { x &= x - 1; count++; }`: O(number of set bits).
- **Counting bits for 0..n** in O(n): `bits[i] = bits[i >> 1] + (i & 1)`, or `bits[i] = bits[i & (i - 1)] + 1`.
- **Hamming distance** = popcount(a ^ b). **Total Hamming distance** over pairs: per bit, ones × zeros.
- Parity: popcount mod 2 (or XOR-fold the bits).

### questions
Q: How does Brian Kernighan's method count set bits?
A: Repeatedly clear the lowest set bit with x &= x − 1 and count how many times you do it before x becomes 0. The loop runs once per set bit, which is faster than checking all 32 or 64 positions for sparse numbers.

Q: How do you compute the number of set bits for every integer from 0 to n in O(n)?
A: Use bits[i] = bits[i >> 1] + (i & 1): shifting right drops the lowest bit, whose value is added back. Alternatively bits[i] = bits[i & (i − 1)] + 1, since clearing the lowest set bit removes exactly one 1.

Q: How do you compute the Hamming distance between two integers?
A: XOR them, which leaves 1s exactly where they differ, and count the set bits of the result.

Q: How do you compute the sum of Hamming distances over all pairs in an array efficiently?
A: For each bit position, count how many numbers have the bit set (k) and how many don't (n − k). Every such pair differs at that bit, contributing k · (n − k). Summing over 32 bits gives O(32 · n) instead of O(n²).

## dsa.bits.bitmask-enumeration
name: "Bitmask enumeration"
importance: important
pattern: true
prereqs: [dsa.bits.bitwise-operators]
scope: "iterating subsets and submasks"

### simple
With n items, every subset can be written as an n-bit number where bit i says whether item i is included. Counting from 0 to 2^n − 1 visits every subset once, like trying every combination of switches on a small control panel. You can also walk through just the subsets of a given subset with a neat decrement trick.

### interview
- **All subsets**: `for mask in 0..2ⁿ−1`, item i is in when `(mask >> i) & 1`. O(2ⁿ · n) to list them.
- **Submasks of m** (in decreasing order): `for (s = m; s > 0; s = (s - 1) & m)` plus the empty set. Over all masks m, total work is **O(3ⁿ)**.
- **All k-element subsets**: Gosper's hack (next number with the same popcount), or filter by popcount.
- Set operations: union `a | b`, intersection `a & b`, difference `a & ~b`, complement `full ^ a`, subset test `(a & b) == a`.
- Practical for n ≤ 20 (2²⁰ ≈ 10⁶); submask enumeration for n ≤ about 15 (3¹⁵ ≈ 1.4 × 10⁷).
- Uses: brute force over choices, bitmask DP states, maximum product of word lengths (letter sets as masks).

### deep
#### Intuition

A mask is a compact set: integers from 0 to $2^n - 1$ correspond one-to-one with subsets of $n$ items. Incrementing the integer walks through all subsets. For submasks, `(s - 1) & m` gives the next smaller number whose bits are all inside `m`: subtracting 1 flips the lowest set bit and the zeros below it, and ANDing with `m` discards bits outside the set.

#### Worked example: submasks of m = 1011

| s | binary |
|---|---|
| 11 | 1011 |
| (11 − 1) & 11 = 10 | 1010 |
| (10 − 1) & 11 = 9 | 1001 |
| (9 − 1) & 11 = 8 | 1000 |
| (8 − 1) & 11 = 3 | 0011 |
| (3 − 1) & 11 = 2 | 0010 |
| (2 − 1) & 11 = 1 | 0001 |
| (1 − 1) & 11 = 0 | stop (empty set handled separately) |

Seven non-empty submasks, as expected for a mask with 3 set bits ($2^3 - 1 = 7$).

#### Code

```cpp
// Largest product of lengths of two words with no common letters.
int maxProductNoCommon(const vector<string>& words) {
    int n = words.size(), best = 0;
    vector<int> mask(n, 0);
    for (int i = 0; i < n; i++)
        for (char c : words[i]) mask[i] |= 1 << (c - 'a');   // letter set as 26 bits
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if ((mask[i] & mask[j]) == 0)                      // disjoint letter sets
                best = max(best, (int)(words[i].size() * words[j].size()));
    return best;
}

// Visit every non-empty submask of m.
template <class Visit>
void forEachSubmask(int m, Visit visit) {
    for (int s = m; s > 0; s = (s - 1) & m) visit(s);
}

// Next integer with the same number of set bits (Gosper's hack), x > 0.
long long nextSamePopcount(long long x) {
    long long low = x & -x, ripple = x + low;
    return ripple | (((x ^ ripple) >> 2) / low);
}
```

```python
def subsets_with_sum(nums, target):
    """All index subsets (as masks) whose sum equals target, by brute force over masks."""
    n, found = len(nums), []
    for mask in range(1 << n):
        if sum(nums[i] for i in range(n) if mask >> i & 1) == target:
            found.append(mask)
    return found

def k_subsets(n, k):
    """All masks of n bits with exactly k ones, in increasing order."""
    if k == 0:
        return [0]
    out, x = [], (1 << k) - 1
    while x < 1 << n:
        out.append(x)
        low = x & -x
        ripple = x + low
        x = ripple | (((x ^ ripple) >> 2) // low)
    return out
```

#### Why submask enumeration over all masks is O(3ⁿ)

Each item is, relative to a pair (mask, submask), in one of three states: outside the mask, in the mask but not the submask, or in both. So the number of (mask, submask) pairs is $3^n$.

#### Complexity

All subsets: $O(2^n)$ masks, $O(n)$ to decode each. Submasks of one mask with $k$ bits: $O(2^k)$. Over all masks: $O(3^n)$.

#### Edge cases and bugs

- The empty submask: the loop `s > 0` skips it; handle it separately if needed.
- `1 << n` overflows for n ≥ 31 in 32-bit ints.
- Decoding every mask with an inner loop over n bits when an incremental update (adding or removing one element) would be cheaper.

#### Variants

- Sum over subsets (SOS DP): `for bit: for mask: if mask has bit: f[mask] += f[mask ^ bit]`: O(2ⁿ · n).
- Bitmask DP (TSP, assignment), meet in the middle (enumerate halves).
- Represent small sets of letters, colors or features as masks for fast comparison.

Connects to: subsets (backtracking), bitmask DP, meet in the middle, single-bit tricks.

### questions
Q: How do you iterate over every subset of n items with bitmasks?
A: Loop mask from 0 to 2^n − 1; item i is in the subset when bit i of mask is set. This visits each of the 2^n subsets exactly once and is practical for n up to about 20.

Q: How do you iterate over all submasks of a mask m?
A: Start with s = m and repeatedly set s = (s − 1) & m until s becomes 0, then handle the empty set separately if needed. Each step produces the next smaller subset of m's bits.

Q: Why is iterating submasks of every mask O(3^n) rather than O(4^n)?
A: Each item is either outside the mask, inside the mask but outside the submask, or inside both: three possibilities per item, so there are 3^n (mask, submask) pairs in total.

Q: How can bitmasks speed up "maximum product of word lengths with no common letters"?
A: Encode each word's set of letters as a 26-bit mask. Two words share no letters exactly when their masks AND to zero, a single operation, so checking all pairs is O(n² + total letters).

Q: What is Gosper's hack used for?
A: Generating all n-bit masks with exactly k set bits in increasing order: from x, it computes the next larger integer with the same popcount in O(1) using the lowest set bit and a ripple carry.

### signals
- n up to about 20 and a need to try every subset of items
- sets of small items (letters, colors, cities) compared or combined quickly
- iterate over all subsets of a given subset
- a state that records which items are used

### template
```cpp
// Enumerate subsets as masks; decode membership with bit tests.
template <class Visit>
void forEachSubset(int n, Visit visit) {
    for (int mask = 0; mask < (1 << n); mask++) {
        // for (int i = 0; i < n; i++) if (mask >> i & 1) { item i is chosen }
        visit(mask);
    }
}
// Submasks of m (non-empty): for (int s = m; s; s = (s - 1) & m) { ... }
```

## dsa.bits.arithmetic-with-bits
name: "Arithmetic with bits"
importance: important
prereqs: [dsa.bits.bitwise-operators]
scope: "add without plus, divide two integers, power of two checks"

### simple
Basic arithmetic can be rebuilt from bit operations, which is how hardware does it. Adding two numbers is XOR for the digits that don't carry, plus AND shifted left for the carries, repeated until no carry is left. Division can be done by subtracting shifted copies of the divisor, like long division in base two.

### interview
- **Add without +**: `while (b) { carry = (a & b) << 1; a ^= b; b = carry; }`. In C++ use unsigned to avoid signed overflow in the shift; in Python mask to 32 bits and convert back.
- **Subtract**: `a + (~b + 1)`.
- **Divide two integers** without `*`, `/`, `%`: work with absolute values in 64 bits; for bit k from high to low, if `(divisor << k) <= remaining`, subtract it and add `1 << k` to the quotient. O(32). Handle the overflow case `INT_MIN / -1`.
- **Multiply** by shifts and adds (Russian peasant): add `a << i` for each set bit i of b.
- Powers of two: `x & (x - 1) == 0`; multiply or divide by 2ᵏ with shifts; `x % 2ᵏ == x & (2ᵏ − 1)` for non-negative x.

### questions
Q: How do you add two integers without using + or −?
A: XOR gives the sum without carries, and (a & b) << 1 gives the carries. Replace a with the XOR and b with the carries, and repeat until the carry is zero. Use unsigned arithmetic in C++, or 32-bit masks in Python, so negative numbers work.

Q: How do you divide two integers using only shifts and subtraction?
A: Take absolute values in a 64-bit type. For each bit position from high to low, if the divisor shifted left by k fits into what remains of the dividend, subtract it and set bit k of the quotient. Apply the sign at the end and clamp the one overflowing case, INT_MIN / −1.

Q: Why is INT_MIN / −1 special?
A: The true result, 2^31, doesn't fit in a signed 32-bit int (the maximum is 2^31 − 1). Problems usually say to return INT_MAX in that case, and in C++ performing the division directly is undefined behavior.

Q: How do you compute x mod 2^k with bits?
A: For non-negative x, x & ((1 << k) − 1) keeps the low k bits, which is exactly the remainder when dividing by 2^k.

## dsa.bits.meet-in-the-middle
name: "Meet in the middle"
importance: advanced
prereqs: [dsa.bits.bitmask-enumeration]
scope: "splitting subsets of size up to 40"

### simple
When trying every subset of 40 items is far too slow, split the items into two halves of 20. List every subset sum of each half (about a million each), sort one list, and for each sum in the other list, search for the partner that completes the target. It is like two search parties starting from opposite ends of a tunnel and meeting in the middle.

### interview
- Split n items into halves A and B; enumerate all 2^(n/2) subset values of each.
- Combine: sort one side, then binary search or two pointers for each value on the other side.
- **O(2^(n/2) · n)** instead of O(2ⁿ): n = 40 goes from 10¹² to about 10⁶ · 40.
- Uses: subset sum closest to a target, count subsets with sum ≤ k, 4Sum-count style problems (pairs of arrays), partition array into two arrays to minimize the sum difference (group by subset size).
- Memory: two lists of 2^(n/2) values (tens of megabytes for n = 40).

### questions
Q: What is meet in the middle, and when is it useful?
A: Split the input into two halves, solve each half by brute force, and combine the results with sorting and searching. It's useful for exhaustive search over subsets when n is around 30 to 40, too large for 2^n but fine for 2^(n/2).

Q: How do you find the subset sum closest to a target with n = 40?
A: Enumerate all subset sums of each half of 20 items. Sort the second list. For each sum s in the first list, binary search the second list for the values closest to target − s. That's O(2^20 · 20) instead of O(2^40).

Q: How do you combine the two halves when counting subsets with sum at most K?
A: Sort both lists of half-sums and use two pointers: for each sum from the first list in increasing order, move a pointer down the second list to the largest value that keeps the total at most K, and add the number of values up to it.

Q: How does 4Sum II (four arrays) use the same idea?
A: Count all sums of pairs from the first two arrays in a hash map, then, for each pair from the last two arrays, look up how many first-half sums equal the negation. That's O(n²) instead of O(n⁴).
