---
topic: dsa.dp-strings
name: "Dynamic programming: strings"
subject: dsa
order: 31
prereqs: [dsa.dp-foundations, dsa.strings]
---

## dsa.dp-strings.longest-common-subsequence
name: "Longest common subsequence"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states]
scope: "the 2D table and reconstruction"

### simple
The longest common subsequence of two strings is the longest sequence of characters that appears in both, in the same order but not necessarily side by side. For "abcde" and "ace" it is "ace". A table compares every prefix of one string with every prefix of the other, building each answer from smaller prefixes.

### interview
- `dp[i][j]` = LCS length of `a[0..i)` and `b[0..j)`. If `a[i-1] == b[j-1]`: `dp[i-1][j-1] + 1`; else `max(dp[i-1][j], dp[i][j-1])`. Base: row 0 and column 0 are 0.
- **O(n · m)** time, O(n · m) space (O(min(n, m)) for the length only).
- **Reconstruction**: walk back from `dp[n][m]`: on a match go diagonally and record the character; otherwise move toward the larger neighbor.
- Related: minimum deletions to make two strings equal = n + m − 2·LCS; shortest common supersequence length = n + m − LCS; LCS of s and reverse(s) = longest palindromic subsequence.
- Subsequence (gaps allowed) vs substring (contiguous): longest common **substring** uses `dp = dp[i-1][j-1] + 1` on a match and **0** otherwise.

### deep
#### Intuition

Compare the last characters of the two prefixes. If they match, the best common subsequence can end with that character, and the rest is an LCS of the two shorter prefixes. If they don't match, at least one of the two last characters isn't in the LCS, so drop one or the other and take the better result.

#### Worked example: `a = "abcde"`, `b = "ace"`

| | "" | a | c | e |
|---|---|---|---|---|
| "" | 0 | 0 | 0 | 0 |
| a | 0 | 1 | 1 | 1 |
| b | 0 | 1 | 1 | 1 |
| c | 0 | 1 | 2 | 2 |
| d | 0 | 1 | 2 | 2 |
| e | 0 | 1 | 2 | 3 |

LCS length 3. Walking back from the bottom-right: e = e (diagonal), d ≠ c (move up, same value), c = c (diagonal), b ≠ a (up), a = a (diagonal): "ace".

#### Code

```cpp
string lcs(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1
                                            : max(dp[i - 1][j], dp[i][j - 1]);
    string out;                                           // walk back to rebuild one LCS
    for (int i = n, j = m; i > 0 && j > 0;) {
        if (a[i - 1] == b[j - 1]) { out += a[i - 1]; i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
        else j--;
    }
    reverse(out.begin(), out.end());
    return out;
}
```

#### Why "drop one character" covers every case

When the last characters differ, an LCS can't use both of them as its final matched pair. So at least one of them is unused: either `a[i-1]` isn't in the LCS (the answer is the LCS of `a[0..i-1)` and `b`), or `b[j-1]` isn't (the LCS of `a` and `b[0..j-1)`). Taking the maximum of the two covers both possibilities, which is why no third option, such as dropping both, is needed: dropping both is already included in either of them.

#### Complexity

$O(n \cdot m)$ time. Space $O(n \cdot m)$ with reconstruction, $O(\min(n, m))$ for the length alone.

#### Edge cases and bugs

- Off-by-one: `dp` has size `(n + 1) × (m + 1)` and compares `a[i-1]` with `b[j-1]`.
- Confusing subsequence (gaps allowed) with substring (reset to 0 on mismatch).
- Reconstruction tie-breaking can yield different but equally long answers.

#### Variants

- Shortest common supersequence (build it from the LCS table).
- Minimum ASCII delete sum (weights instead of counts).
- Uncrossed lines (it is LCS on arrays).
- Longest palindromic subsequence (LCS of s and its reverse, or interval DP).

Connects to: edit distance, designing DP states, reconstructing the answer, space optimization.

### questions
Q: What is the LCS recurrence?
A: If the last characters of the two prefixes match, dp[i][j] = dp[i − 1][j − 1] + 1. Otherwise dp[i][j] = max(dp[i − 1][j], dp[i][j − 1]), dropping the last character of one string or the other. Row 0 and column 0 are 0.

Q: How do you reconstruct the actual LCS?
A: Start at dp[n][m]. If the current characters match, add the character and move diagonally; otherwise move to the neighbor (up or left) with the larger value. Stop at the table's edge and reverse the collected characters.

Q: How is longest common substring different?
A: A substring must be contiguous, so a mismatch resets the value to 0 instead of taking the max of neighbors, and the answer is the largest value anywhere in the table, not the last cell.

Q: How can LCS answer "minimum deletions to make two strings equal"?
A: Keep the LCS and delete everything else from both strings. The number of deletions is |a| + |b| − 2 · LCS, where |a| is the length of a.

Q: What is the space-optimized complexity if you only need the length?
A: O(n · m) time and O(min(n, m)) space, keeping only the previous and current rows of the shorter dimension.

### signals
- the longest sequence common to two strings or arrays, order kept, gaps allowed
- minimum deletions or insertions to make two sequences equal
- align two sequences to maximize matches (uncrossed lines)
- compare every prefix of one sequence with every prefix of another

### template
```cpp
// Two-sequence DP over prefixes: dp[i][j] for a[0..i) and b[0..j).
int twoSequenceDp(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));   // row 0 / column 0: empty prefix
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;   // use both
            else dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);            // drop one
        }
    return dp[n][m];
}
```

## dsa.dp-strings.edit-distance
name: "Edit distance"
importance: must
pattern: true
prereqs: [dsa.dp-foundations.designing-dp-states, dsa.dp-strings.longest-common-subsequence]
scope: "insert, delete, replace transitions"

### simple
Edit distance counts the fewest single-character edits (insert, delete or replace) needed to turn one word into another. It is how a spell checker decides that "horse" is close to "ros". A table over prefixes of both words finds the answer by considering which edit fixes the last character.

### interview
- `dp[i][j]` = edits to turn `a[0..i)` into `b[0..j)`. Base: `dp[i][0] = i` (delete all), `dp[0][j] = j` (insert all).
- If `a[i-1] == b[j-1]`: `dp[i-1][j-1]`. Else `1 + min(dp[i-1][j] (delete), dp[i][j-1] (insert), dp[i-1][j-1] (replace))`.
- **O(n · m)** time; O(min(n, m)) space with one row plus a saved diagonal.
- Reconstruct the operations by walking back the table.
- Variants: only insert and delete (answer n + m − 2·LCS), different costs per operation, one edit apart check in O(n) with two pointers.
- Levenshtein distance is this; Damerau adds transpositions.

### deep
#### Intuition

Look at the last characters. If they match, no edit is needed for them. Otherwise one of three edits handles the last character of the target: replace `a`'s last character with it, insert it at the end of `a`, or delete `a`'s last character and match the rest. Each option leaves a smaller pair of prefixes.

#### Worked example: `horse` → `ros`

| | "" | r | o | s |
|---|---|---|---|---|
| "" | 0 | 1 | 2 | 3 |
| h | 1 | 1 | 2 | 3 |
| o | 2 | 2 | 1 | 2 |
| r | 3 | 2 | 2 | 2 |
| s | 4 | 3 | 3 | 2 |
| e | 5 | 4 | 4 | 3 |

Distance **3**: horse → rorse (replace h with r) → rose (delete r) → ros (delete e).

#### Code

```cpp
int editDistance(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 0; i <= n; i++) dp[i][0] = i;            // delete everything
    for (int j = 0; j <= m; j++) dp[0][j] = j;            // insert everything
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = a[i - 1] == b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + min({dp[i - 1][j],                  // delete a[i-1]
                           dp[i][j - 1],                  // insert b[j-1]
                           dp[i - 1][j - 1]});            // replace a[i-1] by b[j-1]
    return dp[n][m];
}
```

#### Reading the table

Each move through the table is an operation: a diagonal step on equal characters is free, a diagonal step on different characters is a replacement, a step down (from `dp[i-1][j]`) deletes `a[i-1]`, and a step right (from `dp[i][j-1]`) inserts `b[j-1]`. Walking back from the bottom-right corner along any path that reproduces the values lists one optimal sequence of edits, which is how spell checkers and `diff` tools show changes.

#### Complexity

$O(n \cdot m)$ time and space; $O(\min(n, m))$ space for the distance alone.

#### Edge cases and bugs

- Empty strings: the distance is the other string's length (the base cases handle it).
- Mixing up which neighbor means insert and which means delete doesn't change the distance, but it matters when reconstructing operations.
- Replacing a character with itself should cost 0 (the match case).

#### Variants

- Weighted edits (different costs for insert, delete, replace).
- Delete operation for two strings (only deletions: n + m − 2·LCS).
- Minimum ASCII delete sum, one edit distance, spelling suggestions with a bounded distance (only fill a band of the table).

Connects to: longest common subsequence, space optimization, reconstructing the answer.

### questions
Q: What is the edit distance recurrence?
A: If a[i − 1] equals b[j − 1], dp[i][j] = dp[i − 1][j − 1]. Otherwise dp[i][j] = 1 + min(dp[i − 1][j], dp[i][j − 1], dp[i − 1][j − 1]), for deleting from a, inserting into a, or replacing. The base cases are dp[i][0] = i and dp[0][j] = j.

Q: What do the base cases mean?
A: Turning a prefix of length i into the empty string takes i deletions, and turning the empty string into a prefix of length j takes j insertions.

Q: How do you check whether two strings are exactly one edit apart without the full table?
A: If their lengths differ by more than one, they aren't. Otherwise scan to the first mismatch: for equal lengths, the rest must match after skipping that character in both (a replace); for lengths differing by one, the rest of the shorter must equal the longer after skipping one character (an insert). It's O(n).

Q: How does edit distance relate to LCS when only insertions and deletions are allowed?
A: Every character outside a longest common subsequence must be deleted from one string or inserted into the other, so the distance is |a| + |b| − 2 · LCS, where |a| is the length of a.

Q: What is the space complexity if you only need the distance?
A: O(min(n, m)), using one row plus a variable for the diagonal value from the previous row, because each cell only reads the cell above, the cell to the left and the upper-left cell.

### signals
- minimum number of insertions, deletions and replacements to transform one string into another
- how similar two words are (spell check, fuzzy matching)
- aligning two sequences with a cost per mismatch or gap
- "one edit away" checks

### template
```cpp
// Edit-distance style DP: base rows cost i and j; each cell takes the cheapest last operation.
int transformCost(const string& a, const string& b, int ins = 1, int del = 1, int rep = 1) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 0; i <= n; i++) dp[i][0] = i * del;
    for (int j = 0; j <= m; j++) dp[0][j] = j * ins;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            int keep = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] : INT_MAX / 2;
            dp[i][j] = min({keep, dp[i - 1][j] + del, dp[i][j - 1] + ins, dp[i - 1][j - 1] + rep});
        }
    return dp[n][m];
}
```

## dsa.dp-strings.palindromic-dp
name: "Palindromic DP"
importance: important
prereqs: [dsa.dp-strings.edit-distance]
scope: "longest palindromic subsequence, minimum insertions, counting palindromic substrings"

### simple
Palindromic DP answers questions about palindromes hidden inside a string, such as the longest one you can form by deleting characters. It works on ranges: a range's answer comes from its two end characters and the range just inside them. If the ends match, they can wrap around the best palindrome inside; if not, one of them has to go.

### interview
- **Longest palindromic subsequence**: `dp[l][r] = dp[l+1][r-1] + 2` if `s[l] == s[r]`, else `max(dp[l+1][r], dp[l][r-1])`; `dp[i][i] = 1`. Fill by increasing length (or l from n−1 down). O(n²). Also = LCS(s, reverse(s)).
- **Minimum insertions to make a palindrome** = n − LPS (same for minimum deletions).
- **isPal[l][r]** table: `s[l] == s[r] && (r - l < 2 || isPal[l+1][r-1])`: O(n²); used for counting palindromic substrings and palindrome partitioning.
- **Count palindromic substrings**: sum of the isPal table, or expand around centers with O(1) space.
- Longest palindromic **substring**: isPal table or expand around center (Manacher for O(n)).

### questions
Q: What is the recurrence for the longest palindromic subsequence?
A: For the range l..r: if s[l] == s[r], the ends wrap the best palindrome inside, dp[l][r] = dp[l + 1][r − 1] + 2; otherwise drop one end, dp[l][r] = max(dp[l + 1][r], dp[l][r − 1]). Single characters have length 1. Fill ranges from short to long.

Q: How do you find the minimum number of insertions to make a string a palindrome?
A: Characters in a longest palindromic subsequence can stay paired; every other character needs a partner inserted on the opposite side. So the answer is n minus the length of the longest palindromic subsequence.

Q: How is the longest palindromic subsequence related to LCS?
A: It equals the LCS of the string and its reverse, since a palindromic subsequence reads the same forwards and backwards and so is common to both. That gives another O(n²) solution.

Q: How do you build a table of which substrings are palindromes?
A: s[l..r] is a palindrome if s[l] == s[r] and either the range has length at most 2 or s[l + 1..r − 1] is a palindrome. Fill l from n − 1 down to 0 so the inner range is ready. It takes O(n²) time and space.

## dsa.dp-strings.counting-subsequences
name: "Counting subsequences"
importance: important
prereqs: [dsa.dp-strings.longest-common-subsequence]
scope: "distinct subsequences"

### simple
Counting subsequences asks in how many different ways one word can be found inside another by picking letters in order. For each letter of the long word, you decide whether to use it to match the next letter of the short word or to skip it. A table over prefixes of both words adds up the ways.

### interview
- **Distinct subsequences** (ways `t` appears as a subsequence of `s`): `dp[i][j] = dp[i-1][j] + (s[i-1] == t[j-1] ? dp[i-1][j-1] : 0)`; `dp[i][0] = 1`. O(n · m).
- One row: loop j **downward** so `dp[j-1]` still refers to the previous i.
- Counts can overflow; use a modulus or 64-bit (the problem usually bounds the answer).
- **Count distinct subsequences of one string**: `dp[i] = 2·dp[i-1] − dp[last occurrence of s[i-1] − 1]` to remove duplicates.
- Is t a subsequence of s (yes or no): two pointers, O(n + m); for many queries, index lists per letter plus binary search.

### questions
Q: How do you count the ways t appears as a subsequence of s?
A: Let dp[i][j] be the number of ways the first j characters of t appear in the first i characters of s. Either s[i − 1] isn't used (dp[i − 1][j]) or, if it equals t[j − 1], it matches that character (dp[i − 1][j − 1]). dp[i][0] = 1, since the empty string appears once.

Q: Why must the one-row version loop j downward?
A: dp[j] needs dp[j − 1] from the previous row (before s[i − 1] was considered). Looping downward reads dp[j − 1] before it's updated for the current character, the same reason 0/1 knapsack loops capacities downward.

Q: How do you count the distinct subsequences of a single string?
A: Each new character doubles the count (every existing subsequence with or without it), but subsequences ending in the same character from its previous occurrence are counted twice. Subtract the count from just before that previous occurrence: dp[i] = 2 · dp[i − 1] − dp[last[c] − 1].

Q: How do you answer many "is t a subsequence of s" queries quickly?
A: Precompute, for each letter, the sorted list of positions where it occurs in s. For each query, walk through t and binary search the next position of each letter after the current one. Each query costs O(|t| log |s|).

## dsa.dp-strings.interleaving-strings
name: "Interleaving strings"
importance: important
prereqs: [dsa.dp-strings.longest-common-subsequence]
scope: "2D DP over two prefixes"

### simple
Two strings are interleaved when their letters are merged into one string while each keeps its own order, like shuffling two decks of cards together without reordering within a deck. To check whether a third string is such a merge, decide at each step whether its next letter came from the first string or the second. A table over how much of each string has been used records which splits work.

### interview
- `dp[i][j]` = can the first i chars of `s1` and first j chars of `s2` form the first i + j chars of `s3`.
- Transition: `(dp[i-1][j] && s1[i-1] == s3[i+j-1]) || (dp[i][j-1] && s2[j-1] == s3[i+j-1])`; `dp[0][0] = true`.
- Check `s1.size() + s2.size() == s3.size()` first.
- **O(n · m)** time; O(m) space with one row.
- A greedy two-pointer approach fails when both strings offer the same next character; the DP (or memoized DFS) handles the choice.

### questions
Q: What does dp[i][j] represent in the interleaving strings problem?
A: Whether s3's first i + j characters can be formed by interleaving the first i characters of s1 and the first j characters of s2, preserving each string's order. The answer is dp[len(s1)][len(s2)].

Q: What is the transition?
A: The last character of s3's prefix, s3[i + j − 1], came either from s1 (it equals s1[i − 1] and dp[i − 1][j] holds) or from s2 (it equals s2[j − 1] and dp[i][j − 1] holds). dp[i][j] is true if either case works.

Q: Why doesn't a greedy two-pointer approach work?
A: When the next character of s3 matches the next character of both s1 and s2, the right choice depends on characters much later. Greedy picks one and may fail, while the DP keeps both possibilities.

Q: What must you check before running the DP?
A: That the lengths of s1 and s2 add up to the length of s3. If not, the answer is false immediately, and the DP's indexing into s3 would also be off.

## dsa.dp-strings.pattern-matching-dp
name: "Pattern matching DP"
importance: advanced
prereqs: [dsa.dp-strings.edit-distance]
scope: "regular expression and wildcard matching"

### simple
Pattern matching DP checks whether a whole string fits a pattern with special symbols, like "?" for any one letter or "*" for any run of letters. Because a star can stand for many different lengths, the table records which prefixes of the string match which prefixes of the pattern. Each star is handled by either using it for one more letter or letting it stand for nothing.

### interview
- `dp[i][j]` = does `s[0..i)` match `p[0..j)`. Base `dp[0][0] = true`; `dp[0][j]` true only if the pattern prefix can match empty.
- **Wildcard** (`?` any char, `*` any sequence): `*`: `dp[i][j] = dp[i][j-1] (empty) || dp[i-1][j] (one more char)`; `?` or equal char: `dp[i-1][j-1]`.
- **Regex** (`.` any char, `x*` zero or more of the preceding element): `*`: `dp[i][j] = dp[i][j-2] (zero copies) || (matches(s[i-1], p[j-2]) && dp[i-1][j])`; otherwise `matches(s[i-1], p[j-1]) && dp[i-1][j-1]`.
- **O(n · m)** time; top-down memoization is often simpler to write.
- Wildcard also has a greedy two-pointer solution with backtracking to the last star (O(n · m) worst case, fast in practice).

### questions
Q: How does the DP handle "*" in wildcard matching?
A: A star can match an empty sequence, so dp[i][j] can come from dp[i][j − 1], or it can absorb one more character of the string, so dp[i][j] can come from dp[i − 1][j]. Either being true makes dp[i][j] true.

Q: How is regex "x*" different from wildcard "*"?
A: In regex, the star applies to the preceding element, meaning zero or more copies of x. So dp[i][j] is true if skipping "x*" entirely works (dp[i][j − 2]) or if s[i − 1] matches x and dp[i − 1][j] holds (one more copy).

Q: What are the base cases for regex matching?
A: dp[0][0] is true. For the empty string, dp[0][j] is true only when the pattern prefix is made of "x*" pairs, so dp[0][j] = dp[0][j − 2] when p[j − 1] is '*'. dp[i][0] is false for i > 0.

Q: What is the complexity of pattern matching DP?
A: O(n · m) time and space for a string of length n and a pattern of length m, since each cell does O(1) work. The space can be reduced to two rows.
