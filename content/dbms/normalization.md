---
topic: dbms.normalization
name: "Normalization"
subject: dbms
order: 4
prereqs: [dbms.relational]
---

## dbms.normalization.anomalies
name: "Anomalies"
importance: must
scope: "insertion, update and deletion anomalies"

### simple
Anomalies are the problems that appear when one table stores several different facts mixed together. You cannot add some facts without inventing others, changing one fact means editing many rows, and deleting one fact can wipe out another by accident. It is like keeping a teacher's phone number on every student's report card: when the number changes, you must fix every card, and if the last card is thrown away, the number is lost.

### interview
- Anomalies come from **redundancy**: the same fact stored in many rows, because a table mixes more than one entity or relationship.
- **Insertion anomaly**: a fact cannot be recorded without an unrelated one (a new instructor with no students yet cannot be stored in an enrollments table).
- **Update anomaly**: changing one fact needs many row updates; missing one leaves the data **inconsistent** (two offices for one instructor).
- **Deletion anomaly**: deleting one fact removes another (the last student leaves a course and the instructor's office is lost).
- The cause is a **functional dependency** whose left side is not a key (instructor determines office, but instructor is not the table's key). The fix is **normalization**: split the table so each fact lives in one place.
- Anomalies are the practical reason behind 2NF, 3NF and BCNF.

### deep
#### The problem table

`enrollments(student, course, instructor, office)`: each row says a student takes a course, the course's instructor, and that instructor's office.

| student | course | instructor | office |
|---|---|---|---|
| asha | dbms | rao | B-201 |
| ravi | dbms | rao | B-201 |
| meera | os | iyer | C-105 |

Rao's office appears twice, and it will appear once per student in every course Rao teaches.

#### Code: the anomalies happening

```cpp
struct Row { string student, course, instructor, office; };

int main() {
    vector<Row> table = {{"asha", "dbms", "rao", "B-201"},
                         {"ravi", "dbms", "rao", "B-201"},
                         {"meera", "os", "iyer", "C-105"}};

    // Update anomaly: Rao moves, and the update only reaches the first matching row.
    for (auto& r : table)
        if (r.instructor == "rao") {
            r.office = "B-305";
            break;
        }
    set<string> offices;
    for (auto& r : table)
        if (r.instructor == "rao") offices.insert(r.office);
    cout << "rao's offices:";
    for (auto& o : offices) cout << " " << o;
    cout << "\n";

    // Deletion anomaly: Meera drops OS, the only row that mentions Iyer.
    erase_if(table, [](const Row& r) { return r.student == "meera"; });
    bool known = any_of(table.begin(), table.end(),
                        [](const Row& r) { return r.instructor == "iyer"; });
    cout << boolalpha << "iyer's office still known: " << known << "\n";

    // Insertion anomaly: a new instructor with no students has no row to live in.
    Row newInstructor{"", "", "khan", "D-110"};
    cout << "khan needs a fake enrollment: " << newInstructor.student.empty() << "\n";
}
```

Output:

```text
rao's offices: B-201 B-305
iyer's office still known: false
khan needs a fake enrollment: true
```

The database now claims Rao has two offices, has forgotten where Iyer sits, and can only store Khan by inventing an enrollment with an empty student (which a primary key on `(student, course)` would forbid).

#### The fix

Store each fact once, in a table whose key is the thing the fact is about:

| table | key | fact |
|---|---|---|
| `enrollments(student, course)` | (student, course) | who takes what |
| `courses(course, instructor)` | course | who teaches each course |
| `instructors(instructor, office)` | instructor | where each instructor sits |

Rao's move is now one row update, Meera's leaving deletes only an enrollment, and Khan can be inserted before teaching anyone. A join rebuilds the original view when needed.

#### Where it came from

The table contained two dependencies whose left side is not its key: `course → instructor` and `instructor → office`. Every such dependency means a fact repeated in many rows. Normal forms are precise versions of the rule "every fact depends on the key, the whole key, and nothing but the key".

#### Pitfalls

- Thinking redundancy only costs disk space: the real cost is inconsistency.
- Assuming an application will always update every copy: sooner or later one path forgets.
- Over-splitting in the other direction: normalization is guided by dependencies, not by making every table as small as possible.

Connects to: functional dependencies, normal forms, decomposition, denormalization.

### questions
Q: What are insertion, update and deletion anomalies?
A: An insertion anomaly means a fact cannot be stored without also storing unrelated data, such as an instructor with no students. An update anomaly means one fact is stored in many rows, so changing it requires many updates and missing one causes inconsistency. A deletion anomaly means deleting one fact accidentally removes another, such as losing an instructor's office when the last enrolled student leaves.

Q: What causes anomalies?
A: Redundancy from mixing several entities or relationships in one table. Technically, it is a functional dependency whose determinant is not a key of the table, so the dependent fact repeats in every row that shares the determinant.

Q: How does normalization remove anomalies?
A: It decomposes the table into smaller tables so that every fact is stored once, in a table keyed by what the fact depends on. Updates then touch a single row, and independent facts can be inserted or deleted separately. Joins reassemble the combined view.

Q: Is redundancy always bad?
A: It always risks inconsistency, but controlled redundancy is sometimes chosen deliberately for read performance, such as a cached total or a denormalized reporting table. Then something, such as a trigger, a job or the application, must keep the copies in sync.

## dbms.normalization.functional-dependencies
name: "Functional dependencies"
importance: must
prereqs: [dbms.relational.keys, dbms.normalization.anomalies]
scope: "closure, Armstrong's axioms"

### simple
A functional dependency says that knowing one set of values fixes another: if you know a student's roll number, you know their name. It is written roll → name and read "roll determines name". Dependencies are the rules that tell you which columns belong together and which column sets are keys.

### interview
- $X \to Y$: any two rows that agree on $X$ must agree on $Y$. It is a rule of the domain, not an accident of current data.
- **Trivial** FD: $Y \subseteq X$ (such as $AB \to A$).
- **Armstrong's axioms** (sound and complete): **reflexivity** (if $Y \subseteq X$ then $X \to Y$), **augmentation** (if $X \to Y$ then $XZ \to YZ$), **transitivity** (if $X \to Y$ and $Y \to Z$ then $X \to Z$). Derived rules: **union**, **decomposition**, pseudotransitivity.
- **Attribute closure** $X^+$: everything $X$ determines. Algorithm: start with $X$, repeatedly add the right side of any FD whose left side is already inside, until nothing changes.
- **Uses of closure**: test whether $X \to Y$ follows ($Y \subseteq X^+$), test whether $X$ is a **superkey** ($X^+$ = all attributes), and find **candidate keys**.
- Shortcut for keys: attributes that never appear on any right side must be in **every** candidate key.

### deep
#### Intuition

A dependency is a promise about the world: a roll number is never shared, so it fixes the name; a course code fixes its title. Chaining promises gives new ones: if roll fixes department and department fixes building, roll fixes building. Closure computes all the consequences mechanically.

#### Worked example by hand

$R(A, B, C, D, E)$ with $F = \{A \to B,\ B \to C,\ CD \to E\}$.

Compute $\{A, D\}^+$:

| step | closure | FD used |
|---|---|---|
| start | A D | |
| 1 | A B D | $A \to B$ |
| 2 | A B C D | $B \to C$ |
| 3 | A B C D E | $CD \to E$ |

$\{A, D\}^+$ is everything, so AD is a superkey. Neither $A^+ = \{A, B, C\}$ nor $D^+ = \{D\}$ is everything, so AD is minimal: a **candidate key**. A and D appear on no right side, so every key must contain both: AD is the only candidate key.

The same fact through Armstrong's axioms: $A \to B$ and $B \to C$ give $A \to C$ (transitivity); augmenting with D gives $AD \to CD$; with $CD \to E$, transitivity gives $AD \to E$.

#### Code: closure and candidate keys

```cpp
using Attrs = unsigned;                              // bit i set means attribute 'A' + i
struct FD { Attrs lhs, rhs; };

Attrs attrs(const string& s) {
    Attrs a = 0;
    for (char c : s) a |= 1u << (c - 'A');
    return a;
}
string name(Attrs a) {
    string s;
    for (int i = 0; i < 26; ++i)
        if (a >> i & 1) s += char('A' + i);
    return s;
}

Attrs closure(Attrs x, const vector<FD>& fds) {
    for (bool grew = true; grew;) {
        grew = false;
        for (auto& f : fds)
            if ((f.lhs & x) == f.lhs && (f.rhs & ~x)) {   // lhs inside, rhs adds something
                x |= f.rhs;
                grew = true;
            }
    }
    return x;
}

vector<Attrs> candidateKeys(Attrs all, const vector<FD>& fds) {
    vector<Attrs> keys;
    for (Attrs x = 1; x <= all; ++x) {               // every subset of the attributes
        if ((x & all) != x || closure(x, fds) != all) continue;
        bool minimal = none_of(keys.begin(), keys.end(),
                               [x](Attrs k) { return (k & x) == k; });
        if (minimal) keys.push_back(x);              // smaller keys were found first
    }
    return keys;
}

int main() {
    vector<FD> f = {{attrs("A"), attrs("B")}, {attrs("B"), attrs("C")}, {attrs("CD"), attrs("E")}};
    for (string x : {"A", "D", "AD", "BD"})
        cout << x << "+ = " << name(closure(attrs(x), f)) << "\n";
    cout << "candidate keys:";
    for (Attrs k : candidateKeys(attrs("ABCDE"), f)) cout << " " << name(k);
    cout << "\n";
}
```

Output:

```text
A+ = ABC
D+ = D
AD+ = ABCDE
BD+ = BCDE
candidate keys: AD
```

`BD` determines everything except A, so it is not a key. Looping over subsets in numeric order visits every subset of a set before the set itself, so any superset of an earlier key is skipped. Enumerating subsets is exponential, which is fine for textbook relations with a handful of attributes.

#### Pitfalls

- Reading FDs off sample data: two rows that happen to agree prove nothing.
- Confusing $X \to Y$ with $Y \to X$: roll determines name, not the reverse.
- Forgetting derived dependencies when checking normal forms: $A \to C$ was never written down but holds.

Connects to: keys, anomalies, normal forms, decomposition, minimal cover and higher normal forms.

### questions
Q: What is a functional dependency?
A: X determines Y, written X to Y, means that any two rows with the same values for X must have the same values for Y. For example, a roll number determines a student's name. It is a constraint from the meaning of the data.

Q: State Armstrong's axioms.
A: Reflexivity: if Y is a subset of X, then X determines Y. Augmentation: if X determines Y, then XZ determines YZ for any Z. Transitivity: if X determines Y and Y determines Z, then X determines Z. They are sound and complete: they derive exactly the dependencies that logically follow.

Q: How do you compute the closure of a set of attributes?
A: Start with the set itself. Repeatedly scan the dependencies, and whenever a dependency's left side is contained in the current set, add its right side. Stop when a full pass adds nothing; the result is everything the original set determines.

Q: How do you find the candidate keys of a relation?
A: Attributes that never appear on the right side of any dependency must be in every key, so start from them and compute their closure. If it covers all attributes, they form the only key; otherwise add other attributes in increasing combinations, keeping only minimal sets whose closure is everything.

Q: With A to B and B to C, is A to C implied? How would you check?
A: Yes, by transitivity. To check mechanically, compute the closure of A: it adds B through A to B, then C through B to C, so C is in the closure of A and A to C holds.

## dbms.normalization.normal-forms
name: "Normal forms"
importance: must
prereqs: [dbms.normalization.functional-dependencies]
scope: "1NF, 2NF, 3NF, BCNF with examples"

### simple
Normal forms are levels of table design, each removing a kind of redundancy that causes update problems. First normal form means one value per cell, and each higher form adds a rule about which columns may determine which. The short version: every column should depend on the key, the whole key, and nothing but the key.

### interview
- **1NF**: every value is **atomic**; no repeating groups or lists in a cell; rows are unique (a key exists).
- **2NF**: 1NF and no **partial dependency**: no non-prime attribute depends on only **part** of a candidate key. Only relevant with composite keys.
- **3NF**: 2NF and no **transitive dependency** of a non-prime attribute on a key. Formally, for every nontrivial $X \to A$: $X$ is a superkey **or** $A$ is **prime** (part of some candidate key).
- **BCNF**: for every nontrivial $X \to A$, $X$ is a **superkey**. Stricter than 3NF: it drops the "or A is prime" escape.
- Every BCNF relation is in 3NF, every 3NF in 2NF. A lossless, dependency-preserving 3NF decomposition always exists; BCNF sometimes cannot preserve all dependencies.
- **Prime attribute**: one that belongs to at least one candidate key. In practice most well-designed tables reach BCNF, and 3NF is the usual stopping point in textbooks.

### deep
#### Examples, one per level

| relation | dependencies | keys | highest form | why not higher |
|---|---|---|---|---|
| R1(student, course, name, grade) | student → name; student course → grade | {student, course} | 1NF | name depends on part of the key |
| R2(emp, dept, head) | emp → dept; dept → head | {emp} | 2NF | head depends on emp only through dept (transitive) |
| R3(student, subject, teacher) | student subject → teacher; teacher → subject | {student, subject}, {student, teacher} | 3NF | teacher is not a superkey, but subject is prime |
| R4(emp, name, dept) | emp → name dept | {emp} | BCNF | |

R3 is the classic 3NF-but-not-BCNF case: each teacher teaches one subject, and a student has one teacher per subject.

#### Code: finding the highest normal form

```cpp
using Attrs = unsigned;
struct FD { Attrs lhs, rhs; };

struct Relation {
    vector<string> names;                            // attribute i is names[i]
    vector<FD> fds;

    Attrs of(const string& list) const {             // "student course" -> bits
        istringstream in(list);
        Attrs a = 0;
        for (string w; in >> w;)
            a |= 1u << (find(names.begin(), names.end(), w) - names.begin());
        return a;
    }
    Attrs all() const { return (1u << names.size()) - 1; }
    Attrs closure(Attrs x) const {
        for (bool grew = true; grew;) {
            grew = false;
            for (auto& f : fds)
                if ((f.lhs & x) == f.lhs && (f.rhs & ~x)) x |= f.rhs, grew = true;
        }
        return x;
    }
    vector<Attrs> keys() const {
        vector<Attrs> ks;
        for (Attrs x = 1; x <= all(); ++x)
            if (closure(x) == all() &&
                none_of(ks.begin(), ks.end(), [x](Attrs k) { return (k & x) == k; }))
                ks.push_back(x);
        return ks;
    }
    string highestForm() const {
        auto ks = keys();
        Attrs prime = 0;
        for (Attrs k : ks) prime |= k;
        for (Attrs k : ks)                           // 2NF: no part of a key fixes a non-prime
            for (Attrs part = (k - 1) & k; part; part = (part - 1) & k)
                if (closure(part) & ~part & ~prime) return "1NF";
        bool bcnf = true;
        for (auto& f : fds) {
            Attrs added = f.rhs & ~f.lhs;            // ignore the trivial part
            if (!added || closure(f.lhs) == all()) continue;
            bcnf = false;                            // lhs is not a superkey
            if (added & ~prime) return "2NF";        // and a non-prime depends on it
        }
        return bcnf ? "BCNF" : "3NF";
    }
};

Relation make(vector<string> names, vector<pair<string, string>> deps) {
    Relation r{names, {}};
    for (auto& [l, rhs] : deps) r.fds.push_back({r.of(l), r.of(rhs)});
    return r;
}

int main() {
    cout << "R1 " << make({"student", "course", "name", "grade"},
                          {{"student", "name"}, {"student course", "grade"}}).highestForm() << "\n";
    cout << "R2 " << make({"emp", "dept", "head"},
                          {{"emp", "dept"}, {"dept", "head"}}).highestForm() << "\n";
    cout << "R3 " << make({"student", "subject", "teacher"},
                          {{"student subject", "teacher"}, {"teacher", "subject"}}).highestForm()
         << "\n";
    cout << "R4 " << make({"emp", "name", "dept"}, {{"emp", "name dept"}}).highestForm() << "\n";
}
```

Output:

```text
R1 1NF
R2 2NF
R3 3NF
R4 BCNF
```

The 3NF and BCNF tests only need the given dependencies (checking $F$ rather than its full closure is enough when $F$ describes this relation), while the 2NF test checks the closure of every proper part of every key, so derived partial dependencies are caught too.

#### Fixing each one

- **R1 to 2NF**: move the partial dependency out: `students(student, name)` and `grades(student, course, grade)`.
- **R2 to 3NF**: move the transitive dependency out: `employees(emp, dept)` and `departments(dept, head)`.
- **R3 to BCNF**: `teaches(teacher, subject)` and `takes(student, teacher)`. It is lossless, but "a student has one teacher per subject" can no longer be checked within a single table (see decomposition).

#### 1NF in practice

A `tags` column holding `"sql, joins, mysql"` breaks 1NF: searching, counting or indexing individual tags becomes string parsing. Use a `post_tags(post_id, tag)` table. Arrays and JSON columns are a deliberate exception some databases support, at the cost of these same problems.

Connects to: functional dependencies, anomalies, decomposition, denormalization, ER to relational mapping.

### questions
Q: Explain 1NF, 2NF, 3NF and BCNF.
A: 1NF requires atomic values and no repeating groups. 2NF additionally forbids non-prime attributes depending on part of a candidate key. 3NF requires that for every nontrivial dependency, the left side is a superkey or the right side is a prime attribute, which removes transitive dependencies. BCNF requires the left side of every nontrivial dependency to be a superkey.

Q: What is the difference between 3NF and BCNF? Give an example.
A: 3NF allows a dependency whose left side is not a superkey if its right side is a prime attribute; BCNF does not. In R(student, subject, teacher) where student and subject determine teacher and teacher determines subject, subject is prime, so the relation is in 3NF, but teacher is not a superkey, so it is not in BCNF.

Q: What is a partial dependency and why does it violate 2NF?
A: A non-prime attribute that depends on only part of a composite candidate key, such as student name depending on student alone in a table keyed by student and course. The name then repeats for every course the student takes, causing update anomalies.

Q: What is a transitive dependency?
A: A non-key attribute depending on the key through another non-key attribute, such as employee to department to department head. The head repeats for every employee in the department, so 3NF moves department and head to their own table.

Q: Why might a designer stop at 3NF instead of BCNF?
A: Decomposing into BCNF is always lossless but can lose dependency preservation, so some constraints could no longer be enforced within a single table. 3NF decompositions can always preserve every dependency, at the cost of a little redundancy.

## dbms.normalization.decomposition
name: "Decomposition"
importance: important
prereqs: [dbms.normalization.normal-forms]
scope: "lossless join and dependency preservation"

### simple
Decomposition splits a table into smaller tables to remove redundancy. A good split is lossless, meaning joining the pieces gives back exactly the original rows and nothing extra. Ideally it also preserves dependencies, so every rule can still be checked inside one table, like cutting a photo into puzzle pieces that fit back together perfectly.

### interview
- **Lossless join**: joining the decomposed tables returns exactly the original relation. A bad split creates **spurious tuples** (extra rows that were never true).
- Test for a binary split into $R_1, R_2$: lossless iff $(R_1 \cap R_2) \to R_1$ or $(R_1 \cap R_2) \to R_2$, meaning the shared columns are a key of at least one side.
- **Dependency preservation**: the union of the dependencies that hold within each piece implies all original dependencies, so each can be enforced without joins.
- **BCNF decomposition** is always lossless but may not preserve dependencies. **3NF synthesis** (from a minimal cover) is always lossless and dependency preserving.
- Lossless is mandatory (otherwise the data is wrong); dependency preservation is desirable (otherwise some constraints need triggers or joins to check).

### deep
#### Code: a lossless and a lossy split

Data for `R(student, subject, teacher)`, where each teacher teaches one subject:

```cpp
using Row = vector<string>;                          // student, subject, teacher

set<Row> join(const set<Row>& a, int ak, const set<Row>& b, int bk) {
    set<Row> out;                                    // natural join on one shared column
    for (auto& x : a)
        for (auto& y : b)
            if (x[ak] == y[bk]) {
                Row r = x;
                for (int i = 0; i < int(y.size()); ++i)
                    if (i != bk) r.push_back(y[i]);
                out.insert(r);
            }
    return out;
}

int main() {
    set<Row> r = {{"asha", "dbms", "rao"}, {"asha", "os", "iyer"},
                  {"ravi", "dbms", "khan"}, {"ravi", "os", "iyer"}};
    set<Row> takes, teaches, studies, taughtBy;
    for (auto& t : r) {
        takes.insert({t[0], t[2]});                  // (student, teacher)
        teaches.insert({t[2], t[1]});                // (teacher, subject)
        studies.insert({t[0], t[1]});                // (student, subject)
        taughtBy.insert({t[1], t[2]});               // (subject, teacher)
    }
    auto good = join(takes, 1, teaches, 0);          // shared column: teacher
    auto bad = join(studies, 1, taughtBy, 0);        // shared column: subject
    cout << "split on teacher: " << good.size() << " rows\n";
    cout << "split on subject: " << bad.size() << " rows, spurious:";
    for (auto& row : bad) {
        Row original = {row[0], row[1], row[2]};     // (student, subject, teacher)
        if (!r.count(original)) cout << " (" << row[0] << " " << row[1] << " " << row[2] << ")";
    }
    cout << "\n";
}
```

Output:

```text
split on teacher: 4 rows
split on subject: 6 rows, spurious: (asha dbms khan) (ravi dbms rao)
```

Splitting on teacher is lossless because teacher → subject: the shared column is a key of `teaches`. Splitting on subject is lossy: DBMS has two teachers, so each DBMS student gets matched with both, inventing two rows. The good split's row order differs from the original columns, but it holds exactly the four original facts.

#### Dependency preservation

The lossless split `takes(student, teacher)` + `teaches(teacher, subject)` is in BCNF, but the rule "a student has one teacher per subject" ($student\ subject \to teacher$) mentions columns from both tables. Nothing stops inserting `(asha, khan)` into `takes`, giving Asha two DBMS teachers, unless a trigger or a join-based check enforces it. Keeping `R` in 3NF instead preserves the rule at the price of repeating teacher-subject pairs.

#### The algorithms, briefly

- **BCNF decomposition**: while some table has a violating $X \to Y$, split it into $XY$ and $R - (Y - X)$. Each split shares $X$, a key of $XY$, so it is lossless.
- **3NF synthesis**: compute a minimal cover; make a table for each dependency $X \to Y$ as $XY$; if no table contains a candidate key, add one; drop tables contained in others.

Connects to: normal forms, functional dependencies, minimal cover and higher normal forms, joins.

### questions
Q: What is a lossless join decomposition?
A: A decomposition where naturally joining the resulting tables always reproduces exactly the original relation, with no rows lost and no spurious rows added. For a split into two tables, it holds when the common attributes form a key of at least one of them.

Q: What are spurious tuples?
A: Rows that appear when a lossy decomposition is joined back but were not in the original data. They arise when the shared columns do not determine either side, so rows that merely share a value get combined.

Q: What is dependency preservation and why does it matter?
A: A decomposition preserves dependencies if every original functional dependency can be checked using only the dependencies within individual tables. Without it, enforcing some rules requires joining tables on every change, or triggers.

Q: Can you always decompose into BCNF while preserving dependencies?
A: No. A lossless BCNF decomposition always exists, but some relations, such as student, subject and teacher with teacher determining subject, cannot be put into BCNF without losing a dependency. 3NF synthesis always achieves both lossless join and dependency preservation.

## dbms.normalization.minimal-cover-and-higher-normal-forms
name: "Minimal cover and higher normal forms"
importance: advanced
prereqs: [dbms.normalization.normal-forms]
scope: "4NF, 5NF"

### simple
A minimal cover is the smallest clean set of rules that says the same thing as the original set of functional dependencies, with nothing repeated or unnecessary. Higher normal forms, 4NF and 5NF, deal with a different kind of redundancy: independent lists squeezed into one table. It is like listing a course's teachers and its textbooks in one table, which forces every teacher to be paired with every book.

### interview
- **Minimal (canonical) cover** of $F$: an equivalent set where every right side is a single attribute, no left side has an **extraneous** attribute, and no dependency is **redundant**. It is the starting point for 3NF synthesis.
- Steps: split right sides; for each $XA \to B$, drop $A$ if $B \in X^+$; drop any $X \to B$ that follows from the others.
- **Multivalued dependency** $X \twoheadrightarrow Y$: for each $X$ value, the set of $Y$ values is independent of the other attributes.
- **4NF**: for every nontrivial MVD $X \twoheadrightarrow Y$, $X$ is a superkey. Fix by splitting independent multivalued facts into separate tables.
- **5NF** (project-join normal form): no nontrivial **join dependency** that is not implied by candidate keys; a table that can only be rebuilt from three or more projections should be split into them. Rare in practice.

### deep
#### Code: a minimal cover

$F = \{A \to BC,\ B \to C,\ A \to B,\ AB \to C\}$.

```cpp
using Attrs = unsigned;
struct FD { Attrs lhs, rhs; };

Attrs closure(Attrs x, const vector<FD>& fds) {
    for (bool grew = true; grew;) {
        grew = false;
        for (auto& f : fds)
            if ((f.lhs & x) == f.lhs && (f.rhs & ~x)) x |= f.rhs, grew = true;
    }
    return x;
}
Attrs a(const string& s) {
    Attrs r = 0;
    for (char c : s) r |= 1u << (c - 'A');
    return r;
}
string str(Attrs x) {
    string s;
    for (int i = 0; i < 26; ++i)
        if (x >> i & 1) s += char('A' + i);
    return s;
}

vector<FD> minimalCover(const vector<FD>& f) {
    vector<FD> g;
    for (auto& d : f)                                // 1. single attributes on the right
        for (int i = 0; i < 26; ++i)
            if (d.rhs >> i & 1) g.push_back({d.lhs, 1u << i});
    for (auto& d : g)                                // 2. drop extraneous left attributes
        for (int i = 0; i < 26; ++i)
            if ((d.lhs >> i & 1) && d.lhs != (1u << i) &&
                (closure(d.lhs & ~(1u << i), g) & d.rhs))
                d.lhs &= ~(1u << i);
    for (size_t i = 0; i < g.size();) {              // 3. drop redundant dependencies
        vector<FD> rest = g;
        rest.erase(rest.begin() + i);
        bool duplicate = false;
        for (size_t j = 0; j < i; ++j)
            duplicate |= g[j].lhs == g[i].lhs && g[j].rhs == g[i].rhs;
        if (duplicate || (closure(g[i].lhs, rest) & g[i].rhs)) g = rest;
        else ++i;
    }
    return g;
}

int main() {
    vector<FD> f = {{a("A"), a("BC")}, {a("B"), a("C")}, {a("A"), a("B")}, {a("AB"), a("C")}};
    for (auto& d : minimalCover(f)) cout << str(d.lhs) << " -> " << str(d.rhs) << "\n";
}
```

Output:

```text
A -> B
B -> C
```

Splitting gives $A \to B$, $A \to C$, $B \to C$, $A \to B$, $AB \to C$. In $AB \to C$, B is extraneous because $A^+$ already contains C, leaving another $A \to C$. Finally $A \to C$ is redundant (it follows from $A \to B$ and $B \to C$), and the duplicate $A \to B$ goes too.

#### 4NF: independent multivalued facts

A course has several teachers and several textbooks, and any teacher may use any book:

| course | teacher | book |
|---|---|---|
| dbms | rao | Navathe |
| dbms | rao | Korth |
| dbms | khan | Navathe |
| dbms | khan | Korth |

No functional dependency is violated (the only key is all three columns, so the table is in BCNF), yet adding a third book needs two new rows. The MVDs $course \twoheadrightarrow teacher$ and $course \twoheadrightarrow book$ have a non-superkey left side, so 4NF splits it into `course_teachers(course, teacher)` and `course_books(course, book)`.

#### 5NF

If a table records which supplier supplies which part to which project, and the rule is "a supplier supplies a part to a project whenever the supplier supplies that part, supplies that project, and the project uses that part", the table can be rebuilt from its three pairwise projections, which 5NF says to store instead. Without such a rule the three-way table is already correct and in 5NF.

Connects to: functional dependencies, normal forms, decomposition.

### questions
Q: What is a minimal cover of a set of functional dependencies?
A: An equivalent set of dependencies in which every right side is a single attribute, no left side contains an attribute that can be removed without changing what is implied, and no dependency can be dropped because it follows from the others. It is used as the input to 3NF synthesis.

Q: What is a multivalued dependency?
A: X multidetermines Y when, for each value of X, the set of associated Y values is independent of the values of the remaining attributes. It typically arises when two independent one-to-many facts about X are stored in the same table.

Q: What does 4NF require and how do you achieve it?
A: For every nontrivial multivalued dependency, the left side must be a superkey. You achieve it by splitting each independent multivalued fact into its own table, such as course with teachers and course with textbooks.

Q: What is 5NF?
A: Also called project-join normal form, it requires that every join dependency is implied by the candidate keys. A table that can be losslessly rebuilt from three or more of its projections, but not from two, should be stored as those projections.

## dbms.normalization.denormalization
name: "Denormalization"
importance: important
prereqs: [dbms.normalization.normal-forms]
scope: "when and why to break the rules"

### simple
Denormalization means deliberately storing some data twice so that common reads are faster, accepting the extra work of keeping the copies in sync. It is like writing a friend's phone number in both your phone and your diary so you can reach them quickly either way, and remembering to update both. It is a performance trade, made only after the normalized design is understood.

### interview
- **What**: adding redundant columns or tables (a precomputed `comment_count`, the author's name copied into each post, an order's `total`, a reporting table joining several sources).
- **Why**: avoid expensive joins and aggregations on hot read paths, serve read-heavy workloads, build analytics schemas (star schemas with wide dimension tables), and fit document or wide-column stores, where joins are limited.
- **Cost**: more storage, slower and more complex writes, and the risk of **inconsistency** (update anomalies return).
- **Keeping copies in sync**: the same transaction as the source update, triggers, materialized views, change data capture or background jobs (accepting staleness).
- Rule of thumb: normalize first, measure, then denormalize specific hot paths with a clear owner for consistency. Often an index, a cache or a materialized view solves the problem with less risk.

### deep
#### Worked example: a counter

Showing posts with their comment counts, normalized:

```sql
SELECT p.id, p.title, COUNT(c.id) AS comments
FROM posts p LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id, p.title
ORDER BY p.id;
```

Every page view counts comments again. Denormalized, `posts` gets a `comment_count` column, and adding a comment updates both tables in one transaction:

```sql
BEGIN;
INSERT INTO comments (post_id, body) VALUES (7, 'Nice explanation');
UPDATE posts SET comment_count = comment_count + 1 WHERE id = 7;
COMMIT;
```

Reads become a single-row lookup. The price: every path that adds or deletes comments must update the counter, a busy post's row becomes a write hot spot, and a bug that forgets the update leaves the count wrong until someone recomputes it.

#### When it is worth it

| situation | example | safer alternative to try first |
|---|---|---|
| hot aggregate | likes and comment counts | index on the foreign key, a cache |
| expensive join on every read | author name on every post | join with good indexes |
| analytics | sales fact table with wide dimensions | materialized views, a separate warehouse |
| document store | embedding an address in an order | (the natural model there) |
| historical truth | the price at the time of the order | (this is not redundancy: the fact differs) |

The last row matters: copying the product's price into `order_items` is not denormalization, because the order's price is a different fact from today's price and must not change when the catalog changes.

#### Pitfalls

- Denormalizing before measuring: most slow queries are missing indexes.
- Leaving no single place responsible for updating the copies.
- Forgetting deletes: removing a comment must decrement the counter too.

Connects to: normal forms, anomalies, views and materialized views, SQL vs NoSQL, caching.

### questions
Q: What is denormalization and why would you do it?
A: Deliberately adding redundant data, such as precomputed aggregates or copied columns, to a normalized design so frequent reads avoid joins or aggregations. It speeds up read-heavy paths and analytics at the cost of more storage, slower writes and the need to keep copies consistent.

Q: What are the risks of denormalization?
A: The update anomalies normalization removed come back: a copy can be missed during an update and become inconsistent. Writes become more complex and slower, and hot counters can create contention on single rows.

Q: How can you keep denormalized data consistent?
A: Update the copy in the same transaction as the source, use triggers, use materialized views that the database refreshes, stream changes with change data capture into the copies, or run periodic jobs that recompute them, accepting some staleness.

Q: Is storing the product price in each order line denormalization?
A: No. The price at the time of the order is a separate historical fact that must not change when the catalog price changes later. Storing it is correct modeling, not redundancy.
