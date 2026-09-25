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

### simple
A string is an array of characters, and each character is stored as a number. A C++ string can be edited in place, but writing `s = s + c` still builds a whole new copy each time, like rewriting a page instead of fixing one word. Knowing this helps you avoid slow code that copies the same text over and over.

### interview
- Characters are numbers: `'a'` is 97, `'A'` is 65, `'0'` is 48. `c - 'a'` gives a letter's index 0 to 25; `c - '0'` gives a digit's value.
- `std::string` is **mutable**: `s += c` and `push_back` are amortized O(1), but `s = s + c` builds a new string every time, **O(n²)** over a loop.
- Comparing, hashing and taking substrings cost **O(length)**, not O(1); `substr` copies (a `string_view` does not).
- ASCII has 128 characters (7 bits). **Unicode** assigns code points; UTF-8 encodes them in 1 to 4 bytes, so byte length can differ from character count. A C++ `char` is one byte, so `s.size()` counts bytes, not characters, in UTF-8 text.
- Ask about the character set: lowercase only (array of 26), ASCII (128 or 256), or full Unicode (hash map).

### deep
#### Intuition

A string behaves like an array of small integers with extra rules. Most string problems reduce to array techniques (two pointers, sliding windows, counting), so the new things to master are the costs hidden in string operations and the character arithmetic that turns letters into indices.

#### Character arithmetic

| Expression | Meaning |
|---|---|
| `c - 'a'` | index 0 to 25 of a lowercase letter |
| `char('a' + i)` | the i-th lowercase letter |
| `c - '0'` | digit value |
| `c ^ 32` | toggles ASCII letter case |
| `isalnum`, `isdigit`, `tolower` | classification (pass an `unsigned char`) |

#### Building strings efficiently

```cpp
// C++ strings are mutable: += and push_back are amortized O(1).
string buildCsv(const vector<int>& values) {
    string out;
    for (int i = 0; i < (int)values.size(); i++) {
        if (i) out += ',';
        out += to_string(values[i]);
    }
    return out;
}

// Caesar shift using character arithmetic (lowercase letters only).
string shift(const string& s, int k) {
    string out = s;
    for (char& c : out) c = 'a' + (c - 'a' + k % 26 + 26) % 26;
    return out;
}
```

Call `out.reserve(n)` when you know the final size to avoid reallocations; `ostringstream` helps when formatting many numbers.

#### Hidden costs

| Operation | Cost |
|---|---|
| `s[i]` | $O(1)$ (bytes or code units) |
| `s == t`, `hash<string>{}(s)` | $O(L)$ |
| `s.substr(i, k)` | $O(k)$: it copies |
| `s + t` | $O(|s| + |t|)$ |
| `s.find(t)` | typically $O(|s| \cdot |t|)$ worst case |
| sorting $n$ strings | $O(n \log n)$ comparisons, each up to $O(L)$ |

A hash map keyed by strings of length $L$ therefore costs $O(L)$ per operation, not $O(1)$; say so when the strings are long.

#### Unicode in a sentence or two

Code points go up to U+10FFFF. UTF-8 stores ASCII in one byte and other characters in 2 to 4 bytes, so `s.size()` counts bytes, and reversing a UTF-8 string byte by byte scrambles every multi-byte character (and emoji can span several code points). `std::string` itself knows nothing about encodings. In interviews, ask whether input is ASCII; usually it is.

#### Edge cases and bugs

- Empty strings and single characters.
- Mixed case and non-letters when a problem says "ignore case and punctuation".
- In C++, `char` may be signed: cast to `unsigned char` before using it as an index or calling `isalpha`.
- `s.size() - 1` is a huge unsigned number when `s` is empty in C++.

#### Variants

String problems usually reuse: two pointers (palindromes, reversal), counting (anagrams), sliding windows (substrings with constraints), hashing (grouping), stacks (brackets, decoding), DP (edit distance, LCS), and tries (prefix queries).

Connects to: arrays, anagrams and character counts, parsing strings, rolling hash.

### questions
Q: Why is s = s + c in a loop slow in C++, while s += c is fast?
A: s + c creates a new temporary string holding a full copy of s, which is then assigned back, so n steps copy 1 + 2 + … + n characters, O(n²). s += c appends in place and capacity grows geometrically, so n appends cost O(n) in total.

Q: How do you convert a lowercase letter to an index from 0 to 25 and back?
A: Subtract the code of 'a': c − 'a' gives 0 for 'a' through 25 for 'z'. To go back, add the index to 'a' and cast to char, as in char('a' + i).

Q: What is the cost of comparing two strings or using them as hash map keys?
A: O(L) for strings of length L, because every character may need to be read. Hash map operations with string keys are O(L) on average, not O(1), which matters for long keys.

Q: What is the difference between ASCII, Unicode and UTF-8?
A: ASCII is a 128-character set using 7 bits. Unicode assigns a code point to every character in every script. UTF-8 is an encoding of Unicode that uses 1 byte for ASCII characters and 2 to 4 bytes for others, so the byte length may exceed the character count.

Q: Why should you cast char to unsigned char before indexing an array in C++?
A: char may be signed, so bytes above 127 become negative numbers and would index before the array's start. Casting to unsigned char maps them to 128 to 255.

## dsa.strings.palindromes
name: "Palindromes"
importance: must
pattern: true
prereqs: [dsa.strings.string-basics]
scope: "two-pointer checks, expand around center"

### simple
A palindrome reads the same forwards and backwards, like "level" or "racecar". To check one, put a finger on each end and move them toward the middle, comparing as you go. To find palindromes inside a longer text, start from each middle point and spread outward while both sides still match.

### interview
- **Check**: two pointers from both ends, **O(n)** time, O(1) space; skip non-alphanumerics and compare lowercase if asked.
- **Expand around center**: every palindrome has a center, either a character (odd length) or a gap between two (even length): **2n − 1 centers**.
- Longest palindromic substring: expand from each center, **O(n²)** time, O(1) space. Manacher's algorithm is O(n).
- Count palindromic substrings: sum the number of successful expansions over all centers, O(n²).
- Valid palindrome with at most one deletion: on the first mismatch, try skipping the left or the right character.
- Palindromic **subsequences** (not contiguous) need DP instead.

### deep
#### Intuition

A palindrome is symmetric around its center. If `s[l..r]` is a palindrome and `s[l-1] == s[r+1]`, then `s[l-1..r+1]` is one too. So starting from a center and expanding outward finds every palindrome with that center, stopping at the first mismatch. Trying all centers finds all palindromic substrings.

#### Worked example: longest palindromic substring of "babad"

| center | type | expansion | longest found |
|---|---|---|---|
| 0 (b) | odd | "b" | b |
| gap 0-1 | even | b ≠ a | |
| 1 (a) | odd | "a" → "bab" → stop (edge) | bab |
| gap 1-2 | even | a ≠ b | |
| 2 (b) | odd | "b" → "aba" → b ≠ d | aba (same length) |
| 3 (a) | odd | "a" → b ≠ d | |
| 4 (d) | odd | "d" | |

Answer: "bab" (or "aba", also length 3).

#### Code

```cpp
// Returns {start, length} of the longest palindromic substring.
pair<int, int> longestPalindrome(const string& s) {
    int n = s.size(), bestStart = 0, bestLen = n ? 1 : 0;
    auto expand = [&](int l, int r) {
        while (l >= 0 && r < n && s[l] == s[r]) { l--; r++; }
        int len = r - l - 1;                    // the loop overshoots by one on each side
        if (len > bestLen) { bestLen = len; bestStart = l + 1; }
    };
    for (int c = 0; c < n; c++) {
        expand(c, c);                           // odd length, center at c
        expand(c, c + 1);                       // even length, center between c and c + 1
    }
    return {bestStart, bestLen};
}

bool isPalindromeIgnoringCase(const string& s) {
    int l = 0, r = (int)s.size() - 1;
    while (l < r) {
        if (!isalnum((unsigned char)s[l])) l++;
        else if (!isalnum((unsigned char)s[r])) r--;
        else if (tolower((unsigned char)s[l++]) != tolower((unsigned char)s[r--])) return false;
    }
    return true;
}
```

#### Complexity

Checking: $O(n)$. Expanding from $2n - 1$ centers: each expansion is at most $O(n)$, so $O(n^2)$ worst case (a string of one repeated letter), $O(1)$ extra space. That beats the $O(n^2)$ time and space of the DP table `isPal[i][j]`.

#### Edge cases and bugs

- Forgetting even-length palindromes ("abba" has no single middle character).
- The length after expansion is `r - l - 1`, because both pointers stepped one past the palindrome.
- Empty string: return "" and avoid `bestLen = 1`.

#### Variants

- Palindrome partitioning (backtracking with a palindrome check or precomputed table).
- Shortest palindrome by adding characters in front: KMP prefix function on `s + '#' + reverse(s)`.
- Palindrome pairs among a list of words: hash map of reversed words plus prefix and suffix checks.
- Longest palindromic subsequence: interval DP, $O(n^2)$.
- Palindrome number without converting to a string: reverse half the digits.

Connects to: opposite-ends pointers, Manacher's algorithm, palindromic DP, KMP.

### questions
Q: How do you find the longest palindromic substring without extra space?
A: Treat each character and each gap between characters as a center, and expand outward while the two sides match. There are 2n − 1 centers and each expansion is at most O(n), giving O(n²) time and O(1) space.

Q: Why must you expand from gaps as well as characters?
A: Even-length palindromes such as "abba" are centered between two characters. Expanding only from characters finds odd-length palindromes and misses them.

Q: How do you count all palindromic substrings?
A: Expand around each of the 2n − 1 centers and add one for every successful expansion step, since each step reveals a new palindrome with that center. That is O(n²) time and O(1) space.

Q: How do you check whether a string can be a palindrome after deleting at most one character?
A: Move two pointers inward while the characters match. At the first mismatch, check whether skipping the left character or skipping the right one leaves a palindrome. It is O(n), since the extra check runs only once.

Q: When is a palindrome problem a DP problem instead?
A: When it asks about subsequences (characters not necessarily adjacent), such as the longest palindromic subsequence or minimum insertions to make a palindrome. Those need a table over ranges i..j.

### signals
- a substring or word that reads the same forwards and backwards
- longest or count of palindromic substrings (contiguous)
- "at most one deletion" or "ignore non-alphanumeric characters" palindrome checks
- symmetry around a center in a string or a number

### template
```cpp
// Expand around every center (2n - 1 of them); visit each palindrome [l, r] found.
template <class Visit>
void forEachPalindrome(const string& s, Visit visit) {
    int n = s.size();
    for (int center = 0; center < 2 * n - 1; center++) {
        int l = center / 2, r = l + center % 2;     // odd centers, then gaps
        while (l >= 0 && r < n && s[l] == s[r]) {
            visit(l, r);                            // s[l..r] is a palindrome
            l--;
            r++;
        }
    }
}
```

## dsa.strings.anagrams-and-character-counts
name: "Anagrams and character counts"
importance: must
prereqs: [dsa.strings.string-basics]
scope: "fixed-size count arrays"

### simple
Two words are anagrams when they use exactly the same letters the same number of times, like "listen" and "silent". A fixed-size count array is a row of 26 tally boxes, one per letter. Filling the boxes for each word and comparing them answers many letter questions in one pass.

### interview
- For lowercase letters, `int count[26]`; ASCII uses 128 or 256. Faster and smaller than a hash map, and comparing two arrays is O(26), effectively O(1).
- Anagram check: increment for one string, decrement for the other, all zero at the end (and equal lengths). **O(n)** time, **O(1)** space.
- The count array (or a string made from it) is a **canonical key** for grouping anagrams in O(L) per word.
- Can `a` be built from the letters of `b` (ransom note)? Count `b`, spend on `a`, fail on a negative.
- Sliding version: keep a count array for a window to find anagram occurrences in O(n).
- For Unicode or unknown alphabets, fall back to a hash map.

### deep
#### Intuition

Anagram questions ignore order and care only about how many of each character there are, which is exactly what a count array records. Because the alphabet is small and fixed, the array has constant size, so all these checks cost linear time and constant space.

#### Worked example: is "anagram" an anagram of "nagaram"?

| letter | +1 for "anagram" | −1 for "nagaram" | final |
|---|---|---|---|
| a | 3 | 3 | 0 |
| g | 1 | 1 | 0 |
| m | 1 | 1 | 0 |
| n | 1 | 1 | 0 |
| r | 1 | 1 | 0 |

All zero: they are anagrams.

#### Code

```cpp
bool isAnagram(const string& s, const string& t) {
    if (s.size() != t.size()) return false;
    int count[26] = {};
    for (int i = 0; i < (int)s.size(); i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}

bool canConstruct(const string& note, const string& magazine) {
    int count[26] = {};
    for (char c : magazine) count[c - 'a']++;
    for (char c : note) if (--count[c - 'a'] < 0) return false;  // letter ran out
    return true;
}

// Minimum steps to make t an anagram of s (same length): letters t must change.
int minStepsToAnagram(const string& s, const string& t) {
    int count[26] = {}, steps = 0;
    for (char c : s) count[c - 'a']++;
    for (char c : t) count[c - 'a']--;
    for (int c : count) if (c > 0) steps += c;               // letters s has and t lacks
    return steps;
}
```

#### Complexity

$O(n)$ time for strings of length $n$, $O(\sigma)$ space for an alphabet of size $\sigma$ (26, so $O(1)$). Sorting both strings and comparing also works in $O(n \log n)$.

#### Array or hash map?

| | `int[26]` | hash map |
|---|---|---|
| Speed | direct indexing | hashing per character |
| Space | fixed | grows with distinct characters |
| Input | known small alphabet | any characters |
| Comparing two tallies | 26 steps | O(distinct) plus hashing |

#### Edge cases and bugs

- Different lengths can't be anagrams; check first.
- Uppercase, spaces or punctuation: normalize or widen the array.
- Indexing with `c - 'a'` on a character outside `a` to `z` writes out of bounds.

#### Variants

- Find all anagram start positions in a text (fixed window with counts).
- Group anagrams, group shifted strings (key = differences between consecutive letters).
- Check whether two strings are "close" (same set of letters and the same multiset of counts).
- Minimum deletions to make character frequencies unique (count, then greedily lower duplicates).

Connects to: frequency counting, fixed-size window, string basics.

### questions
Q: How do you check whether two lowercase strings are anagrams in O(n) time and O(1) space?
A: If the lengths differ, they aren't. Otherwise use an array of 26 counters: add one for each letter of the first string and subtract one for each letter of the second. They are anagrams exactly when every counter ends at zero.

Q: Why is a 26-element array considered O(1) space?
A: Its size is fixed by the alphabet, not by the input length. Whether the strings have 10 or 10 million characters, the array stays at 26 integers.

Q: How can you tell whether one string can be built from the letters of another?
A: Count the letters of the source string, then walk the target and decrement each letter's count. If any count goes negative, a letter ran out and the answer is no.

Q: What key would you use to group anagrams, and what does it cost?
A: A tuple or string of the 26 letter counts, which takes O(L) to build for a word of length L. Sorting the letters also works as a key but costs O(L log L).

## dsa.strings.parsing-strings
name: "Parsing strings"
importance: important
prereqs: [dsa.strings.string-basics]
scope: "tokenizing, atoi rules, signs and spaces"

### simple
Parsing means reading text one character at a time and turning it into meaningful pieces, such as words or numbers. It is like reading a handwritten receipt: skip the spaces, notice a minus sign, then collect digits until something that isn't a digit appears. Careful rules for each step keep odd inputs from breaking your code.

### interview
- Walk with an index `i` and a small set of states: skip whitespace, read an optional sign, read digits, stop at anything else.
- **String to integer (atoi)** rules: skip leading spaces, optional `+`/`-`, digits until a non-digit, and clamp to the 32-bit range. Check overflow **before** multiplying: `val > (INT_MAX - d) / 10`.
- Tokenizing: `stringstream >> word` splits on any run of whitespace, while `getline(ss, token, ' ')` splits on every single space and yields empty tokens for repeated spaces.
- Parse numbers digit by digit: `val = val * 10 + (c - '0')`.
- Validating a number (decimal points, exponents) is a small state machine; list the valid transitions first.
- Always test: empty string, only spaces, lone sign, leading zeros, overflow, trailing junk.

### questions
Q: What rules does a typical atoi implementation follow?
A: Skip leading whitespace, read one optional sign, then read consecutive digits and stop at the first non-digit. If no digits were read, return 0. If the value exceeds the 32-bit range, clamp it to INT_MAX or INT_MIN.

Q: How do you detect integer overflow while parsing digits?
A: Before computing val · 10 + d, check whether val > (INT_MAX − d) / 10; if so, the result would overflow, so clamp. Alternatively accumulate in a 64-bit integer and stop once it passes the 32-bit limit.

Q: How do you split a string into words when there may be several spaces between them?
A: Skip spaces, then collect characters until the next space, and repeat; or use a tokenizer that ignores empty tokens, such as reading words from a stringstream with >>. Splitting on each single space character, as getline with ' ' does, produces empty strings for repeated spaces.

Q: How would you validate whether a string is a valid decimal number?
A: Write a small state machine or ordered checks: optional sign, digits with at most one decimal point (at least one digit overall), then optionally e or E followed by an optional sign and at least one digit, and nothing else. Test edge cases such as ".", "1.", ".5", "e5" and "1e".

## dsa.strings.classic-string-manipulation
name: "Classic string manipulation"
importance: important
scope: "reverse words, longest common prefix, isomorphic strings, Roman numerals"

### simple
A handful of string tasks appear again and again in interviews, and each has a neat trick. Reversing the words of a sentence, finding the start shared by several words, checking whether two words follow the same letter pattern, and converting Roman numerals all come down to careful loops. Knowing the tricks lets you spend interview time on edge cases instead.

### interview
- **Reverse words**: split, reverse, join (O(n)); in place: reverse the whole string, then reverse each word, then clean up extra spaces.
- **Longest common prefix**: compare column by column across all strings until a mismatch or the shortest ends, O(total characters). Or sort and compare only the first and last strings.
- **Isomorphic strings**: a one-to-one mapping in **both** directions (two maps, or map each string to its "first occurrence" pattern).
- **Roman to integer**: add each value, but subtract it when it is smaller than the next symbol (IV, IX, XL, XC, CD, CM).
- **Integer to Roman**: greedy over the 13 values from 1000 down to 1 (including 900, 400, 90, 40, 9, 4).
- Also common: string compression (run-length encoding), zigzag conversion, count and say.

### questions
Q: How do you reverse the order of words in a string in place?
A: Reverse the entire string, then reverse each word individually, which restores each word's letters while keeping the new word order. Finally remove extra spaces with a write pointer. It is O(n) time and O(1) extra space where strings are mutable.

Q: How do you find the longest common prefix of a list of strings?
A: Compare the strings character by character at each position, stopping at the first position where any string differs or ends. An alternative is to sort the list and compare only the first and last strings, since they differ the most.

Q: Why do isomorphic strings need two maps?
A: Each character in s must map to exactly one character in t, and no two characters in s may map to the same character in t. With one map, "ab" and "cc" would pass, because a→c and b→c are consistent in one direction but not one-to-one.

Q: How do you convert a Roman numeral to an integer?
A: Scan from left to right, adding each symbol's value, except when a symbol is smaller than the one after it, in which case subtract it. For example, in XIV the I precedes V, so the total is 10 − 1 + 5 = 14.

## dsa.strings.big-number-arithmetic-on-strings
name: "Big-number arithmetic on strings"
importance: important
scope: "add and multiply strings"

### simple
When numbers are too big for any integer type, you can store them as strings of digits and do arithmetic the way you learned in school. Addition walks from the rightmost digits, adding and carrying. Multiplication multiplies each pair of digits and adds each product into the right column.

### interview
- **Add strings**: pointers at both ends, `sum = d1 + d2 + carry`, append `sum % 10`, carry `sum / 10`; continue while either pointer or the carry remains; reverse at the end. **O(max(n, m))**.
- **Multiply strings**: result array of size `n + m`; digit `i` of a times digit `j` of b adds to position `i + j + 1`, carrying into `i + j`. **O(n · m)**. Strip leading zeros; return "0" for zero.
- Same idea: add binary strings (base 2), add linked-list numbers, plus one on a digit array.
- Keep digits reversed while computing, reverse once at the end.
- Faster multiplication exists (Karatsuba O(n^1.585), FFT O(n log n)) but is rarely expected.

### questions
Q: How do you add two non-negative numbers given as strings?
A: Walk both strings from the end with a carry. At each step add the two digits (0 if a string has run out) and the carry, append the last digit of the sum, and keep the tens digit as the carry. When both strings and the carry are exhausted, reverse the collected digits.

Q: In string multiplication, where does the product of a[i] and b[j] go?
A: Into position i + j + 1 of a result array of length n + m, with its carry going to position i + j. The array holds every possible column, since the product of an n-digit and an m-digit number has at most n + m digits.

Q: What edge cases matter for multiply strings?
A: A zero operand, which must give "0" rather than a string of zeros, and leading zeros in the result array, which must be stripped. Also make sure carries propagate fully.

Q: How does "add binary" differ from adding decimal strings?
A: Only the base changes: digits are 0 or 1, the sum is at most 3, the output digit is sum % 2 and the carry is sum / 2. The loop is otherwise identical.
