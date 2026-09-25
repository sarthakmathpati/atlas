---
topic: dsa.string-algorithms
name: "String algorithms"
subject: dsa
order: 10
prereqs: [dsa.strings]
---

## dsa.string-algorithms.kmp-and-the-prefix-function
name: "KMP and the prefix function"
importance: important
pattern: true
scope: "longest proper prefix that is also a suffix, O(n + m) matching"

### simple
KMP searches for a pattern in a text without ever moving backwards in the text. When a match fails partway, it uses what it already matched to jump ahead, like a reader who knows that a failed "abab…" still ends in "ab", which could be the start of a new match. A small table computed from the pattern, the prefix function, records those safe jumps.

### interview
- **Prefix function** `pi[i]`: the length of the longest **proper** prefix of `s[0..i]` that is also a suffix of it. Computed in **O(m)**.
- Matching: on a mismatch after `j` matched characters, fall back to `j = pi[j - 1]` instead of restarting; the text pointer never moves back. **O(n + m)** total.
- Simple trick: compute `pi` of `pattern + '#' + text`; every position with `pi == m` ends a match.
- Other uses: the shortest period of a string (`m - pi[m-1]` if it divides m), repeated substring pattern, shortest palindrome (`s + '#' + reverse(s)`), counting prefix occurrences.
- Compared with naive search, O(n · m) worst case (for example "aaaa…ab"), KMP is linear.

### deep
#### Intuition

In naive search, after a mismatch you shift the pattern by one and re-compare characters you already saw. KMP asks: of the part that matched, what is the longest piece at its end that is also a start of the pattern? The pattern can be shifted so that piece lines up, and comparison resumes from there. That longest border is exactly the prefix function value.

#### Worked example: prefix function of "aabaaab"

| i | s[0..i] | longest proper prefix = suffix | pi[i] |
|---|---|---|---|
| 0 | a | (none) | 0 |
| 1 | aa | a | 1 |
| 2 | aab | (none) | 0 |
| 3 | aaba | a | 1 |
| 4 | aabaa | aa | 2 |
| 5 | aabaaa | aa | 2 |
| 6 | aabaaab | aab | 3 |

At i = 5 the previous border "aa" can't extend (s[2] = b ≠ a), so fall back to pi[1] = 1: border "a", and s[1] = a matches, giving 2.

#### Code

```cpp
vector<int> prefixFunction(const string& s) {
    int m = s.size();
    vector<int> pi(m, 0);
    for (int i = 1; i < m; i++) {
        int j = pi[i - 1];                         // length of the current border
        while (j > 0 && s[i] != s[j]) j = pi[j - 1];  // fall back to shorter borders
        if (s[i] == s[j]) j++;
        pi[i] = j;
    }
    return pi;
}

vector<int> kmpSearch(const string& text, const string& pat) {  // start indices of matches
    vector<int> pi = prefixFunction(pat), out;
    int m = pat.size();
    if (m == 0) return out;
    for (int i = 0, j = 0; i < (int)text.size(); i++) {
        while (j > 0 && text[i] != pat[j]) j = pi[j - 1];
        if (text[i] == pat[j]) j++;
        if (j == m) {
            out.push_back(i - m + 1);
            j = pi[j - 1];                         // keep going for overlapping matches
        }
    }
    return out;
}
```

#### Complexity

$O(n + m)$ time. The inner `while` looks quadratic, but `j` increases by at most one per step and every fallback decreases it, so total fallbacks are bounded by total increases (amortized). Space $O(m)$ for `pi`.

#### Edge cases and bugs

- "Proper" prefix: `pi[i]` never equals `i + 1`, which is why the loop starts at `i = 1`.
- After a full match, continue from `pi[m - 1]` to find overlapping matches ("aa" in "aaaa" matches at 0, 1, 2).
- The separator in the concatenation trick must not appear in either string.

#### Variants

- Repeated substring pattern: `s` is a repetition iff `p = m - pi[m-1]` satisfies `p < m` and `m % p == 0`.
- Shortest palindrome by prepending: `pi` of `s + '#' + reverse(s)` gives the longest palindromic prefix.
- Automaton version: precompute transitions for each state and character (useful in DP over strings).
- The Z-algorithm solves the same matching problems with a different array.

Connects to: rolling hash, Z-algorithm, palindromes, amortized analysis.

### questions
Q: What does the prefix function store?
A: pi[i] is the length of the longest proper prefix of s[0..i] that is also a suffix of s[0..i]. For "abab" the values are 0, 0, 1, 2.

Q: Why is KMP O(n + m) even though it has a nested while loop?
A: The matched length j grows by at most one per text character, and every fallback step shrinks it. Across the whole search, the total shrinking can't exceed the total growth, so the fallbacks add at most O(n) work, plus O(m) to build the table.

Q: How do you use the prefix function to find all occurrences of a pattern?
A: Compute the prefix function of pattern + separator + text. Every index where the value equals the pattern's length marks the end of an occurrence in the text. The separator stops borders from extending across the boundary.

Q: How can the prefix function tell whether a string is a repetition of a smaller substring?
A: Let p = m − pi[m − 1]. If p < m and m is divisible by p, the string is its first p characters repeated m / p times; otherwise it isn't a repetition.

Q: What input makes naive string search slow?
A: A text of many repeated characters and a pattern that almost matches, such as text "aaaa…a" and pattern "aaa…ab". Each alignment compares nearly the whole pattern before failing, giving O(n · m).

### signals
- find every occurrence of a pattern in a long text in linear time
- borders: a prefix of a string that is also its suffix
- is the string built by repeating a smaller piece
- shortest palindrome by adding characters in front
- overlapping matches where naive search would be O(n · m)

### template
```cpp
// Prefix function + KMP scan. pi[i] = longest proper border of pat[0..i].
vector<int> findAll(const string& text, const string& pat) {
    int m = pat.size();
    vector<int> pi(m, 0), hits;
    for (int i = 1, j = 0; i < m; i++) {               // build pi
        while (j > 0 && pat[i] != pat[j]) j = pi[j - 1];
        if (pat[i] == pat[j]) j++;
        pi[i] = j;
    }
    for (int i = 0, j = 0; i < (int)text.size() && m; i++) {  // scan the text
        while (j > 0 && text[i] != pat[j]) j = pi[j - 1];  // fall back, never move i back
        if (text[i] == pat[j]) j++;
        if (j == m) { hits.push_back(i - m + 1); j = pi[j - 1]; }
    }
    return hits;
}
```

## dsa.string-algorithms.rolling-hash-and-rabin-karp
name: "Rolling hash and Rabin-Karp"
importance: important
pattern: true
scope: "polynomial hashing, collisions, double hashing"

### simple
A rolling hash turns each window of text into a number that can be updated in one step as the window slides, like updating a running total by dropping the leftmost digit and adding a new rightmost digit. Rabin-Karp compares these numbers instead of whole substrings, so most windows are rejected instantly. When two numbers match, a quick direct check guards against rare coincidences.

### interview
- Polynomial hash: `h(s) = (s[0]·B^(k-1) + s[1]·B^(k-2) + … + s[k-1]) mod M`, with base B (such as 131 or random) and a large prime M (such as 10⁹ + 7).
- Slide: `h = (h − s[i−k]·B^(k−1))·B + s[i]`, all mod M. **O(1)** per step after precomputing `B^(k−1)`.
- Prefix hashes let you get the hash of **any** substring in O(1): `H(l, r) = pre[r] − pre[l]·B^(r−l)`.
- **Collisions** are possible: verify matches directly, or use **double hashing** (two moduli) or a 64-bit modulus like 2⁶¹ − 1 to make them negligible. Random bases defeat adversarial inputs.
- Uses: pattern matching in expected O(n + m), repeated DNA sequences, longest duplicate substring (binary search on length + hashing), comparing substrings quickly.
- Normalize negative values after subtraction: `((x % M) + M) % M`.

### deep
#### Intuition

Comparing a window of length $k$ with the pattern costs $O(k)$. If each window had a fingerprint that could be updated in $O(1)$, you could compare fingerprints first and only compare characters when fingerprints agree. Treat a string as a number in base $B$: sliding the window removes the leading digit and appends a new trailing digit, just like moving along a long decimal number.

#### Worked example (small numbers)

Base 10, modulus 13, digits as characters. Text "31415", window length 3.

| window | value | value mod 13 |
|---|---|---|
| 314 | 314 | 2 |
| 141 | (314 − 3·100)·10 + 1 = 141 | 11 |
| 415 | (141 − 1·100)·10 + 5 = 415 | 12 |

Pattern "141" has hash 11, which matches only the second window, and a direct comparison confirms it.

#### Code

```cpp
// Prefix hashes with modulus 2^61 - 1 (very low collision probability).
struct RollingHash {
    static constexpr unsigned long long MOD = (1ULL << 61) - 1;
    vector<unsigned long long> pre, pw;
    static unsigned long long mul(unsigned long long a, unsigned long long b) {
        __uint128_t p = (__uint128_t)a * b;
        unsigned long long lo = (unsigned long long)(p & MOD), hi = (unsigned long long)(p >> 61);
        unsigned long long r = lo + hi;
        return r >= MOD ? r - MOD : r;
    }
    RollingHash(const string& s, unsigned long long base) : pre(s.size() + 1, 0), pw(s.size() + 1, 1) {
        for (size_t i = 0; i < s.size(); i++) {
            pre[i + 1] = (mul(pre[i], base) + (unsigned char)s[i]) % MOD;
            pw[i + 1] = mul(pw[i], base);
        }
    }
    unsigned long long get(int l, int r) const {       // hash of s[l..r)
        return (pre[r] + MOD - mul(pre[l], pw[r - l])) % MOD;
    }
};

vector<int> rabinKarp(const string& text, const string& pat) {
    vector<int> out;
    int n = text.size(), m = pat.size();
    if (m == 0 || m > n) return out;
    unsigned long long base = 911382323;               // pick randomly to resist attacks
    RollingHash ht(text, base), hp(pat, base);
    for (int i = 0; i + m <= n; i++)
        if (ht.get(i, i + m) == hp.get(0, m) && text.compare(i, m, pat) == 0)
            out.push_back(i);                          // verify to rule out collisions
    return out;
}
```

#### Complexity

Expected $O(n + m)$ with verification (few false alarms); worst case $O(n \cdot m)$ if many windows collide or truly match. Prefix hashes take $O(n)$ time and space and answer any substring hash in $O(1)$.

#### Collisions

With modulus $M$, two different strings collide with probability about $1/M$ for a random base. Comparing $n$ windows gives about $n/M$ expected false matches: negligible for $M \approx 2^{61}$, but with $M = 10^9 + 7$ and $10^5$ strings compared all-pairs (birthday bound) collisions become likely. Double hashing (two independent moduli) multiplies the protection.

#### Edge cases and bugs

- Subtraction under a modulus can go negative in signed arithmetic; add $M$ before taking `%`.
- Overflow in `a * b` with 64-bit moduli: use 128-bit multiplication or a smaller modulus.
- Using a character value of 0 (for example `c - 'a'` for 'a') makes "a" and "aa" hash equally at the prefix level; use `c - 'a' + 1` or the raw code.

#### Variants

- Longest duplicate substring: binary search the length $L$; for each $L$, hash all windows and look for a repeat: $O(n \log n)$ expected.
- Repeated DNA sequences: hash every 10-letter window (or pack 2 bits per letter into an int).
- Check whether two substrings are equal in $O(1)$, and compare substrings lexicographically with binary search on the common prefix length.
- 2D rolling hash for matching a small grid inside a large grid.

Connects to: KMP, sliding window, hashing, binary search on the answer, suffix arrays.

### questions
Q: How does a rolling hash update in O(1) when the window slides?
A: Treat the window as a number in base B modulo M. Subtract the leaving character times B^(k−1), multiply by B to shift, and add the entering character, all modulo M. With B^(k−1) precomputed, that is a few arithmetic operations.

Q: Why must Rabin-Karp verify a hash match?
A: Different strings can share a hash (a collision), because many strings map into a limited range of values. Comparing characters on a match makes the result exact; with a good modulus, false matches are rare, so verification adds little time.

Q: What is double hashing and why use it?
A: Computing two hashes with different moduli (or bases) and treating the pair as the fingerprint. A false match then requires colliding in both at once, which is far less likely, so you can often skip verification safely.

Q: How do you get the hash of any substring in O(1)?
A: Precompute prefix hashes pre[i] and powers B^i. The hash of s[l..r) is pre[r] − pre[l] · B^(r−l), taken modulo M. This lets you compare arbitrary substrings in constant time.

Q: How do you find the longest substring that occurs at least twice?
A: Binary search on the length L: if a repeated substring of length L exists, one of every smaller length does too. For each L, hash every window of length L into a set and check for a repeat. Total expected time is O(n log n).

### signals
- compare many substrings or windows of the same length quickly
- find repeated substrings or the longest duplicate substring
- pattern matching where hashing is simpler than KMP
- check whether two substrings are equal in O(1) after preprocessing
- deduplicate substrings (count distinct substrings of a length)

### template
```cpp
// Rolling hash over fixed-length windows: base B, prime modulus M.
vector<long long> windowHashes(const string& s, int k, long long B = 131, long long M = 1000000007) {
    vector<long long> out;
    if (k <= 0 || k > (int)s.size()) return out;
    long long high = 1, h = 0;
    for (int i = 0; i < k - 1; i++) high = high * B % M;        // B^(k-1)
    for (int i = 0; i < (int)s.size(); i++) {
        if (i >= k) h = ((h - s[i - k] * high) % M + M) % M;  // drop the leaving char
        h = (h * B + s[i]) % M;                                // shift and add the new char
        if (i >= k - 1) out.push_back(h);                      // hash of s[i-k+1..i]
    }
    return out;  // equal hashes: probably equal strings (verify, or double hash)
}
```

## dsa.string-algorithms.z-algorithm
name: "Z-algorithm"
importance: advanced
prereqs: [dsa.string-algorithms.kmp-and-the-prefix-function]
scope: "the Z-array for pattern matching"

### simple
The Z-algorithm measures, for every position in a string, how long the text starting there matches the start of the string. It is like laying a copy of the string's opening under each position and seeing how far they agree. It reuses earlier results, so the whole array takes linear time.

### interview
- `z[i]` = length of the longest substring starting at `i` that equals a prefix of `s` (`z[0]` is usually set to 0 or n).
- Maintains a window `[l, r)`, the rightmost segment known to match a prefix; inside it, start from `min(r - i, z[i - l])` instead of 0, then extend.
- **O(n)** time: `r` only moves forward.
- Pattern matching: compute Z of `pattern + '$' + text`; positions with `z[i] == m` are matches.
- Also: string periods, counting distinct substrings incrementally, and comparisons against the prefix. Equivalent in power to the prefix function (each can be converted into the other).

### questions
Q: What does z[i] represent?
A: The length of the longest substring starting at position i that matches the beginning of the string. For "aabxaab", z[4] is 3 because "aab" at position 4 matches the prefix "aab".

Q: How does the Z-algorithm achieve linear time?
A: It keeps the rightmost interval [l, r) that matches a prefix. For a position inside it, z[i − l] gives a known lower bound, so comparison starts at min(r − i, z[i − l]) and only extends beyond r. Since r never moves left, total extension work is O(n).

Q: How do you find all occurrences of a pattern with the Z-array?
A: Build the string pattern + separator + text, where the separator appears in neither, and compute its Z-array. Every position in the text part whose z-value equals the pattern's length is the start of a match.

Q: When would you choose the Z-algorithm over KMP?
A: They solve the same matching problems in O(n + m). The Z-array is often easier to reason about for "how much of the prefix matches here" questions, while the prefix function is natural for streaming text and border-based problems.

## dsa.string-algorithms.manachers-algorithm
name: "Manacher's algorithm"
importance: advanced
prereqs: [dsa.strings.palindromes]
scope: "longest palindromic substring in O(n)"

### simple
Manacher's algorithm finds the longest palindrome in a string in linear time. It uses the fact that palindromes are mirror images: inside a big palindrome, the right half repeats what the left half already showed. So it copies known answers from the mirror side instead of expanding from scratch every time.

### interview
- Transform the string to handle even lengths uniformly: insert separators, `"abba" → "#a#b#b#a#"`; every palindrome now has odd length in the new string.
- `p[i]` = radius of the longest palindrome centered at `i` in the transformed string (equals its length in the original).
- Keep the palindrome `[c − p[c], c + p[c]]` reaching farthest right. For `i` inside it, start with `min(p[2c − i], right − i)` (the mirror's answer), then expand.
- **O(n)** time because the right edge only moves forward; O(n) space.
- Gives the longest palindromic substring and the count of palindromic substrings (sum of `(p[i] + 1) / 2`).
- Expand-around-center (O(n²)) is usually acceptable in interviews; Manacher is the follow-up answer.

### questions
Q: Why does Manacher's algorithm insert separators between characters?
A: So that every palindrome in the transformed string has odd length with a single center character. Even-length palindromes in the original, such as "abba", are centered on a separator, which lets one loop handle both cases.

Q: How does the mirror property save work?
A: If position i lies inside a palindrome centered at c, its mirror 2c − i has a known radius. Within the big palindrome, the part around i is a mirror image of the part around the mirror, so i's radius is at least min(mirror's radius, distance to the right edge), and expansion only continues past the edge.

Q: Why is Manacher's algorithm O(n)?
A: Each expansion step that succeeds pushes the rightmost known palindrome edge further right, and that edge never moves left. Across the whole run there are at most O(n) successful expansions, plus O(1) other work per position.

Q: How do you read the longest palindrome from the radii?
A: Find the index i with the largest p[i] in the transformed string. The palindrome has length p[i] in the original string and starts at original index (i − p[i]) / 2.

## dsa.string-algorithms.suffix-arrays-and-lcp
name: "Suffix arrays and LCP"
importance: advanced
scope: "what they are and what they solve"

### simple
A suffix array lists every ending piece of a string in dictionary order, stored as starting positions. It is like cutting a sentence at every letter, keeping the tail pieces, and alphabetizing them. Neighbors in that sorted list share long beginnings, which reveals repeated substrings.

### interview
- Suffix array `sa`: starting indices of all suffixes, sorted lexicographically. For "banana": `5 (a), 3 (ana), 1 (anana), 0 (banana), 4 (na), 2 (nana)`.
- **LCP array**: `lcp[i]` = longest common prefix of suffixes `sa[i]` and `sa[i-1]`; built in O(n) with **Kasai's algorithm**.
- Construction: prefix doubling in O(n log² n) or O(n log n) with radix sort; SA-IS in O(n). A naive sort of suffixes is O(n² log n).
- Solves: pattern search in O(m log n) by binary search, **longest repeated substring** (max LCP), number of **distinct substrings** (n(n+1)/2 − sum of LCP), longest common substring of two strings (concatenate with a separator).
- Suffix automata and suffix trees solve similar problems; suffix arrays are simpler and use less memory.

### questions
Q: What is a suffix array?
A: The array of starting positions of all suffixes of a string, ordered so that the suffixes are in lexicographic order. It is a compact alternative to a suffix tree for many substring problems.

Q: How do you find the longest repeated substring with a suffix array?
A: Build the suffix array and its LCP array. Any repeated substring is a common prefix of two suffixes, and the longest common prefixes occur between neighbors in sorted order, so the answer is the maximum LCP value.

Q: How do you count the distinct substrings of a string?
A: Every substring is a prefix of some suffix. Summing the lengths of all suffixes gives n(n + 1)/2 prefixes, and the prefixes shared with the previous suffix in sorted order are duplicates, so subtract the sum of the LCP array.

Q: How do you search for a pattern using a suffix array?
A: The suffixes starting with the pattern form a contiguous block in the sorted order. Binary search for the block's ends, comparing up to m characters per step, which takes O(m log n).
