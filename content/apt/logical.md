---
topic: apt.logical
name: "Logical reasoning"
subject: apt
order: 2
prereqs: []
---

## apt.logical.seating-arrangements-and-puzzles
name: "Seating arrangements and puzzles"
importance: must
scope: "Seating arrangements and puzzles"

### simple
A seating puzzle gives you a handful of clues about who sits where and asks you to rebuild the whole arrangement. You solve it like fitting furniture into a room: place the pieces whose spot is fixed first, then the ones that must go next to something, and use the "not here" clues last to rule out what's left. A quick sketch on paper does most of the work.

### interview
- **Settle directions first**: in a row facing north, a person's right is your right as you look at the row from behind; facing south, it flips. At a round table facing the centre, a person's **left is the clockwise** neighbor.
- **Order the clues**: fixed positions ("in the middle", "at an end") first, then linked pairs ("immediately to the left of"), then negatives ("not next to") to eliminate.
- **Branch small**: when a clue allows two places, draw both cases side by side and carry both until one breaks.
- **Round tables** have no first seat, so fix one person anywhere; that removes the rotations ($n!$ becomes $(n - 1)!$).
- **Words matter**: "immediately to the left" is adjacent, "to the left" is anywhere on that side, "between" means adjacent to both, and "second to the left" skips one seat.
- Check the final picture against **every** clue before answering; the last clue often exists to kill one case.

### deep
#### Intuition

Each clue removes arrangements: a fixed seat removes most of them, "not at an end" only a few. Strong clues first keep the cases you carry small.

#### Worked example: a row

Seven friends A to G sit in a row of seats 1 to 7, all facing north.

1. D sits in the middle seat.
2. Exactly two people sit between A and D.
3. B sits immediately to the right of D.
4. F sits between A and B.
5. G does not sit at either end.
6. C does not sit next to D.
7. E sits immediately to the left of G.

D is in seat 4, B in 5 and A in 1 or 7; F touches both A and B, so A is in 7 and F in 6. In seats 1 to 3, G avoids seat 1 and C avoids seat 3, leaving C E G, C G E or E C G; only C E G puts E just left of G. Answer: **C E G D B F A**.

#### Worked example: a round table

P, Q, R, S, T and U sit round a table facing the centre. S sits opposite P. Q sits second to the left of P. T sits immediately to the left of S. R is not next to T.

Fix P. Clockwise (to P's left), Q is two seats on, S three, T four. R and U take the seats beside P, and R can't be beside T. Clockwise: **P R Q S T U**, so R is on P's left and U on P's right.

#### Code

The program tries every arrangement and prints how many survive each clue, in order.

```cpp
using Seats = string;  // seats[i] is the person in seat i
using Clue = function<bool(const Seats&)>;

int at(const Seats& s, char p) { return s.find(p); }
bool together(const Seats& s, char a, char b, bool round) {
    int d = abs(at(s, a) - at(s, b));
    return d == 1 || (round && d == int(s.size()) - 1);
}
// Round table, facing the centre, seats numbered clockwise: clockwise is to your left.
char leftOf(const Seats& s, char p, int k) { return s[(at(s, p) + k) % s.size()]; }

// Try every arrangement (at a round table, fix the first person); print how many survive
// each clue in turn, then the survivors.
void solve(string people, bool round, const vector<Clue>& clues) {
    vector<Seats> left;
    char first = people[0];
    sort(people.begin(), people.end());
    do
        if (!round || people[0] == first) left.push_back(people);
    while (next_permutation(people.begin(), people.end()));
    printf("%zu", left.size());
    for (auto& ok : clues) {
        erase_if(left, [&](const Seats& s) { return !ok(s); });
        printf(" -> %zu", left.size());
    }
    for (auto& s : left) printf(": %s", s.c_str());
    printf("\n");
}

int main() {
    // A row facing north: seat 0 is the far left, so a person's right is the next seat up.
    solve("ABCDEFG", false, {
        [](auto& s) { return at(s, 'D') == 3; },
        [](auto& s) { return abs(at(s, 'A') - at(s, 'D')) == 3; },
        [](auto& s) { return at(s, 'B') == at(s, 'D') + 1; },
        [](auto& s) { return together(s, 'F', 'A', false) && together(s, 'F', 'B', false); },
        [](auto& s) { return at(s, 'G') != 0 && at(s, 'G') != 6; },
        [](auto& s) { return !together(s, 'C', 'D', false); },
        [](auto& s) { return at(s, 'E') == at(s, 'G') - 1; }});
    solve("PQRSTU", true, {
        [](auto& s) { return leftOf(s, 'P', 3) == 'S'; },
        [](auto& s) { return leftOf(s, 'P', 2) == 'Q'; },
        [](auto& s) { return leftOf(s, 'S', 1) == 'T'; },
        [](auto& s) { return !together(s, 'R', 'T', true); }});
    solve("VWXYZ", false, {  // practice 1
        [](auto& s) { return at(s, 'Y') == 2; },
        [](auto& s) { return at(s, 'W') == at(s, 'Y') - 1; },
        [](auto& s) { return at(s, 'X') % 4 == 0 && !together(s, 'X', 'Z', false); },
        [](auto& s) { return at(s, 'V') > at(s, 'Z'); },
        [](auto& s) { return at(s, 'V') % 4 == 0; }});
    solve("JKLMN", true, {  // practice 2
        [](auto& s) { return leftOf(s, 'J', 1) == 'K'; },
        [](auto& s) { return !together(s, 'M', 'J', true); },
        [](auto& s) { return leftOf(s, 'L', 1) == 'M'; }});
}
```

Output:

```text
5040 -> 720 -> 240 -> 48 -> 6 -> 4 -> 3 -> 1: CEGDBFA
120 -> 24 -> 6 -> 2 -> 1: PRQSTU
120 -> 24 -> 6 -> 3 -> 2 -> 1: XWYZV
24 -> 6 -> 4 -> 1: JKLMN
```

Clue 3 cuts 240 rows to 48 while clue 6 removes one; each puzzle ends with exactly one arrangement.

#### Practice

Two minutes each; the answers are the last two output lines.

1. V, W, X, Y, Z sit in a row facing north. Y is in the middle, W immediately to Y's left. X is at an end, not next to Z. V is somewhere right of Z, and at an end. Who sits between Y and V?
2. J, K, L, M, N sit round a table facing the centre. K is immediately left of J, M is not next to J, and L is immediately right of M. Who is immediately right of J?

Connects to: [how to attack a brainteaser](#/concept/puzzles.method.how-to-attack-a-brainteaser), [blood relations](#/concept/apt.logical.blood-relations), [permutations, combinations and probability basics for OAs](#/concept/apt.quant.permutations-combinations-and-probability-basics-for-oas).

### questions
Q: At a round table where everyone faces the centre, which way is a person's left?
A: Clockwise, seen from above. Picture yourself in a chair facing the middle: the neighbor on your left hand is the next seat clockwise. If people face outwards, it flips.

Q: Which clues should you use first in a seating puzzle?
A: The ones that fix a seat outright, such as "in the middle" or "at an end", then clues that tie two people together, and negative clues last. Strong clues first keep the number of cases small.

Q: What is the difference between "to the left of" and "immediately to the left of"?
A: "Immediately" means the very next seat. Without it, the person can be anywhere on that side, which usually leaves several cases open.

Q: Why do you fix one person's seat at a round table?
A: Rotating everyone one seat gives the same arrangement, since only relative positions matter. Fixing one person removes those duplicates, so n people give (n - 1)! arrangements instead of n!.

Q: How do you know a seating puzzle has a unique answer?
A: Check that every clue holds in your final arrangement and that each case you dropped broke a specific clue. If two arrangements survive, the question can only ask about what they have in common.

## apt.logical.blood-relations
name: "Blood relations"
importance: important
scope: "Blood relations"

### simple
Blood relation questions describe a family in a roundabout way and ask how two people are related. The trick is to stop juggling words and draw a small family tree: parents above children, brothers and sisters side by side, a line between husband and wife. Once the tree is on paper, the answer is usually a matter of reading it off, like finding your way on a map instead of from directions.

### interview
- **Draw it**: one row per generation, a mark for each person's sex (+ and −, or a square and a circle), a horizontal line for siblings and a double line for a married couple.
- **Conventions tests assume**: different names are different people; siblings share both parents; a parent's husband or wife is the other parent.
- **Watch unstated sex**: "X is the child of Y" leaves X's sex open, so "son" may not follow. If an option says "cannot be determined", check whether the sex was ever given.
- **Paternal or maternal**: "my grandfather's only son" is my father only if the grandfather is on my father's side; otherwise he is my uncle.
- **Coded relations** ("P + Q means P is the father of Q"): translate each symbol, left to right, into the tree before answering.
- **Only**: "my father's only son" (said by a woman) is her brother; said by a man, it is himself.

### deep
#### Intuition

Every relation word is a short path in the family tree: mother is one step up, uncle is up one and across to a sibling, cousin is up two and down two. Build the tree, find the path and name it, and notice what was never said: usually someone's sex, or a grandparent's side.

#### Worked examples

Code: P + Q means P is Q's father; P − Q, Q's wife; P × Q, Q's brother; P ÷ Q, Q's daughter.

1. **M × N ÷ O − P.** O is N's mother and P's wife, so P is N's father, and N's brother M is P's **son**.
2. **K + L × J ÷ H.** J and L are siblings, so K is J's father and H must be J's mother: K's **wife**. H's sex is never stated, but a male H would give J two fathers.
3. **P ÷ Q + R × S.** S is R's sibling, so Q's child, but nothing gives S's sex: **not determined**.
4. **A photograph.** Meera says of a man: "His only sister is the mother of my father's only son." That son is her brother, his mother is hers, so the man is her **maternal uncle**.
5. **Two readings.** Tara says of a boy: "He is the son of my grandfather's only son." Through her father, the boy is her **brother**; through her mother, the only son is her uncle and the boy her **cousin**. Unless the side is fixed, it is not determined.

#### Code

The program tries both sexes for anyone whose sex no fact states, drops families where someone has two fathers or two mothers, and names the shortest path found by [breadth-first search](#/concept/dsa.graph-basics.bfs). An answer counts only if every model agrees.

```cpp
struct Fact { char x; string rel; char y; };  // x is y's rel
using Edge = tuple<char, char, char>;         // from, move, to; moves: parent, child, sibling, wed

// Links from the facts, plus the usual test conventions: siblings share parents, a child's
// two parents are a couple, and a parent's spouse is the other parent.
set<Edge> links(const vector<Fact>& facts) {
    set<Edge> e;
    for (auto& [x, rel, y] : facts) {
        if (rel == "father" || rel == "mother") e.insert({y, 'p', x});
        if (rel == "son" || rel == "daughter") e.insert({x, 'p', y});
        if (rel == "brother" || rel == "sister") e.insert({x, 's', y}), e.insert({y, 's', x});
        if (rel == "husband" || rel == "wife") e.insert({x, 'w', y}), e.insert({y, 'w', x});
    }
    for (int round = 0; round < 3; ++round)
        for (auto [x, m, y] : set(e))
            for (auto [u, n, v] : set(e)) {
                if (m == 'p' && n == 'w' && u == y) e.insert({x, 'p', v});
                if (m == 's' && n == 'p' && u == y) e.insert({x, 'p', v});
                if (m == 'p' && n == 'p' && u == x && y != v) e.insert({y, 'w', v});
            }
    for (auto [x, m, y] : set(e)) if (m == 'p') e.insert({y, 'c', x});
    return e;
}

string word(const string& path, char sex) {  // the moves from b to a, and a's sex
    static const map<string, array<string, 2>> w = {
        {"p", {"father", "mother"}}, {"c", {"son", "daughter"}}, {"s", {"brother", "sister"}},
        {"pc", {"brother", "sister"}}, {"w", {"husband", "wife"}}, {"cp", {"husband", "wife"}},
        {"ps", {"uncle", "aunt"}}};
    return w.count(path) ? w.at(path)[sex == 'F'] : "? (" + path + ")";
}

// Try every sex for people whose sex no fact states; keep the models where nobody has two
// fathers or two mothers and spouses differ, and name a's shortest path from b in each.
void ask(const vector<Fact>& facts, char a, char b) {
    static const set<string> male = {"father", "son", "brother", "husband"};
    map<char, char> sex;
    for (auto& f : facts) sex[f.x] = male.count(f.rel) ? 'M' : 'F';
    string open;
    for (auto& f : facts) if (!sex.count(f.y) && open.find(f.y) == string::npos) open += f.y;
    set<Edge> e = links(facts);
    set<string> answers;
    for (int m = 0; m < 1 << open.size(); ++m) {
        for (size_t i = 0; i < open.size(); ++i) sex[open[i]] = m >> i & 1 ? 'F' : 'M';
        bool ok = true;
        map<pair<char, char>, set<char>> parents;  // (child, parent's sex) -> parents
        for (auto [x, mv, y] : e) {
            if (mv == 'p') parents[{x, sex[y]}].insert(y);
            if (mv == 'w') ok &= sex[x] != sex[y];
        }
        for (auto& [k, ps] : parents) ok &= ps.size() == 1;
        map<char, string> path{{b, ""}};  // breadth-first search from b
        for (deque<char> q{b}; ok && !q.empty(); q.pop_front())
            for (auto [x, mv, y] : e)
                if (x == q.front() && !path.count(y)) path[y] = path[x] + mv, q.push_back(y);
        if (ok) answers.insert(word(path[a], sex[a]));
    }
    printf("%c is %c's:", a, b);
    for (auto& w : answers) printf(" %s", w.c_str());
    printf(answers.size() == 1 ? "\n" : "  (not determined)\n");
}

int main() {
    ask({{'M', "brother", 'N'}, {'N', "daughter", 'O'}, {'O', "wife", 'P'}}, 'M', 'P');
    ask({{'K', "father", 'L'}, {'L', "brother", 'J'}, {'J', "daughter", 'H'}}, 'H', 'K');
    ask({{'P', "daughter", 'Q'}, {'Q', "father", 'R'}, {'R', "brother", 'S'}}, 'S', 'Q');
    // Meera (E) about a man X: "His only sister is the mother of my father's only son."
    ask({{'X', "brother", 'Y'}, {'Y', "mother", 'Z'}, {'Z', "son", 'W'}, {'W', "father", 'E'},
         {'E', "daughter", 'W'}}, 'X', 'E');
    printf("practice:\n");
    ask({{'A', "daughter", 'B'}, {'B', "wife", 'C'}}, 'A', 'C');
    ask({{'D', "brother", 'E'}, {'E', "father", 'F'}}, 'D', 'F');
    ask({{'G', "father", 'H'}, {'H', "daughter", 'I'}}, 'I', 'G');
    ask({{'J', "brother", 'K'}, {'K', "daughter", 'L'}}, 'L', 'J');
}
```

Output:

```text
M is P's: son
H is K's: wife
S is Q's: daughter son  (not determined)
X is E's: uncle
practice:
A is C's: daughter
D is F's: uncle
I is G's: wife
L is J's: father mother  (not determined)
```

#### Practice

About 45 seconds each, same code; the key is the "practice" lines.

1. A ÷ B − C: how is A related to C?
2. D × E + F: how is D related to F?
3. G + H ÷ I: how is I related to G?
4. J × K ÷ L: how is L related to J?

Connects to: [seating arrangements and puzzles](#/concept/apt.logical.seating-arrangements-and-puzzles), [syllogisms](#/concept/apt.logical.syllogisms), [liars and truth-tellers](#/concept/puzzles.logic.liars-and-truth-tellers).

### questions
Q: In a coded relation where P ÷ Q means P is Q's daughter and P − Q means P is Q's wife, what does A ÷ B − C say about A and C?
A: A is B's daughter and B is C's wife, so C is A's father: A is C's daughter. Tests assume a mother's husband is the child's father.

Q: If X is the child of Y, is X Y's son?
A: Not necessarily. Child does not say sex, so unless another statement does (X is someone's brother, say), the relation is "son or daughter" and cannot be determined.

Q: A woman says a boy is the son of her grandfather's only son. How is the boy related to her?
A: It depends on the grandfather's side. If he is her father's father, the only son is her father and the boy is her brother; if he is her mother's father, the boy is her cousin.

Q: What conventions do blood relation puzzles usually assume?
A: Different names are different people, brothers and sisters share both parents, and a parent's spouse is the other parent. Some answers depend on them, so apply them consistently.

Q: How do you avoid mistakes in long chains of relations?
A: Draw the tree as you read, one statement at a time, marking each person's sex when it is stated and leaving it blank when it is not. Then read the path between the two people and check which facts it relied on.

## apt.logical.syllogisms
name: "Syllogisms"
importance: important
scope: "Syllogisms"

### simple
A syllogism gives you a couple of statements, such as "all pens are tools" and "some tools are gifts", and asks which conclusions must be true. The rule is strict: a conclusion follows only if it is true in every picture that fits the statements, not just in the most natural one. Drawing overlapping circles, one per group, is like trying different floor plans that all match the description.

### interview
- Four statement types: **All** A are B, **No** A is B, **Some** A are B, **Some** A are **not** B. "Some" means at least one, possibly all.
- A conclusion **follows** only if it holds in every Venn diagram consistent with the premises; one counterexample diagram kills it.
- **Conversions**: "no A is B" and "some A are B" can be reversed; "all A are B" gives only "some B are A"; "some A are not B" can't be reversed.
- **Quick rules** for chains A–B–C: all + all = all; all + no = no; some + all = some; some + no = some A are not C; all + some and some + some give nothing definite.
- **Either-or**: when neither of two conclusions follows but they are complementary (some A are B / no A is B; all A are B / some A are not B), exactly one is true, so "either I or II follows".
- **Possibility** questions ask whether a conclusion is true in at least one diagram.

### deep
#### Intuition

Think of the premises as rules about which parts of a Venn diagram may have members. "All pens are tools" empties the part of the pens circle outside tools; "some tools are gifts" says the overlap of tools and gifts has someone in it, but not where. A conclusion follows only if it survives every way of filling the diagram that obeys the rules.

#### Worked examples

1. All pens are tools; some tools are gifts. "Some gifts are tools" **follows**; "some pens are gifts" does **not** (the gifts may miss the pens).
2. All roses are flowers; no flower is a stone. "No rose is a stone" **follows**. "All stones are flowers" is **impossible**.
3. Some cups are plates; no plate is a spoon. "Some cups are not spoons" **follows** (the cups that are plates). "Some cups are spoons" is possible but doesn't follow.
4. Some books are pens; some pens are chairs. Neither "some books are chairs" nor "no book is a chair" follows, but they are complementary: **either I or II**.
5. All desks are wood; some wood is metal. "All desks are metal" is a **possibility**, yet "some desks are metal" doesn't follow.
6. With four terms: all A are B, all B are C, no C is D. "No A is D" **follows**; "some D are B" is impossible.

#### A convention to know

Tests read "all A are B" as saying that A exist, so "all kites are toys" gives "some toys are kites". Modern formal logic doesn't assume this (an empty A makes "all A are B" true), and then that conversion fails. Use the test convention in tests.

#### Code

Every model is checked: each of the $2^n - 1$ regions of an $n$-term diagram is empty or not (128 diagrams for three terms, 32,768 for four), and every term has members.

```cpp
// A statement: "all X Y" (all X are Y), "no X Y", "some X Y" or "somenot X Y".
struct St { string q, x, y; };

// A model marks which regions of the Venn diagram have members. Region r is the set of terms
// whose bits are in r. Every term must have members (tests assume "all A are B" means A exist).
struct Checker {
    vector<string> terms;
    int bit(const string& t) {
        auto it = find(terms.begin(), terms.end(), t);
        if (it == terms.end()) terms.push_back(t), it = terms.end() - 1;
        return 1 << (it - terms.begin());
    }
    bool holds(unsigned model, St s) {
        int x = bit(s.x), y = bit(s.y);
        bool in = false, out = false;  // members in X and Y, members in X but not Y
        for (int r = 1; r < 1 << terms.size(); ++r)
            if (model >> r & 1 && r & x) (r & y ? in : out) = true;
        if (s.q == "all") return !out;
        if (s.q == "no") return !in;
        return s.q == "some" ? in : out;
    }
    // Keep the models where every premise holds, then judge the conclusions in them.
    void judge(vector<St> premises, vector<St> conclusions) {
        for (auto& s : premises) bit(s.x), bit(s.y);
        for (auto& s : conclusions) bit(s.x), bit(s.y);
        int n = terms.size();
        vector<unsigned> models;
        for (unsigned m = 0; m < 1u << (1 << n); m += 2) {  // region 0 (outside all) ignored
            bool ok = true;
            for (int t = 0; t < n; ++t) {
                bool has = false;
                for (int r = 1; r < 1 << n; ++r) has |= (m >> r & 1) && (r >> t & 1);
                ok &= has;
            }
            for (auto& s : premises) ok &= holds(m, s);
            if (ok) models.push_back(m);
        }
        vector<int> yes;
        for (auto& c : conclusions) {
            int k = count_if(models.begin(), models.end(), [&](unsigned m) { return holds(m, c); });
            yes.push_back(k);
            const char* verdict = k == (int)models.size() ? "follows"
                                  : k ? "possible, doesn't follow" : "impossible";
            printf("  %-8s %s %s: %s\n", c.q.c_str(), c.x.c_str(), c.y.c_str(), verdict);
        }
        if (conclusions.size() == 2 && yes[0] && yes[1] && yes[0] < (int)models.size() &&
            yes[1] < (int)models.size()) {
            bool exactlyOne = all_of(models.begin(), models.end(), [&](unsigned m) {
                return holds(m, conclusions[0]) != holds(m, conclusions[1]); });
            if (exactlyOne) printf("  either one or the other\n");
        }
    }
};

int main() {
    Checker().judge({{"all", "pens", "tools"}, {"some", "tools", "gifts"}},
                    {{"some", "pens", "gifts"}, {"some", "gifts", "tools"}});
    Checker().judge({{"all", "roses", "flowers"}, {"no", "flowers", "stones"}},
                    {{"no", "roses", "stones"}, {"all", "stones", "flowers"}});
    Checker().judge({{"some", "cups", "plates"}, {"no", "plates", "spoons"}},
                    {{"somenot", "cups", "spoons"}, {"some", "cups", "spoons"}});
    Checker().judge({{"some", "books", "pens"}, {"some", "pens", "chairs"}},
                    {{"some", "books", "chairs"}, {"no", "books", "chairs"}});
    Checker().judge({{"all", "desks", "wood"}, {"some", "wood", "metal"}},
                    {{"all", "desks", "metal"}, {"some", "desks", "metal"}});
    Checker().judge({{"all", "A", "B"}, {"all", "B", "C"}, {"no", "C", "D"}},
                    {{"no", "A", "D"}, {"some", "D", "B"}});
    printf("practice:\n");
    Checker().judge({{"all", "kites", "toys"}, {"all", "toys", "gifts"}},
                    {{"all", "kites", "gifts"}, {"some", "gifts", "kites"}});
    Checker().judge({{"no", "fish", "birds"}, {"some", "birds", "pets"}},
                    {{"somenot", "pets", "fish"}, {"no", "pets", "fish"}});
    Checker().judge({{"some", "coins", "old"}, {"some", "old", "rare"}},
                    {{"some", "coins", "rare"}, {"no", "coins", "rare"}});
}
```

Output:

```text
  some     pens gifts: possible, doesn't follow
  some     gifts tools: follows
  no       roses stones: follows
  all      stones flowers: impossible
  somenot  cups spoons: follows
  some     cups spoons: possible, doesn't follow
  some     books chairs: possible, doesn't follow
  no       books chairs: possible, doesn't follow
  either one or the other
  all      desks metal: possible, doesn't follow
  some     desks metal: possible, doesn't follow
  no       A D: follows
  some     D B: impossible
practice:
  all      kites gifts: follows
  some     gifts kites: follows
  somenot  pets fish: follows
  no       pets fish: possible, doesn't follow
  some     coins rare: possible, doesn't follow
  no       coins rare: possible, doesn't follow
  either one or the other
```

#### Practice

About 40 seconds each; the key is the "practice" lines.

1. All kites are toys; all toys are gifts. I: All kites are gifts. II: Some gifts are kites.
2. No fish is a bird; some birds are pets. I: Some pets are not fish. II: No pet is a fish.
3. Some coins are old; some old things are rare. I: Some coins are rare. II: No coin is rare.

Connects to: [proof by contradiction and contrapositive](#/concept/math.proofs.proof-by-contradiction-and-contrapositive), [data sufficiency](#/concept/apt.logical.data-sufficiency), [liars and truth-tellers](#/concept/puzzles.logic.liars-and-truth-tellers).

### questions
Q: All pens are tools and some tools are gifts. Does "some pens are gifts" follow?
A: No. The gifts could all lie in the part of the tools circle that holds no pens, which fits both premises. A conclusion must hold in every diagram, and one counterexample is enough to reject it.

Q: Some cups are plates and no plate is a spoon. What follows?
A: Some cups are not spoons: the cups that are plates can't be spoons. Whether any cup is a spoon is left open, so "some cups are spoons" doesn't follow.

Q: When do you answer "either I or II follows"?
A: When neither conclusion follows on its own, both are about the same two terms, and they are complementary, so exactly one of them must be true, such as "some A are B" and "no A is B".

Q: Which statements can be reversed?
A: "No A is B" and "some A are B" reverse freely. "All A are B" reverses only to "some B are A", and only under the test convention that A exist. "Some A are not B" can't be reversed.

Q: What does a possibility question ask?
A: Whether the conclusion is true in at least one diagram consistent with the premises. "All desks are wood, some wood is metal" allows every desk to be metal, so "all desks being metal is a possibility" is true, even though it doesn't follow.

## apt.logical.coding-decoding-and-directions
name: "Coding-decoding and directions"
importance: important
scope: "Coding-decoding and directions"

### simple
Coding-decoding questions show a word and its secret version, and you work out the rule, like cracking a simple cipher from one example, then apply it to a new word. Direction questions describe a walk with turns and ask where the person ends up. For both, write things down: the alphabet with positions for codes, and a quick sketch with north at the top for walks.

### interview
- **Letter positions**: A = 1 to Z = 26 (EJOTY = 5, 10, 15, 20, 25 as anchors); the mirror letter of $n$ is $27 - n$ (A ↔ Z, M ↔ N).
- **Common letter rules**: a fixed shift (+2), reversal, mirroring, alternating shifts (+1, −1), a growing shift (+1, +2, +3), or a combination. Check the first two letters, form a guess, then confirm it on every letter.
- **Sentence codes**: compare sentences that share a word; its code is the one they share. Two words that always appear together can't be told apart.
- **Directions**: keep $(x, y)$ with east and north positive; the straight-line distance is $\sqrt{x^2 + y^2}$, and the direction is read from the signs and sizes of $x$ and $y$.
- **Turns**: right is 90° clockwise; anticlockwise turns subtract; there are 8 compass points 45° apart.
- **Shadows**: in the morning the sun is in the east, so shadows point west; in the evening they point east. At noon there is (almost) no side shadow.

### deep
#### Intuition

One example can't pin down a code in general, but tests draw rules from a small family, so try the family. For directions, track coordinates and a heading angle instead of turning your head.

#### Worked examples: codes

1. LAMP is NCOR (every letter +2), so RIVER is **TKXGT**.
2. STONE is ENOTS (reversed), so CHAIR is **RIAHC**.
3. CAT is XZG: C (3) becomes X (24), the mirror rule $27 - n$. So DOG is **WLT**.
4. BRICK is CTLGP: shifts of +1, +2, +3, +4, +5. So SAND is **TCQH**.
5. "sun is hot" is "ka lo mi", "hot tea is good" is "mi ra lo pu", "good sun rises" is "pu ka te". Sun (sentences 1 and 3) is **ka**, good is **pu**, tea **ra**, rises **te**; "is" and "hot" always appear together: **not determined**.

```cpp
char shift(char c, int k) { return 'A' + ((c - 'A' + k) % 26 + 26) % 26; }

// Letter rules with a number k from 0 to 25: letter i (from 0) moves by the amount given.
map<string, function<int(int i, int k)>> moves = {
    {"shift", [](int, int k) { return k; }},
    {"alternate", [](int i, int k) { return i % 2 ? -k : k; }},
    {"growing", [](int i, int k) { return k * (i + 1); }}};

string apply(string w, const string& rule, int k, bool rev, bool mirror) {
    if (rev) reverse(w.begin(), w.end());
    for (size_t i = 0; i < w.size(); ++i)
        w[i] = shift(mirror ? 'Z' - (w[i] - 'A') : w[i], moves[rule](i, k));
    return w;
}

// Try every rule, with and without reversing and mirroring (A <-> Z) first, on the example.
void crack(string word, string code, string query) {
    printf("%s -> %s, so %s ->", word.c_str(), code.c_str(), query.c_str());
    for (auto& [rule, f] : moves)
        for (int k = rule != "shift"; k < 26; ++k)  // k = 0 is the same rule for all three
            for (bool rev : {false, true})
                for (bool mirror : {false, true})
                    if (apply(word, rule, k, rev, mirror) == code)
                        printf(" %s (%s %d%s%s)", apply(query, rule, k, rev, mirror).c_str(),
                               rule.c_str(), k, rev ? " reversed" : "", mirror ? " mirrored" : "");
    printf("\n");
}

set<string> split(const string& s) {
    istringstream in(s);
    return {istream_iterator<string>(in), {}};
}

// Sentence codes: a word's code appears in every coded sentence that contains the word and
// in none of the others.
void words(const vector<pair<string, string>>& lines, const string& word) {
    set<string> c;
    for (auto& [plain, coded] : lines) {
        auto k = split(coded);
        if (split(plain).count(word)) c.insert(k.begin(), k.end());
    }
    for (auto& [plain, coded] : lines) {
        bool inLine = split(plain).count(word);
        erase_if(c, [&](const string& x) { return inLine != split(coded).count(x); });
    }
    printf("  %s:", word.c_str());
    for (auto& x : c) printf(" %s", x.c_str());
    printf(c.size() == 1 ? "\n" : "  (not determined)\n");
}

int main() {
    crack("LAMP", "NCOR", "RIVER");
    crack("STONE", "ENOTS", "CHAIR");
    crack("CAT", "XZG", "DOG");
    crack("BRICK", "CTLGP", "SAND");
    vector<pair<string, string>> lines = {{"sun is hot", "ka lo mi"},
                                          {"hot tea is good", "mi ra lo pu"},
                                          {"good sun rises", "pu ka te"}};
    for (string w : {"sun", "tea", "good", "rises", "is"}) words(lines, w);
    crack("GARDEN", "HBSEFO", "FLOWER");
    crack("MANGO", "OGNAM", "PEACH");
}
```

Output:

```text
LAMP -> NCOR, so RIVER -> TKXGT (shift 2)
STONE -> ENOTS, so CHAIR -> RIAHC (shift 0 reversed)
CAT -> XZG, so DOG -> WLT (shift 0 mirrored)
BRICK -> CTLGP, so SAND -> TCQH (growing 1)
  sun: ka
  tea: ra
  good: pu
  rises: te
  is: lo mi  (not determined)
GARDEN -> HBSEFO, so FLOWER -> GMPXFS (shift 1)
MANGO -> OGNAM, so PEACH -> HCAEP (shift 0 reversed)
```

Each example matches exactly one rule in the family, which makes it a fair question.

#### Worked examples: directions

1. Walk 4 km north, turn right and walk 3, right and walk 12, left and walk 3: 6 km east and 8 south, $\sqrt{36 + 64} = 10$ km **south-east** (bearing 143°).
2. One morning your shadow falls to your right. It points west, so you face **south** (no program needed).
3. From north, turn 90° clockwise, 180°, then 45° anticlockwise: $225°$, **south-west**.

```cpp
const char* compass[] = {"north", "north-east", "east", "south-east",
                         "south", "south-west", "west", "north-west"};
const double PI = acos(-1.0);

// Moves are "F5" (walk 5 ahead), "R" and "L" (turn 90 degrees), or "T135" / "T-45" (turn that
// many degrees clockwise). x points east and y north; heading 0 is north, 90 east.
void walk(const vector<string>& moves) {
    double x = 0, y = 0;
    int heading = 0;  // start facing north
    for (auto& m : moves) {
        int n = m.size() > 1 ? stoi(m.substr(1)) : 90;
        if (m[0] == 'F') x += n * sin(heading * PI / 180), y += n * cos(heading * PI / 180);
        if (m[0] == 'R' || m[0] == 'T') heading += n;
        if (m[0] == 'L') heading -= n;
        heading = (heading % 360 + 360) % 360;
    }
    if (hypot(x, y) > 1e-9)
        printf("at (%g, %g), %g from the start, bearing %.2f degrees; ", round(x), round(y),
               hypot(x, y), fmod(atan2(x, y) * 180 / PI + 360, 360));
    printf("facing %s\n", compass[heading / 45]);
}

int main() {
    walk({"F4", "R", "F3", "R", "F12", "L", "F3"});
    walk({"R", "T180", "T-45"});
    printf("practice:\n");
    walk({"R", "F10", "L", "F6", "L", "F2"});
    walk({"R", "R", "F5", "R", "F12"});
    walk({"R", "T-135", "R"});
}
```

Output:

```text
at (6, -8), 10 from the start, bearing 143.13 degrees; facing east
facing south-west
practice:
at (8, 6), 10 from the start, bearing 53.13 degrees; facing west
at (-12, -5), 13 from the start, bearing 247.38 degrees; facing west
facing north-east
```

#### Practice

About 30 seconds each; the keys are the last two lines of the first output and the "practice" lines of the second.

1. GARDEN is HBSEFO; write FLOWER. 2. MANGO is OGNAM; write PEACH.
3. Walk 10 m east, left 6, left 2: how far from the start, facing where? 4. Walk 5 m south, turn right and walk 12: how far, and in which direction from the start? 5. Facing east, turn 135° anticlockwise, then 90° clockwise: facing where?

Connects to: [number series and sequences](#/concept/apt.quant.number-series-and-sequences), [symmetric vs asymmetric encryption](#/concept/cn.security.symmetric-vs-asymmetric-encryption) (a letter shift is a toy cipher that one example breaks), [seating arrangements and puzzles](#/concept/apt.logical.seating-arrangements-and-puzzles).

### questions
Q: How do you find the rule when LAMP is coded as NCOR?
A: Compare letter positions: L to N, A to C, M to O, P to R are all +2. Confirm the guess on every letter before applying it, since some codes change the shift from letter to letter.

Q: What is the mirror rule for letters?
A: Each letter maps to the one the same distance from the other end: position n becomes 27 - n, so A becomes Z, C becomes X and M becomes N.

Q: How do you decode sentence codes such as "sun is hot" = "ka lo mi"?
A: Find sentences that share exactly one word; the code word they share is that word's code. Words that always appear together, like "is" and "hot" in the example, can't be separated, so their codes are not determined.

Q: Someone walks 4 km north, 3 km east, 12 km south and 3 km east. How far are they from the start?
A: They end 6 km east and 8 km south, so the distance is the square root of 36 + 64 = 10 km, towards the south-east.

Q: In the morning a person's shadow falls to their right. Which way do they face?
A: The morning sun is in the east, so the shadow points west. If west is on their right, they are facing south.

## apt.logical.data-sufficiency
name: "Data sufficiency"
importance: important
scope: "Data sufficiency"

### simple
Data sufficiency questions don't ask for the answer; they ask whether you could find it. You get a question and two statements, and you decide whether the first alone, the second alone, both together, or neither gives enough information. It is like checking whether a recipe lists enough to bake the cake, without baking it.

### interview
- **Standard options**: (A) I alone is sufficient, II isn't; (B) II alone is, I isn't; (C) both together are needed; (D) each alone is sufficient; (E) even both together aren't. The letters vary between tests, so read the key.
- **Sufficient means one answer**: a statement is sufficient when every case it allows gives the same answer. For yes/no questions, a definite "no" is sufficient too.
- **Test each statement alone first**, forgetting the other completely; only then combine.
- **Don't solve fully**: stop as soon as you know the answer is unique (a linear equation in one unknown, two independent equations in two).
- **Watch the domain**: integers or real numbers, positive or not. $x^2 = 49$ gives two answers unless $x > 0$ is known.
- The two statements never contradict each other in a well-made question.

### deep
#### Intuition

Picture all the values the question allows; each statement throws some away. If every survivor gives the same answer, the statement is sufficient. You count surviving answers instead of computing one.

#### Worked examples

1. **What is the two-digit number $N$?** I: its digits add to 9. II: $N$ minus its reversal is 27, so the tens digit is 3 more than the units. Each allows several numbers; together $a + b = 9$, $a - b = 3$ give 63. **C**.
2. **Is $k$ prime?** I: $k$ is a multiple of 9. II: $k < 20$. I gives a definite **no**, which is sufficient; II allows 2 (yes) and 4 (no). **A**.
3. **Is $n$ even?** I: $n^2 + n$ is even (true for every integer, so useless). II: $3n$ is even. **B**.
4. **What does one pen cost?** I: 3 pens cost 45. II: 5 pens cost 75. Each gives 15. **D**.
5. **What is $a + b$ for positive integers?** I: $a - b = 4$. II: $a$ is prime. (5, 1), (7, 3), (11, 7) all fit both. **E**.
6. **Is $m$ a multiple of 6?** I: a multiple of 3. II: a multiple of 4. Neither alone, but together a multiple of 12: yes, though $m$ stays unknown. **C**.

#### Code

The program keeps the candidates in a range that each statement allows and counts distinct answers. A finite range is evidence; the reasoning above is the proof.

```cpp
// A data-sufficiency item over a finite range of candidates: a statement is sufficient when
// every candidate it allows gives the same answer to the question.
template <class T>
void judge(const char* label, const vector<T>& domain, function<bool(T)> one,
           function<bool(T)> two, function<string(T)> answer) {
    auto answers = [&](bool useOne, bool useTwo) {
        set<string> a;
        for (const T& x : domain)
            if ((!useOne || one(x)) && (!useTwo || two(x))) a.insert(answer(x));
        return a;
    };
    auto a1 = answers(true, false), a2 = answers(false, true), both = answers(true, true);
    char verdict = a1.size() == 1 ? (a2.size() == 1 ? 'D' : 'A')
                 : a2.size() == 1 ? 'B' : both.size() == 1 ? 'C' : 'E';
    printf("%-18s I alone %zu answer(s), II alone %zu, both %zu (%s): %c\n", label, a1.size(),
           a2.size(), both.size(), both.size() == 1 ? both.begin()->c_str() : "...", verdict);
}

vector<int> range(int lo, int hi) {
    vector<int> v(hi - lo + 1);
    iota(v.begin(), v.end(), lo);
    return v;
}
vector<pair<int, int>> pairs(int hi) {
    vector<pair<int, int>> v;
    for (int a = 1; a <= hi; ++a)
        for (int b = 1; b <= hi; ++b) v.push_back({a, b});
    return v;
}
bool prime(int n) {
    for (int d = 2; d * d <= n; ++d) if (n % d == 0) return false;
    return n > 1;
}
string yes(bool b) { return b ? "yes" : "no"; }
using P = pair<int, int>;

int main() {
    judge<int>("two-digit number", range(10, 99), [](int n) { return n / 10 + n % 10 == 9; },
               [](int n) { return n - (n % 10 * 10 + n / 10) == 27; },
               [](int n) { return to_string(n); });
    judge<int>("is k prime", range(1, 1000), [](int k) { return k % 9 == 0; },
               [](int k) { return k < 20; }, [](int k) { return yes(prime(k)); });
    judge<int>("is n even", range(1, 1000), [](int n) { return (n * n + n) % 2 == 0; },
               [](int n) { return 3 * n % 2 == 0; }, [](int n) { return yes(n % 2 == 0); });
    judge<int>("price of a pen", range(1, 1000), [](int p) { return 3 * p == 45; },
               [](int p) { return 5 * p == 75; }, [](int p) { return to_string(p); });
    judge<P>("a + b", pairs(100), [](P p) { return p.first - p.second == 4; },
             [](P p) { return prime(p.first); }, [](P p) { return to_string(p.first + p.second); });
    judge<int>("multiple of 6", range(1, 1000), [](int m) { return m % 3 == 0; },
               [](int m) { return m % 4 == 0; }, [](int m) { return yes(m % 6 == 0); });
    printf("practice:\n");
    judge<int>("x", range(-100, 100), [](int x) { return 2 * x + 3 == 11; },
               [](int x) { return x * x == 16; }, [](int x) { return to_string(x); });
    judge<int>("is y odd", range(1, 1000), [](int y) { return 5 * y % 2 == 0; },
               [](int y) { return (y + 2) % 2 == 0; }, [](int y) { return yes(y % 2); });
    judge<P>("Kiran's age", pairs(100), [](P p) { return p.first + p.second == 50; },
             [](P p) { return p.second == p.first + 10; }, [](P p) { return to_string(p.first); });
    judge<P>("is a > b", pairs(50), [](P p) { return p.first + p.second == 20; },
             [](P p) { return p.first % 2 == 0; }, [](P p) { return yes(p.first > p.second); });
}
```

Output:

```text
two-digit number   I alone 9 answer(s), II alone 7, both 1 (63): C
is k prime         I alone 1 answer(s), II alone 2, both 1 (no): A
is n even          I alone 2 answer(s), II alone 1, both 1 (yes): B
price of a pen     I alone 1 answer(s), II alone 1, both 1 (15): D
a + b              I alone 96 answer(s), II alone 195, both 23 (...): E
multiple of 6      I alone 2 answer(s), II alone 2, both 1 (yes): C
practice:
x                  I alone 1 answer(s), II alone 2, both 1 (4): A
is y odd           I alone 1 answer(s), II alone 1, both 1 (no): D
Kiran's age        I alone 49 answer(s), II alone 90, both 1 (20): C
is a > b           I alone 2 answer(s), II alone 2, both 2 (...): E
```

#### Practice

About 45 seconds each; the key is the "practice" lines.

1. What is the integer $x$? I: $2x + 3 = 11$. II: $x^2 = 16$.
2. Is the positive integer $y$ odd? I: $5y$ is even. II: $y + 2$ is even.
3. How old is Kiran? I: Kiran's and Lata's ages add to 50. II: Lata is 10 years older than Kiran.
4. Is $a > b$ for positive integers? I: $a + b = 20$. II: $a$ is even.

Connects to: [syllogisms](#/concept/apt.logical.syllogisms), [divisibility and primes](#/concept/math.number-theory.divisibility-and-primes), [ratios, proportions and averages](#/concept/apt.quant.ratios-proportions-and-averages).

### questions
Q: What does "sufficient" mean in data sufficiency?
A: That the statement leaves exactly one possible answer to the question. You don't need to compute it, only to be sure it is unique.

Q: Is a statement that proves the answer is "no" sufficient?
A: Yes. For a yes/no question, a definite no is as good as a definite yes. "k is a multiple of 9" is sufficient for "is k prime?" because the answer is always no.

Q: Why must you judge each statement on its own before combining them?
A: Options A, B and D depend on what each statement does alone. Using a fact from statement I while judging II is the most common error and turns an A or B into a wrong D, or a C into a wrong A.

Q: What is the value of x if x squared is 49?
A: Either 7 or -7, so the statement alone is not sufficient unless something else says x is positive. Watch for squares, absolute values and even powers, which hide a second solution.

Q: When do both statements together still fail?
A: When combining them leaves more than one answer, such as a - b = 4 with a prime: (5, 1), (7, 3) and (11, 7) all fit, giving different sums. That is option E.

## apt.logical.data-interpretation
name: "Data interpretation"
importance: important
scope: "tables and charts"

### simple
Data interpretation gives you a table or a chart and a set of questions about it: growth, shares, averages, comparisons. The arithmetic is simple, but there is a lot of it and little time, so the skill is reading the right cells and estimating smartly. It is like checking a restaurant bill: you don't add every item to the paisa, you check that the total is about right.

### interview
- **Percent change** = $\frac{\text{new} - \text{old}}{\text{old}}$; the base is the **earlier** value unless the question says otherwise.
- **Share of a total** = part ÷ total; a pie chart's angle is share × 360° (1% = 3.6°).
- **Average growth over several years** is the compound rate, $\left(\frac{\text{end}}{\text{start}}\right)^{1/n} - 1$, not the total growth divided by $n$.
- **Estimate first**: round to two significant figures, compare with the options, and compute exactly only when options are close.
- **Compare fractions** by cross-multiplying or by using a common benchmark such as $\frac{1}{3}$ or 50%.
- Read units, footnotes and whether a figure is in thousands or lakhs before computing anything.

### deep
#### Intuition

Most questions reduce to a few operations on a few cells: a difference, a ratio, a share, a growth rate. Identify which cells before touching the arithmetic, and keep the base straight: "A is what percent of B" divides by B, "growth from 2021" divides by the 2021 value.

#### The data (made up)

A bicycle maker's unit sales:

| model | 2021 | 2022 | 2023 | 2024 |
|---|---|---|---|---|
| City | 1,200 | 1,350 | 1,500 | 1,650 |
| Trail | 800 | 1,000 | 1,100 | 1,320 |
| Kids | 600 | 540 | 600 | 630 |
| Cargo | 150 | 210 | 300 | 400 |
| **Total** | **2,750** | **3,100** | **3,500** | **4,000** |

A household's spending of 60,000 in one month, as a pie chart's shares:

| rent | food | transport | savings | other |
|---|---|---|---|---|
| 30% | 25% | 10% | 20% | 15% |

#### Worked examples

1. **Total growth 2021 to 2024**: $\frac{4000}{2750} - 1 = 45.45\%$. Estimate: 2,750 to 4,000 is a rise of 1,250, a bit less than half.
2. **Average yearly growth**: $\left(\frac{4000}{2750}\right)^{1/3} - 1 = 13.30\%$, not $\frac{45.45}{3} = 15.15\%$.
3. **Fastest-growing model**: Cargo, from 150 to 400, $+166.67\%$, though it adds only 250 units.
4. **Cargo's share of 2024**: $\frac{400}{4000} = 10\%$.
5. **Ratio of City to Trail in 2024**: $1650 : 1320 = 5 : 4$.
6. **Pie chart**: food is $0.25 \times 60000 = 15000$; rent's sector is $30 \times 3.6 = 108°$. If rent rises 10% and everything but savings stays the same, savings fall by 1,800 to 10,200, which is 17% of income.

#### Code

The program recomputes every answer from the tables, including the totals row.

```cpp
// Unit sales by model, 2021 to 2024 (made up), and one month's spending shares.
map<string, array<double, 4>> sales = {{"City", {1200, 1350, 1500, 1650}},
                                       {"Trail", {800, 1000, 1100, 1320}},
                                       {"Kids", {600, 540, 600, 630}},
                                       {"Cargo", {150, 210, 300, 400}}};
map<string, double> share = {{"rent", 30}, {"food", 25}, {"transport", 10},
                             {"savings", 20}, {"other", 15}};  // percent of 60,000

double total(int year) {
    double t = 0;
    for (auto& [model, s] : sales) t += s[year];
    return t;
}
double pct(double from, double to) { return (to / from - 1) * 100; }

int main() {
    printf("totals: %g %g %g %g\n", total(0), total(1), total(2), total(3));
    printf("growth %.2f%%, CAGR %.2f%%, Cargo share %.2f%%\n", pct(total(0), total(3)),
           (pow(total(3) / total(0), 1.0 / 3) - 1) * 100, sales["Cargo"][3] / total(3) * 100);
    for (auto& [model, s] : sales)
        printf("  %-5s 2021 to 2024 %+4g units, %+7.2f%%, mean %g\n", model.c_str(), s[3] - s[0],
               pct(s[0], s[3]), (s[0] + s[1] + s[2] + s[3]) / 4);
    int g = gcd(1650, 1320);
    printf("City:Trail in 2024 = %d:%d; Kids 2022 change %+.0f%%\n", 1650 / g, 1320 / g,
           pct(sales["Kids"][0], sales["Kids"][1]));
    printf("food %g, rent angle %g degrees; savings after rent +10%%: %g (%.0f%%)\n",
           60000 * share["food"] / 100, share["rent"] * 3.6,
           60000 * (share["savings"] - share["rent"] / 10) / 100,
           share["savings"] - share["rent"] / 10);
    int best = 1;  // the year with the largest rise in total sales
    for (int y = 2; y < 4; ++y)
        if (total(y) - total(y - 1) > total(best) - total(best - 1)) best = y;
    int food = share["food"], rent = share["rent"], f = gcd(food, rent);
    printf("A: %.2f%% %.2f%% %.2f%% %d %g %.2f%%\n", pct(800, 1320), 1200 / total(0) * 100,
           pct(total(2), total(3)), 2021 + best, (600 + 540 + 600 + 630) / 4.0, 400.0 / 630 * 100);
    printf("B: %g %g %g%% %d:%d %g %g\n", 60000 * share["transport"] / 100, share["savings"] * 3.6,
           share["other"] + share["transport"], food / f, rent / f, 72000 * share["food"] / 100,
           (share["rent"] - share["food"]) * 3.6);
}
```

Output:

```text
totals: 2750 3100 3500 4000
growth 45.45%, CAGR 13.30%, Cargo share 10.00%
  Cargo 2021 to 2024 +250 units, +166.67%, mean 265
  City  2021 to 2024 +450 units,  +37.50%, mean 1425
  Kids  2021 to 2024  +30 units,   +5.00%, mean 592.5
  Trail 2021 to 2024 +520 units,  +65.00%, mean 1055
City:Trail in 2024 = 5:4; Kids 2022 change -10%
food 15000, rent angle 108 degrees; savings after rent +10%: 10200 (17%)
A: 65.00% 43.64% 14.29% 2024 592.5 63.49%
B: 6000 72 25% 5:6 18000 18
```

#### Traps

- **Percentage points and percent**: savings going from 20% to 17% of income is a fall of 3 points, or 15%.
- **Wrong base**: Kids fell from 600 to 540 (10%) and rose back to 600, which is an 11.1% rise.
- **Fastest growth vs largest increase**: Cargo grows fastest in percent (166.67%), but Trail adds the most units (520).

#### Timed practice

About 40 seconds per item; the key is lines A and B.

- **Line A (sales)**: Trail's growth from 2021 to 2024; City's share of 2021; total growth from 2023 to 2024; the year with the largest rise in total sales; the mean of Kids sales; Cargo's 2024 sales as a percentage of Kids'
- **Line B (spending)**: the amount spent on transport; the savings sector's angle in degrees; the share of other and transport together; food to rent as a ratio; food spending if income rises to 72,000 with the same shares; how many degrees rent's sector exceeds food's

Connects to: [percentages, profit and loss](#/concept/apt.quant.percentages-profit-and-loss), [ratios, proportions and averages](#/concept/apt.quant.ratios-proportions-and-averages), [approximations](#/concept/math.mental.approximations), [simple and compound interest](#/concept/apt.quant.simple-and-compound-interest).

### questions
Q: Total sales grew from 2,750 to 4,000 over three years. What is the average yearly growth?
A: The compound rate: (4000/2750) to the power 1/3 minus 1, about 13.3% a year. Dividing the total growth of 45.45% by 3 gives 15.15%, which overstates it because growth compounds.

Q: A pie chart shows rent at 30% of spending. What angle does its sector have?
A: 30% of 360 degrees, which is 108 degrees. Each percentage point is 3.6 degrees.

Q: How do you pick between close answer options quickly?
A: Estimate with rounded numbers first to rule out the far options, then compute exactly only the part that separates the remaining ones, such as the second significant figure of a ratio.

Q: What is the difference between a fall of 3 percentage points and a fall of 3 percent?
A: Points are a plain difference between two percentages, such as a share moving from 20% to 17%. That same move is a fall of 15% relative to the starting 20%.

Q: Which is larger in the table: the growth of Cargo or of City?
A: It depends on what "growth" means. Cargo grew more in percent (166.67% against 37.5%), but City added more units (450 against 250). Read whether the question asks for absolute or relative growth.
