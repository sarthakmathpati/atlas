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

### simple
A stack is a pile where you can only add or remove at the top, like a stack of plates: the last plate you put down is the first one you pick up. That rule is called last in, first out. It is exactly what you need whenever the most recent unfinished thing must be handled first, such as undo or matching brackets.

### interview
- **LIFO**: `push`, `pop`, `top`/`peek`, `empty`, all **O(1)** (amortized for a dynamic array).
- Implementations: dynamic array (push and pop at the end; cache-friendly) or linked list (push and pop at the head).
- Library: `std::stack` (an adapter over `deque` by default) or a `vector` with `push_back`, `back` and `pop_back`.
- Real uses: function call stack, undo and redo, browser back button, DFS, parsing nested structure, backtracking.
- Signals: **nesting** (brackets, tags, directories), "most recent unmatched", reversing order, and processing an element once all later ones that affect it are known.
- Always check `empty()` before `top()` or `pop()`.

### deep
#### Intuition

Whenever work is **nested**, the thing opened last must be closed first. A stack records the open things in order, and its top is always the innermost one. That is why parsers, recursion and undo systems all use stacks.

#### Implementations

```cpp
// Array-backed stack: push and pop at the end of a vector, O(1) amortized.
class IntStack {
    vector<int> data;
public:
    void push(int x) { data.push_back(x); }
    void pop() { data.pop_back(); }            // caller checks empty() first
    int top() const { return data.back(); }
    bool empty() const { return data.empty(); }
    int size() const { return data.size(); }
};

// Reverse the words of a sentence with a stack (the last word pushed comes out first).
string reverseWords(const string& s) {
    stringstream in(s);
    stack<string> st;
    string word, out;
    while (in >> word) st.push(word);
    while (!st.empty()) {
        out += st.top();
        st.pop();
        if (!st.empty()) out += ' ';
    }
    return out;
}
```

#### Worked example: undo

| action | text | history (top on the right) |
|---|---|---|
| type "Hi" | Hi | "" |
| type " you" | Hi you | "", "Hi" |
| undo | Hi | "" |
| undo | (empty) | |

Undo always restores the most recent saved state, which is the top of the stack.

#### The call stack

Each function call pushes a frame (arguments, local variables, return address); returning pops it. Deep recursion overflows this stack. Converting recursion to iteration means managing your own stack of "what is left to do", which lives on the heap and can grow much larger.

#### Complexity

Push, pop and top are $O(1)$ (amortized $O(1)$ for dynamic arrays because of occasional resizing). Space is $O(n)$ for $n$ stored elements.

#### When a stack is the wrong tool

A stack only exposes its top. If you need the oldest item, use a queue; if you need the smallest or largest item regardless of arrival order, use a heap; if you need to look up arbitrary items, use a hash map or an ordered set. A useful test in interviews: say out loud which item must be processed next. If the answer is always "the most recent one still waiting", a stack fits.

#### Edge cases and bugs

- Popping or reading the top of an empty stack: undefined behavior (`std::stack::top` and `pop` on an empty stack); check `empty()` first.
- Keeping the reference from `top()` and then calling `pop()` leaves a dangling reference; copy the value first.
- Storing indices instead of values when you later need positions (monotonic stack problems).

#### Variants

- Min stack (track the minimum alongside each element), max-frequency stack.
- Two stacks for undo and redo; two stacks to build a queue.
- Monotonic stack for next greater element problems.

Connects to: bracket matching, expression evaluation, monotonic stack, DFS, recursion to iteration.

### questions
Q: What does LIFO mean, and what operations does a stack support?
A: Last in, first out: the most recently added element is the first removed. A stack supports push (add on top), pop (remove the top) and top or peek (read it), plus an emptiness check, all in O(1).

Q: How would you implement a stack, and what are the trade-offs?
A: With a dynamic array, pushing and popping at the end is O(1) amortized and cache-friendly. With a singly linked list, pushing and popping at the head is O(1) worst case but uses extra memory per node and scatters data in memory.

Q: Give real-world uses of stacks.
A: The function call stack, undo in editors, the back button in browsers, matching brackets and HTML tags, evaluating expressions, and depth-first search. All of them handle the most recent unfinished item first.

Q: What is the signal that a problem needs a stack?
A: Nested structure or "most recent unmatched" logic: brackets, nested encodings like 3[a2[c]], directory paths with "..", or needing the nearest previous element that satisfies a condition. Reversal is another hint.

Q: Why does std::stack::pop return nothing instead of the removed element?
A: Returning the element by value could throw while copying it after it had already been removed, losing it for good. Splitting the job into top(), which returns a reference, and pop(), which removes, keeps the operation exception-safe, so read top() before calling pop().

## dsa.stacks-queues.queue-and-deque-basics
name: "Queue and deque basics"
importance: must
scope: "FIFO, circular buffer, deque operations"

### simple
A queue is a line where people join at the back and leave from the front, so the first to arrive is the first served. A deque, a double-ended queue, lets you add and remove at both ends, like a line where people can also cut in at the front or leave from the back. Queues keep things in arrival order, which is exactly what breadth-first search needs.

### interview
- **FIFO**: `push`/`enqueue` at the back, `pop`/`dequeue` at the front, `front`: all **O(1)**.
- **Circular buffer**: a fixed array with `head` and `size` (or head and tail); the back index is `(head + size) % capacity`, so no shifting is needed.
- **Deque**: push and pop at both ends in O(1) with `std::deque`.
- Don't use a `vector` as a queue by erasing its front: `erase(begin())` is O(n). Use `std::queue`, `std::deque`, or a vector with a head index.
- Uses: BFS, task scheduling, buffering streams, rate limiters (sliding time window), and the monotonic deque.
- A **priority queue** is not FIFO: it serves the smallest (or largest) key first (a heap).

### deep
#### Intuition

A queue preserves arrival order. Processing items in that order is what makes BFS explore a graph level by level and what makes a printer or task runner fair. A deque adds the ability to work at both ends, which lets it serve as a stack, a queue, or a sliding window that shrinks from the front and grows at the back.

#### Circular buffer

A queue in a plain array would need shifting every time the front is removed. A circular buffer keeps a `head` index that moves forward and wraps around.

Capacity 4:

| operation | array | head | size |
|---|---|---|---|
| push 1, 2, 3 | 1 2 3 _ | 0 | 3 |
| pop → 1 | _ 2 3 _ | 1 | 2 |
| push 4, 5 | 5 2 3 4 | 1 | 4 |
| pop → 2 | 5 _ 3 4 | 2 | 3 |

The value 5 was written at index `(1 + 3) % 4 = 0`, wrapping around.

#### Code

```cpp
class CircularQueue {
    vector<int> buf;
    int head = 0, count = 0;
public:
    explicit CircularQueue(int capacity) : buf(capacity) {}
    bool push(int x) {
        if (count == (int)buf.size()) return false;           // full
        buf[(head + count) % buf.size()] = x;
        count++;
        return true;
    }
    bool pop() {
        if (count == 0) return false;                           // empty
        head = (head + 1) % buf.size();
        count--;
        return true;
    }
    int front() const { return buf[head]; }
    int back() const { return buf[(head + count - 1) % buf.size()]; }
    bool empty() const { return count == 0; }
};
```

#### Deque operations

| operation | `std::deque` | `std::queue` |
|---|---|---|
| add | `push_back`, `push_front` | `push` (at the back) |
| remove | `pop_back`, `pop_front` | `pop` (from the front) |
| read | `back`, `front`, `dq[i]` | `front`, `back` |

#### Complexity

All queue and deque end operations are $O(1)$. `std::deque` also allows $O(1)$ random access by index, which a linked list cannot offer.

#### Edge cases and bugs

- Full versus empty in a circular buffer: with only `head` and `tail` indices both look like `head == tail`; keep a `count` (or leave one slot unused).
- Modulo of a negative index when moving `head` backwards: use `(head - 1 + cap) % cap`.
- Erasing from the front of a `vector` to simulate a queue makes BFS quadratic on large graphs.

#### Variants

Circular deque design, monotonic deque (sliding window maximum), 0-1 BFS (push weight-0 edges to the front), multi-level queues in schedulers.

Connects to: BFS, monotonic deque, circular queue and deque design, sliding window.

### questions
Q: What is the difference between a stack and a queue?
A: A stack is last in, first out: you add and remove at the same end. A queue is first in, first out: you add at the back and remove from the front. Stacks suit nested or most-recent-first work; queues suit processing in arrival order, such as BFS.

Q: How does a circular buffer implement a queue in a fixed array?
A: It keeps the index of the front element and the current size. New elements go to (head + size) mod capacity and removing advances head by one mod capacity, so nothing ever shifts and every operation is O(1).

Q: Why shouldn't you use a vector as a queue by erasing its front?
A: vector::erase at the front shifts every remaining element, costing O(n), so a BFS over n nodes becomes O(n²). std::queue, which uses a deque underneath, pops the front in O(1).

Q: What is a deque, and where is it useful?
A: A double-ended queue that supports O(1) insertion and removal at both ends. It can act as a stack or a queue, and it powers the monotonic deque for sliding window maximums and 0-1 BFS, where zero-weight edges go to the front.

Q: How do you tell a full circular buffer from an empty one?
A: If you store only head and tail indices, both states have head == tail. Either keep an explicit count of elements, or leave one slot unused so that "full" means (tail + 1) mod capacity == head.

## dsa.stacks-queues.bracket-matching
name: "Bracket matching"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.stack-basics]
scope: "valid parentheses, longest valid parentheses"

### simple
To check brackets like "([{}])", you keep a stack of the brackets that are still open. Each closing bracket must match the most recently opened one, like closing nested boxes from the inside out. If a closer doesn't match, or brackets are left open at the end, the string is invalid.

### interview
- Push opening brackets; on a closing bracket, the stack must be non-empty and its top must be the matching opener; pop it. Valid iff the stack is empty at the end. **O(n)** time and space.
- Only one bracket type: a counter is enough (never negative, zero at the end).
- **Longest valid parentheses**: stack of **indices** seeded with −1; push `(` indices; on `)` pop, then if empty push the current index as a new base, else the length is `i - top`. O(n).
- Two-pass counter alternative for longest valid: left-to-right and right-to-left with open/close counts, O(1) space.
- **Minimum removals** or **minimum additions** to make valid: count unmatched openers and closers.
- With wildcards (`*` as `(`, `)` or empty): track the range [low, high] of possible open counts.

### deep
#### Intuition

In a valid string, brackets are properly nested: every closer closes the most recent opener that is still open. A stack's top is exactly "the most recent still-open thing", so each closer is checked against the top and removes it.

#### Worked example: "{[()]}("

| i | char | action | stack (top right) |
|---|---|---|---|
| 0 | { | push | { |
| 1 | [ | push | { [ |
| 2 | ( | push | { [ ( |
| 3 | ) | matches ( → pop | { [ |
| 4 | ] | matches [ → pop | { |
| 5 | } | matches { → pop | (empty) |
| 6 | ( | push | ( |

The stack isn't empty at the end: invalid (an unclosed `(`).

#### Code

```cpp
bool isValid(const string& s) {
    vector<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push_back(c);
        } else {
            char need = c == ')' ? '(' : c == ']' ? '[' : '{';
            if (st.empty() || st.back() != need) return false;  // wrong or missing opener
            st.pop_back();
        }
    }
    return st.empty();                                           // nothing left open
}

int longestValidParentheses(const string& s) {
    vector<int> st = {-1};                 // index before the current valid run
    int best = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        if (s[i] == '(') st.push_back(i);
        else {
            st.pop_back();
            if (st.empty()) st.push_back(i);                    // unmatched ')' is a new base
            else best = max(best, i - st.back());
        }
    }
    return best;
}
```

#### Why the −1 base works

The stack bottom always holds the index just before the current run of valid characters. After popping a match, `i - st.back()` is the length of the valid substring ending at `i`. An unmatched `)` can't be part of any valid substring, so it becomes the new base.

#### Complexity

Each character is pushed and popped at most once: $O(n)$ time, $O(n)$ space ($O(1)$ with counters for single-type problems).

#### Edge cases and bugs

- Empty string is valid.
- A closer on an empty stack: check emptiness before reading the top.
- Starting with a closer, or ending with openers: both invalid.

#### Variants

- Remove the minimum number of invalid parentheses (BFS over removals, or two passes with counters to build one answer).
- Score of parentheses, maximum nesting depth (a counter).
- Validate HTML or XML tags (stack of tag names).
- Generate all valid combinations (backtracking with open and close counts).

Connects to: stack basics, expression evaluation, stack-based string processing, generate parentheses (backtracking).

### questions
Q: How do you check whether a string of brackets is valid?
A: Scan left to right with a stack. Push every opener; for every closer, check that the stack is non-empty and its top is the matching opener, then pop. The string is valid if no check fails and the stack is empty at the end. O(n) time and space.

Q: When is a counter enough instead of a stack?
A: When there is only one type of bracket. Increase for "(" and decrease for ")"; the string is valid if the counter never goes negative and ends at zero. With several types you need the stack to know which opener is most recent.

Q: How do you find the length of the longest valid parentheses substring?
A: Keep a stack of indices seeded with −1. Push the index of each "(". For ")", pop; if the stack becomes empty, push the current index as the new base, otherwise the valid length ending here is i minus the new top. Track the maximum.

Q: How many characters must be added to make a parentheses string valid?
A: Scan with a count of open brackets. A ")" with no open bracket needs an added "(", so count it; otherwise close one open bracket. At the end, every remaining open bracket needs a ")". The answer is the sum of both counts.

Q: How do you handle a wildcard that can be "(", ")" or empty?
A: Track the lowest and highest possible number of open brackets. "(" raises both, ")" lowers both, "*" lowers the low end and raises the high end. Fail if the high end goes negative, clamp the low end at zero, and succeed if zero is reachable at the end.

### signals
- brackets, parentheses or tags that must be properly nested
- "valid parentheses" or the longest valid substring of them
- minimum insertions or removals to balance brackets
- matching each closing element with the most recent open one

### template
```cpp
// Match closers against the most recent unmatched opener.
bool balanced(const string& s, const string& open = "([{", const string& close = ")]}") {
    vector<char> st;
    for (char c : s) {
        size_t o = open.find(c), k = close.find(c);
        if (o != string::npos) st.push_back(c);                 // opener: remember it
        else if (k != string::npos) {                           // closer: must match the top
            if (st.empty() || st.back() != open[k]) return false;
            st.pop_back();
        }                                                       // other characters: ignore
    }
    return st.empty();
}
```

## dsa.stacks-queues.expression-evaluation
name: "Expression evaluation"
importance: must
pattern: true
prereqs: [dsa.stacks-queues.bracket-matching]
scope: "postfix evaluation, infix with precedence, basic calculator"

### simple
Evaluating an expression like "3 + 4 * 2" means respecting the rule that multiplication happens before addition, and that brackets happen first. Stacks let a program hold numbers and pending operators until it knows it is safe to apply them, like a cashier who waits for the whole order before totaling a discount. Postfix notation, where operators come after their numbers, is the easiest form: one stack is enough.

### interview
- **Postfix (RPN)**: push numbers; on an operator, pop `b` then `a`, push `a op b`. O(n). Order matters for `-` and `/`.
- **Infix without parentheses** (`+ - * /`): keep the last operator; push `+num`/`-num`, and apply `*` and `/` to the top immediately; sum the stack at the end. O(n).
- **Infix with `+ -` and parentheses**: running `result` and `sign`; on `(` push the current result and sign, start fresh; on `)` pop and combine.
- **General infix** (precedence and parentheses): two stacks, numbers and operators; before pushing an operator, apply operators on the stack with **higher or equal** precedence (left associativity). This is Dijkstra's shunting-yard idea.
- Watch multi-digit numbers, spaces, unary minus (`-(2+3)`, `-5`), and integer division rounding toward zero.

### deep
#### Intuition

In "3 + 4 * 2", when you read `+` you can't apply it yet, because the next operator might bind tighter. So you hold it. When a lower- or equal-precedence operator (or the end) arrives, everything held that binds at least as tightly can be applied. Parentheses act as a wall: nothing inside is applied across them until the `)` closes them.

#### Worked example: "3 + 4 * 2 - 6 / 3" with two stacks

| token | action | numbers | operators |
|---|---|---|---|
| 3 | push | 3 | |
| + | push | 3 | + |
| 4 | push | 3 4 | + |
| * | `*` binds tighter than `+`: push | 3 4 | + * |
| 2 | push | 3 4 2 | + * |
| - | apply `*` (4·2=8), apply `+` (3+8=11), push `-` | 11 | - |
| 6 | push | 11 6 | - |
| / | push | 11 6 | - / |
| 3 | push | 11 6 3 | - / |
| end | apply `/` (6/3=2), apply `-` (11−2=9) | 9 | |

#### Code

```cpp
// Full infix evaluator: + - * /, parentheses, spaces, multi-digit and unary minus.
long long evaluate(const string& s) {
    vector<long long> nums;
    vector<char> ops;
    // 'u' is unary minus: it binds tighter than * and /, and applies to one operand.
    auto prec = [](char op) { return op == 'u' ? 3 : (op == '*' || op == '/') ? 2 : 1; };
    auto applyTop = [&]() {
        char op = ops.back(); ops.pop_back();
        long long b = nums.back(); nums.pop_back();
        if (op == 'u') { nums.push_back(-b); return; }
        long long a = nums.back(); nums.pop_back();
        nums.push_back(op == '+' ? a + b : op == '-' ? a - b : op == '*' ? a * b : a / b);
    };
    bool expectOperand = true;                  // true at the start and after '(' or an operator
    for (int i = 0; i < (int)s.size(); i++) {
        char c = s[i];
        if (c == ' ') continue;
        if (isdigit((unsigned char)c)) {
            long long v = 0;
            while (i < (int)s.size() && isdigit((unsigned char)s[i])) v = v * 10 + (s[i++] - '0');
            i--;
            nums.push_back(v);
            expectOperand = false;
        } else if (c == '(') {
            ops.push_back(c);
            expectOperand = true;
        } else if (c == ')') {
            while (ops.back() != '(') applyTop();
            ops.pop_back();                     // discard '('
            expectOperand = false;
        } else {                                // operator
            if (expectOperand) {                // a sign where an operand should start
                if (c == '-') ops.push_back('u');   // unary minus; unary plus is ignored
                continue;
            }
            while (!ops.empty() && ops.back() != '(' && prec(ops.back()) >= prec(c)) applyTop();
            ops.push_back(c);
            expectOperand = true;
        }
    }
    while (!ops.empty()) applyTop();
    return nums.back();
}
```

#### Complexity

Each token is pushed and popped at most once: $O(n)$ time, $O(n)$ space for the stacks.

#### Edge cases and bugs

- Operand order in RPN: pop `b` first, then `a`, and compute `a - b`.
- C++ integer division truncates toward zero (−7 / 2 is −3), which is what these problems usually expect; the remainder then takes the dividend's sign.
- Unary minus at the start, after `(` or after another operator: a separate unary operator with the highest precedence handles `10 / -2 * 3` correctly; the `0 - x` shortcut does not.
- Right-associative operators such as `^`: apply only strictly higher precedence before pushing.

#### Variants

- Convert infix to postfix (shunting-yard output queue), build an expression tree.
- Basic calculator III (all of the above), decode strings with nested repetition.
- Evaluate boolean expressions, parse nested lists (a stack of containers).

Connects to: bracket matching, stack basics, recursion (recursive descent parsing), trees (expression trees).

### questions
Q: How do you evaluate a postfix (reverse Polish) expression?
A: Scan tokens left to right. Push numbers; for an operator, pop the right operand, then the left one, apply the operator and push the result. The single value left on the stack is the answer, in O(n).

Q: How do you evaluate "3 + 5 * 2 − 4" without parentheses in one pass?
A: Keep the previous operator and a stack. When a number ends, push it for +, push its negative for −, or combine it with the top for * and /. At the end, sum the stack. Multiplication and division are applied immediately, which gives them precedence.

Q: How does the two-stack method handle precedence and parentheses?
A: Push numbers onto one stack and operators onto another. Before pushing an operator, apply all stacked operators of higher or equal precedence (stopping at a "("). On ")", apply operators until the matching "(" and discard it. At the end, apply everything left.

Q: How do you handle unary minus?
A: Detect a minus where an operand is expected: at the start, after "(" or after another operator. Treat it as a separate unary operator that binds tighter than * and / and negates one operand, or keep a sign variable that multiplies the next number or parenthesized group. Rewriting it as 0 − x only works when nothing binds tighter around it: 10 / −2 * 3 would go wrong.

Q: How does C++ integer division round negative results?
A: It truncates toward zero, so −7 / 2 is −3 and −7 % 2 is −1, and (a / b) * b + a % b == a always holds. Floor division, which would give −4, needs an adjustment when the signs differ and the remainder is not zero.

### signals
- evaluate an arithmetic string with operators and parentheses
- reverse Polish (postfix) notation
- operator precedence ("multiplication before addition")
- build a calculator or parse a formula

### template
```cpp
// Two-stack infix evaluation skeleton (binary + - * /, parentheses).
long long evalInfix(const vector<string>& tokens) {
    vector<long long> nums;
    vector<char> ops;
    auto prec = [](char o) { return o == '*' || o == '/' ? 2 : 1; };
    auto apply = [&] {
        long long b = nums.back(); nums.pop_back();
        long long a = nums.back(); nums.pop_back();
        char o = ops.back(); ops.pop_back();
        nums.push_back(o == '+' ? a + b : o == '-' ? a - b : o == '*' ? a * b : a / b);
    };
    for (const string& t : tokens) {
        if (t == "(") ops.push_back('(');
        else if (t == ")") { while (ops.back() != '(') apply(); ops.pop_back(); }
        else if (t == "+" || t == "-" || t == "*" || t == "/") {
            while (!ops.empty() && ops.back() != '(' && prec(ops.back()) >= prec(t[0])) apply();
            ops.push_back(t[0]);                       // wait until precedence is known
        } else nums.push_back(stoll(t));               // a number
    }
    while (!ops.empty()) apply();
    return nums.back();
}
```

## dsa.stacks-queues.stack-based-string-processing
name: "Stack-based string processing"
importance: important
pattern: true
prereqs: [dsa.stacks-queues.stack-basics]
scope: "decode string, simplify path, adjacent duplicates, asteroid collision"

### simple
Many string puzzles are easiest when you build the answer on a stack and let each new character interact with the top. Removing adjacent duplicate letters is like a game where two equal tiles side by side disappear, possibly letting new neighbors meet. Nested patterns such as "3[ab]" work the same way: open a new level on the stack, and fold it back when the bracket closes.

### interview
- **Adjacent duplicates**: push characters; if the new one equals the top, pop instead. Result = the stack. O(n). With a count (remove k equal in a row): store (char, count) pairs.
- **Decode string** (`3[a2[c]]` → `accaccacc`): stack of (previous string, repeat count); on `[` push and reset; on `]` pop and append `current` repeated.
- **Simplify path**: split by `/`; skip empty and `.`; `..` pops if possible; otherwise push; join with `/`.
- **Asteroid collision**: push right-movers; a left-mover destroys smaller right-movers on top, dies against larger, both die if equal.
- **Backspace compare**: stack, or scan from the right with a skip counter in O(1) space.
- All O(n) time; the stack is the answer being built.

### deep
#### Intuition

When each new element may cancel, merge with, or be absorbed by the **most recent surviving** element, a stack is the natural structure: its top is always that most recent survivor. Cancellations can cascade (removing a pair exposes a new top), which a single pass with a stack handles for free.

#### Worked example: decode "3[a2[c]]"

| char | action | stack of (prefix, k) | current | number |
|---|---|---|---|---|
| 3 | read digit | | "" | 3 |
| [ | push ("", 3), reset | ("",3) | "" | 0 |
| a | append | ("",3) | "a" | 0 |
| 2 | read digit | ("",3) | "a" | 2 |
| [ | push ("a", 2), reset | ("",3) ("a",2) | "" | 0 |
| c | append | … | "c" | 0 |
| ] | pop ("a",2): "a" + "c"×2 | ("",3) | "acc" | 0 |
| ] | pop ("",3): "" + "acc"×3 | | "accaccacc" | 0 |

#### Code

```cpp
string decodeString(const string& s) {
    vector<pair<string, int>> st;              // (string before '[', repeat count)
    string cur;
    int k = 0;
    for (char c : s) {
        if (isdigit((unsigned char)c)) k = k * 10 + (c - '0');
        else if (c == '[') { st.push_back({cur, k}); cur.clear(); k = 0; }
        else if (c == ']') {
            auto [prefix, times] = st.back();
            st.pop_back();
            string repeated;
            for (int i = 0; i < times; i++) repeated += cur;
            cur = prefix + repeated;
        } else cur += c;
    }
    return cur;
}

vector<int> asteroidCollision(const vector<int>& a) {
    vector<int> st;
    for (int x : a) {
        bool alive = true;
        while (alive && x < 0 && !st.empty() && st.back() > 0) {
            if (st.back() < -x) st.pop_back();          // the right-mover explodes; keep going
            else {
                if (st.back() == -x) st.pop_back();     // both explode
                alive = false;                          // x explodes
            }
        }
        if (alive) st.push_back(x);
    }
    return st;
}
```

#### Complexity

Every character or token is pushed and popped at most once: $O(n)$ time and $O(n)$ space, plus the output size for decode string (which can be exponential in the nesting depth).

#### Edge cases and bugs

- Multi-digit repeat counts (`12[a]`).
- Decode strings with letters after a bracket closes (`2[a]bc`).
- Simplify path: `".."` at the root stays at the root; repeated slashes produce empty parts.
- Asteroids moving apart (left-mover before right-mover) never collide.

#### Variants

- Remove all adjacent duplicates in a string (k = 2), make the string great (remove adjacent opposite-case letters).
- Validate stack sequences (simulate pushes and pops).
- Build the smallest string with a greedy stack (remove k digits), which is the greedy stack pattern.

Connects to: stack basics, bracket matching, greedy stack, expression evaluation.

### questions
Q: How do you repeatedly remove adjacent equal characters from a string?
A: Scan characters with a stack. If the current character equals the top, pop (the pair cancels); otherwise push. Cascading removals happen naturally because each pop exposes the previous survivor. The remaining stack is the answer, in O(n).

Q: How do you decode a string like "3[a2[c]]"?
A: Keep a current string and a current number. On "[", push (current string, number) and reset both. On "]", pop (prefix, k) and set current = prefix + current repeated k times. Letters append to the current string and digits build the number.

Q: How do you simplify a Unix-style path?
A: Split on "/" and process the parts with a stack: ignore empty parts and ".", pop on ".." if the stack isn't empty, and push any other name. Join the stack with "/" and prefix a "/".

Q: How does the asteroid collision simulation work?
A: Push asteroids moving right. When one moves left, compare it with right-movers on top of the stack: smaller ones explode and are popped, an equal one destroys both, and a larger one destroys the incoming asteroid. If it survives, push it.

### signals
- adjacent elements cancel, merge or collide as you scan
- nested encodings with counts and brackets
- file paths with "." and ".."
- backspace characters or undo markers inside a string

### template
```cpp
// Build the result on a stack; each new item interacts with the most recent survivor.
string processWithStack(const string& s) {
    string st;                                  // a string works as a stack of chars
    for (char c : s) {
        if (!st.empty() && st.back() == c) {    // interaction rule: cancel, merge, compare...
            st.pop_back();                      // may expose a new top for the next item
        } else {
            st.push_back(c);
        }
    }
    return st;                                  // the survivors, in order
}
```

## dsa.stacks-queues.stack-and-queue-designs
name: "Stack and queue designs"
importance: important
scope: "min stack, queue using stacks, stack using queues"

### simple
These are small design puzzles where you build one structure out of others or add a feature without slowing it down. A min stack remembers the smallest value at every height, like writing the lowest price so far next to each receipt in a pile. A queue built from two stacks pours one stack into the other so the oldest item ends up on top.

### interview
- **Min stack**: store pairs (value, min so far), or a second stack of minimums pushed when the new value is ≤ the current min. All operations O(1).
- **Queue using two stacks**: push onto `in`; for pop or peek, if `out` is empty, move everything from `in` to `out`. Each element moves at most once: **O(1) amortized**.
- **Stack using queues**: on push, enqueue then rotate the queue so the new element is at the front (O(n) push, O(1) pop), or make pop the O(n) side.
- **Max stack** with arbitrary `popMax`: needs a balanced tree or a heap with lazy deletion (O(log n)).
- Say which operation is amortized and why.

### questions
Q: How do you implement a stack that returns its minimum in O(1)?
A: Alongside each pushed value, store the minimum of the stack at that height, either as pairs or in a second stack. The current minimum is always the top's stored minimum, and popping restores the previous minimum automatically.

Q: How do you build a queue from two stacks, and why is it O(1) amortized?
A: Push new items onto an input stack. To pop, take from an output stack; when it's empty, move all items from the input stack to it, which reverses their order so the oldest is on top. Each item is moved at most once, so n operations cost O(n) in total.

Q: How do you implement a stack with queues?
A: With one queue, push the new element and then rotate the queue by moving the other size − 1 elements from the front to the back, so the newest element is at the front. Pop and top are then O(1) and push is O(n).

Q: Why does a max stack with popMax need more than two stacks?
A: popMax removes the maximum even when it's buried in the middle, and the next maximum must then be found quickly. A balanced tree or a heap with lazy deletion (plus a doubly linked list for order) gives O(log n) per operation.
