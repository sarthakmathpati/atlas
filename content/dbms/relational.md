---
topic: dbms.relational
name: "Relational model"
subject: dbms
order: 3
prereqs: [dbms.er]
---

## dbms.relational.keys
name: "Keys"
importance: must
scope: "super, candidate, primary, alternate, foreign, composite"

### simple
A key is a column, or a group of columns, whose values pick out exactly one row in a table, like a roll number picks out one student. A table can have several possible keys, and one is chosen as the main one, the primary key. A foreign key is a column that points to a key in another table, like an order that names the customer who placed it.

### interview
- **Superkey**: any set of attributes that uniquely identifies every row (all columns together always do).
- **Candidate key**: a **minimal** superkey: remove any attribute and it stops being unique. A table can have several (`roll_no`, `email`).
- **Primary key**: the candidate key chosen as the main identifier; unique and **not null**; usually the basis of the clustered index. The other candidate keys are **alternate keys** (enforce them with `UNIQUE`).
- **Composite key**: a key made of two or more columns (`(student_id, course_id)` in enrollments).
- **Foreign key**: columns that reference a candidate key (usually the primary key) of another or the same table, enforcing **referential integrity**.
- **Surrogate key** (an auto-increment number or UUID with no business meaning) vs **natural key** (email, ISBN): surrogates are stable and compact; natural keys can change. Keys come from the **meaning** of data, not from what happens to be unique today.

### deep
#### Intuition

Rows in a relation form a set, so no two are identical, and some subset of columns always tells them apart. Keys name the smallest such subsets. Choosing and declaring them is what lets the database reject duplicates and lets other tables point at rows reliably.

#### The hierarchy

```text
all attribute sets
  └─ superkeys: unique for every row
       └─ candidate keys: minimal superkeys
            ├─ primary key: the one chosen
            └─ alternate keys: the rest (declared UNIQUE)
```

#### Code: which column sets are unique here?

The program checks every subset of columns of a small `students` table and prints the minimal ones that are unique on this data.

```cpp
int main() {
    vector<string> cols = {"roll", "email", "name", "dept", "phone"};
    vector<vector<string>> rows = {
        {"1", "asha@uni.edu", "Asha", "cs", "111"},
        {"2", "ravi@uni.edu", "Ravi", "ee", "222"},
        {"3", "a.k@uni.edu", "Asha", "ee", "333"},
        {"4", "meera@uni.edu", "Meera", "cs", "111"},   // shares a family phone
    };
    int n = cols.size();
    auto unique = [&](int mask) {                    // no two rows agree on these columns
        set<vector<string>> seen;
        for (auto& r : rows) {
            vector<string> key;
            for (int c = 0; c < n; ++c)
                if (mask >> c & 1) key.push_back(r[c]);
            if (!seen.insert(key).second) return false;
        }
        return true;
    };
    int superkeys = 0;
    vector<int> minimal;
    for (int mask = 1; mask < 1 << n; ++mask) {
        if (!unique(mask)) continue;
        ++superkeys;
        bool hasSmaller = false;                     // is a proper subset already unique?
        for (int sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask)
            hasSmaller |= unique(sub);
        if (!hasSmaller) minimal.push_back(mask);
    }
    cout << superkeys << " unique column sets; minimal ones:\n";
    for (int mask : minimal) {
        cout << " ";
        for (int c = 0; c < n; ++c)
            if (mask >> c & 1) cout << " " << cols[c];
        cout << "\n";
    }
}
```

Output:

```text
27 unique column sets; minimal ones:
  roll
  email
  name dept
  name phone
```

`roll` and `email` are true candidate keys: the rules of the college guarantee them. `name dept` and `name phone` are unique only by luck; the next student called Asha in computer science breaks the first. Data can disprove a key but never prove one, so keys are declared from the meaning of the columns: here `roll` becomes the primary key and `email` an alternate key with a `UNIQUE` constraint.

#### Declaring them

```sql
CREATE TABLE students (
    roll  INT PRIMARY KEY,                  -- primary key
    email VARCHAR(100) NOT NULL UNIQUE,     -- alternate key
    name  VARCHAR(50) NOT NULL,
    dept  VARCHAR(10) NOT NULL
);

CREATE TABLE enrollments (
    roll      INT REFERENCES students(roll),   -- foreign key
    course_id VARCHAR(10),
    PRIMARY KEY (roll, course_id)              -- composite key
);
```

#### Surrogate or natural?

| | natural key (email, ISBN) | surrogate key (id, UUID) |
|---|---|---|
| meaning | real-world identifier | none |
| stability | can change (a new email) | never changes |
| size | often long strings | small integer or 16 bytes |
| duplicates in the real world | possible (typos, shared values) | impossible |

A common design: a surrogate primary key for joins and foreign keys, plus `UNIQUE` on the natural key to keep the business rule.

#### Pitfalls

- Declaring only a surrogate key and forgetting the natural one's `UNIQUE`: the same customer gets inserted twice with two ids.
- Random UUIDs as clustered primary keys scatter inserts across the index; time-ordered ids behave better.
- Treating "unique in the current data" as a key.

Connects to: integrity constraints, functional dependencies, normal forms, clustered vs non-clustered indexes, ER to relational mapping.

### questions
Q: What is the difference between a superkey, a candidate key and a primary key?
A: A superkey is any set of columns that uniquely identifies each row. A candidate key is a minimal superkey, one with no removable column. The primary key is the candidate key chosen as the table's main identifier; it must be unique and not null, and the remaining candidate keys are alternate keys.

Q: What is a foreign key?
A: One or more columns in a table whose values must match a candidate key, usually the primary key, of another table or the same table, or be null. It links related rows and lets the database enforce referential integrity.

Q: What is a composite key? Give an example.
A: A key made of more than one column, where no single column is unique on its own. An enrollments table uses student id plus course id: a student appears in many rows and so does a course, but each pair appears once.

Q: Should you use natural or surrogate primary keys?
A: Surrogate keys are small, stable and meaningless, so they never need updating and make joins cheap, while natural keys can change or have real-world duplicates. A common approach is a surrogate primary key plus a unique constraint on the natural key to preserve the business rule.

Q: Can you find the keys of a table by looking at its data?
A: Not reliably. Data can show that a column set is not unique, but a set that happens to be unique today may not be tomorrow. Keys come from the meaning of the data and the business rules, and are then declared so the database enforces them.

## dbms.relational.integrity-constraints
name: "Integrity constraints"
importance: must
prereqs: [dbms.relational.keys]
scope: "entity integrity, referential integrity, domain constraints"

### simple
Integrity constraints are rules the database enforces so bad data never gets in: every value has the right type, every row can be identified, and every reference points to something that exists. It is like a form that will not submit until required fields are filled and the dates make sense. Because the database checks the rules itself, every app that uses it gets the same protection.

### interview
- **Domain constraints**: each value comes from the column's domain: data type, `NOT NULL`, `CHECK (balance >= 0)`, `DEFAULT`, enumerated values.
- **Key constraints**: `PRIMARY KEY` and `UNIQUE` forbid duplicate key values.
- **Entity integrity**: primary key columns are **never null**, otherwise a row could not be identified.
- **Referential integrity**: a foreign key value must match an existing referenced key or be null. On delete or update of the referenced row: `RESTRICT` / `NO ACTION` (refuse), `CASCADE` (delete or update the children), `SET NULL`, `SET DEFAULT`.
- Constraints can be **deferred** to commit time (standard SQL, PostgreSQL), which helps with circular references.
- Rules beyond these (a manager earns more than their reports) need **triggers**, assertions (rarely supported) or application logic.

### deep
#### Intuition

Every application that writes to a database is a chance for bad data. Constraints move the rules into the one place all writes pass through, so a forgotten check in one service cannot corrupt the data everyone relies on.

#### Worked example

```sql
CREATE TABLE departments (
    dept_id INT PRIMARY KEY,
    name    VARCHAR(50) NOT NULL
);

CREATE TABLE employees (
    emp_id  INT PRIMARY KEY,
    name    VARCHAR(50) NOT NULL,
    salary  INT CHECK (salary > 0),
    dept_id INT REFERENCES departments(dept_id) ON DELETE SET NULL
);

INSERT INTO departments VALUES (10, 'Research'), (20, 'Sales');
INSERT INTO employees VALUES (1, 'Asha', 90000, 10), (2, 'Ravi', 70000, 20);

INSERT INTO employees VALUES (1, 'Meera', 80000, 10);   -- fails: duplicate key 1
INSERT INTO employees VALUES (NULL, 'Meera', 80000, 10);-- fails: null primary key
INSERT INTO employees VALUES (3, 'Meera', -5, 10);      -- fails: CHECK (salary > 0)
INSERT INTO employees VALUES (3, 'Meera', 80000, 99);   -- fails: department 99 does not exist
INSERT INTO employees VALUES (3, 'Meera', 80000, NULL); -- works: a null foreign key is allowed

DELETE FROM departments WHERE dept_id = 20;             -- works: Ravi's dept_id becomes NULL
SELECT emp_id, name, dept_id FROM employees ORDER BY emp_id;
```

The final query returns `(1, Asha, 10)`, `(2, Ravi, NULL)` and `(3, Meera, NULL)`. The four failing inserts each broke a different kind of constraint: key, entity integrity, domain and referential.

#### Choosing the referential action

| action on deleting a department | effect on its employees | use when |
|---|---|---|
| `RESTRICT` / `NO ACTION` (default) | the delete fails while employees exist | children must be handled deliberately |
| `CASCADE` | employees are deleted too | children cannot exist alone (order lines, dependents) |
| `SET NULL` | their `dept_id` becomes NULL | the link is optional |
| `SET DEFAULT` | their `dept_id` becomes the default | a catch-all "unassigned" department exists |

`CASCADE` is powerful and dangerous: one delete can remove thousands of rows through several levels.

#### Constraints and performance

Constraint checks cost a little on every write: a foreign key check is an index lookup in the parent table, and deleting a parent needs to find its children, so **index the foreign key column** in the child table. Some teams drop foreign keys at very large scale or across shards and check in code instead; that trades safety for throughput and should be a deliberate choice.

#### Pitfalls

- `NULL` in a `UNIQUE` column: most databases allow many nulls, since null is not equal to null.
- `CHECK` constraints that call the current time or other tables are not allowed or not re-checked later.
- Constraints added to an existing table fail if old rows violate them; clean the data first.

Connects to: keys, ER to relational mapping, stored procedures, functions and triggers, ACID properties.

### questions
Q: What are entity integrity and referential integrity?
A: Entity integrity requires that primary key values are unique and never null, so every row can be identified. Referential integrity requires that every non-null foreign key value matches an existing key in the referenced table, so references never dangle.

Q: What are domain constraints?
A: Rules on the values a column may hold: its data type, NOT NULL, CHECK conditions such as a positive salary, defaults and allowed values. The database rejects any insert or update that would put an out-of-domain value in the column.

Q: What happens when you delete a row that other rows reference?
A: It depends on the foreign key's action. RESTRICT or NO ACTION refuses the delete, CASCADE deletes the referencing rows too, SET NULL clears their foreign keys, and SET DEFAULT sets them to the column default.

Q: Why enforce constraints in the database rather than only in application code?
A: Every writer goes through the database, including other services, scripts, migrations and manual fixes, so rules declared there cannot be bypassed or forgotten. The database also enforces them correctly under concurrency, where application checks followed by writes can race.

Q: Why should foreign key columns usually be indexed?
A: Deleting or updating a parent row requires finding its children, and joins usually follow foreign keys. Without an index on the child's foreign key column, each such check or join scans the whole child table.

## dbms.relational.relational-algebra
name: "Relational algebra"
importance: important
scope: "select, project, union, difference, product, joins, division"

### simple
Relational algebra is a small set of operations that take tables and produce new tables: keep some rows, keep some columns, combine two tables, and so on. SQL queries are translated into these operations inside the database. It is like arithmetic for tables: a few basic moves that combine into any query.

### interview
- **Selection** $\sigma_{cond}(R)$: keep rows that satisfy a condition (SQL `WHERE`). **Projection** $\pi_{cols}(R)$: keep columns and remove duplicates (SQL `SELECT DISTINCT cols`).
- **Set operations** on union-compatible relations: **union** $\cup$, **difference** $-$, intersection $\cap$.
- **Cartesian product** $R \times S$: every pairing of rows. **Rename** $\rho$ gives names to relations and columns.
- **Joins**: theta join $R \bowtie_{\theta} S = \sigma_{\theta}(R \times S)$; **natural join** matches equal values of same-named columns; outer joins keep unmatched rows.
- **Division** $R \div S$: the values of R related to **all** rows of S, as in "students who took every required course".
- Fundamental operations: select, project, union, difference, product, rename; the others can be built from them. Optimizers rewrite expressions, for example pushing selections below joins.

### deep
#### Code: the operations over small tables

```cpp
using Row = map<string, string>;
using Table = vector<Row>;

Table select(const Table& t, function<bool(const Row&)> pred) {
    Table out;
    for (auto& r : t)
        if (pred(r)) out.push_back(r);
    return out;
}

Table project(const Table& t, const vector<string>& cols) {   // removes duplicates
    set<Row> seen;
    for (auto& r : t) {
        Row p;
        for (auto& c : cols) p[c] = r.at(c);
        seen.insert(p);
    }
    return {seen.begin(), seen.end()};
}

Table naturalJoin(const Table& a, const Table& b) {  // match on shared column names
    Table out;
    for (auto& x : a)
        for (auto& y : b) {
            bool match = true;
            for (auto& [col, val] : x)
                if (y.count(col) && y.at(col) != val) match = false;
            if (!match) continue;
            Row r = x;
            r.insert(y.begin(), y.end());
            out.push_back(r);
        }
    return out;
}

Table divide(const Table& r, const Table& s, const string& keep) {   // r(keep, x) ÷ s(x)
    Table out;
    for (auto& candidate : project(r, {keep})) {
        bool all = true;
        for (auto& need : s) {
            Row wanted = need;
            wanted[keep] = candidate.at(keep);
            all &= find(r.begin(), r.end(), wanted) != r.end();
        }
        if (all) out.push_back(candidate);
    }
    return out;
}

void print(const string& title, const Table& t) {
    cout << title << ":";
    for (auto& r : t) {
        cout << " (";
        for (auto it = r.begin(); it != r.end(); ++it)
            cout << (it == r.begin() ? "" : ", ") << it->second;
        cout << ")";
    }
    cout << "\n";
}

int main() {
    auto enrollment = [](string s, string c) { return Row{{"student", s}, {"course", c}}; };
    Table enrolled = {enrollment("asha", "dbms"), enrollment("asha", "os"),
                      enrollment("ravi", "dbms"), enrollment("meera", "os"),
                      enrollment("meera", "dbms")};
    Table required = {{{"course", "dbms"}}, {{"course", "os"}}};
    Table courses = {{{"course", "dbms"}, {"credits", "4"}}, {{"course", "os"}, {"credits", "3"}}};

    auto isOs = [](const Row& r) { return r.at("course") == "os"; };
    auto isRavi = [](const Row& r) { return r.at("student") == "ravi"; };
    print("sigma course=os", select(enrolled, isOs));
    print("pi student", project(enrolled, {"student"}));
    print("enrolled join courses, ravi", select(naturalJoin(enrolled, courses), isRavi));
    print("enrolled / required", divide(enrolled, required, "student"));
}
```

Output:

```text
sigma course=os: (os, asha) (os, meera)
pi student: (asha) (meera) (ravi)
enrolled join courses, ravi: (dbms, 4, ravi)
enrolled / required: (asha) (meera)
```

Rows print in column-name order (course, credits, student). Division finds Asha and Meera, the students enrolled in every required course; Ravi is missing `os`.

#### Division in SQL

SQL has no division operator, so "students who took every required course" becomes a double negation: there is no required course the student did not take.

```sql
SELECT DISTINCT e.student
FROM enrolled e
WHERE NOT EXISTS (
    SELECT * FROM required r
    WHERE NOT EXISTS (
        SELECT * FROM enrolled e2
        WHERE e2.student = e.student AND e2.course = r.course));
```

A common alternative groups and counts: `GROUP BY student HAVING COUNT(DISTINCT course) = (SELECT COUNT(*) FROM required)`, restricted to required courses.

#### Why it matters

Optimizers work on algebra trees. The same query can be computed as $\sigma_{student = ravi}(enrolled \bowtie courses)$ or as $\sigma_{student = ravi}(enrolled) \bowtie courses$; the second filters first and joins far fewer rows. That rewrite, pushing selections down, is one of the first rules every optimizer applies.

Connects to: relational calculus, query plans, join algorithms, keys, inner join.

### questions
Q: What is the difference between selection and projection?
A: Selection picks rows that satisfy a condition and keeps all columns, like WHERE. Projection picks columns and keeps all rows, removing duplicate rows in pure relational algebra, like SELECT DISTINCT with a column list.

Q: What does the division operator compute?
A: Given R with attributes A and B and S with attribute B, R divided by S returns the A values that are paired in R with every B value in S. The classic example is students who have taken all required courses.

Q: What is a natural join?
A: A join that matches rows on all columns with the same name in both relations, requiring equal values, and keeps one copy of each shared column. It equals a Cartesian product followed by equality selections and a projection.

Q: Which relational algebra operations are fundamental?
A: Selection, projection, union, set difference, Cartesian product and rename. Intersection, joins and division can all be expressed with these.

## dbms.relational.relational-calculus
name: "Relational calculus"
importance: advanced
prereqs: [dbms.relational.relational-algebra]
scope: "tuple and domain calculus"

### simple
Relational calculus describes what result you want instead of how to compute it, using logic like "all students such that there exists an enrollment in DBMS". Relational algebra is a recipe of steps; relational calculus is a description of the finished dish. SQL is closer to calculus: you describe the rows you want and the database works out the steps.

### interview
- **Tuple relational calculus** (TRC): variables range over rows. $\{ t \mid t \in Student \land t.dept = \text{'cs'} \}$.
- **Domain relational calculus** (DRC): variables range over column values. $\{ \langle n \rangle \mid \exists r, d\ (\langle r, n, d \rangle \in Student \land d = \text{'cs'}) \}$.
- Built from predicates, $\land$, $\lor$, $\lnot$, and quantifiers $\exists$ and $\forall$.
- **Declarative** (what) vs relational algebra's **procedural** (how). Codd's theorem: safe relational calculus and relational algebra have the same expressive power (relational completeness).
- **Safe** expressions only produce finite results drawn from values in the database; $\{ t \mid \lnot (t \in Student) \}$ is unsafe.
- SQL's `SELECT ... FROM ... WHERE EXISTS` is essentially TRC; QBE is based on DRC.

### deep
#### One query, three ways

"Names of students enrolled in every course" over `Student(roll, name)`, `Course(cid)` and `Enrolled(roll, cid)`:

- **Relational algebra** (steps): $\pi_{name}(Student \bowtie (Enrolled \div Course))$.
- **Tuple calculus** (description): $\{ s.name \mid s \in Student \land \forall c \in Course\ \exists e \in Enrolled\ (e.roll = s.roll \land e.cid = c.cid) \}$.
- **SQL**, which has no $\forall$, rewrites "for all" as "not exists ... not exists":

```sql
SELECT s.name FROM student s
WHERE NOT EXISTS (
    SELECT * FROM course c
    WHERE NOT EXISTS (
        SELECT * FROM enrolled e WHERE e.roll = s.roll AND e.cid = c.cid));
```

The identity used is $\forall c\, P(c) \equiv \lnot \exists c\, \lnot P(c)$.

#### Why interviews mention it

It explains why SQL is declarative: you state conditions on the result, and the optimizer, working with the equivalent algebra, chooses the order of operations. Safety explains why SQL queries always range over tables in `FROM`: a query can never ask for "every row not in the table".

Connects to: relational algebra, subqueries, query plans.

### questions
Q: What is the difference between relational algebra and relational calculus?
A: Relational algebra is procedural: it specifies a sequence of operations such as select, project and join to compute the result. Relational calculus is declarative: it describes the properties of the desired result with logical formulas. Safe relational calculus and algebra can express exactly the same queries.

Q: What is the difference between tuple and domain relational calculus?
A: In tuple relational calculus, variables stand for whole rows of a relation. In domain relational calculus, variables stand for individual attribute values, and rows are written as lists of such variables.

Q: What is a safe expression in relational calculus?
A: One whose result is guaranteed to be finite and made only of values that appear in the database or the query. An expression like all tuples not in Student is unsafe, because the set of possible tuples outside the table is infinite.

Q: How does SQL express a universal quantifier?
A: SQL has no for all, so it uses a double negation with NOT EXISTS: no required item exists for which no matching row exists. Grouping and comparing counts is another common formulation.
