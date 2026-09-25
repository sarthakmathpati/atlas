---
topic: dbms.er
name: "ER modeling"
subject: dbms
order: 2
prereqs: [dbms.fundamentals]
---

## dbms.er.entities-attributes-and-relationships
name: "Entities, attributes and relationships"
importance: must
scope: "attribute types (composite, multivalued, derived)"

### simple
An ER model describes a database as things (entities), facts about them (attributes), and links between them (relationships). A college has students and courses (entities), each student has a name and a date of birth (attributes), and students enroll in courses (a relationship). It is a sketch drawn before building any tables, like a floor plan before construction.

### interview
- An **entity** is a distinguishable thing (a student); an **entity set** (or type) is all things of that kind; a **key attribute** identifies each entity.
- **Attribute types**: **simple** vs **composite** (`name` made of first and last), **single-valued** vs **multivalued** (several phone numbers), **stored** vs **derived** (`age` computed from `dob`), and attributes that may be **null**.
- A **relationship** links entities (a student *enrolls in* a course); a **relationship set** groups them. Relationships can have their **own attributes** (the grade belongs to the enrollment, not to the student or the course).
- **Degree**: binary (two entity sets, most common), ternary (supplier supplies part to project), **recursive** (an employee *manages* employees, with roles).
- Chen notation: rectangles for entities, ovals for attributes (double for multivalued, dashed for derived, underlined for keys), diamonds for relationships. Crow's foot notation is common in industry tools.
- ER modeling is the **conceptual design** step; it is then mapped to tables.

### deep
#### Intuition

Before deciding tables and columns, you list what the system talks about. Nouns in the requirements ("students enroll in courses taught by instructors in departments") become entities, properties become attributes, and verbs become relationships. Getting this picture right prevents most later schema mistakes.

#### A small college

```text
  (student_id)  (name: first, last)  ((phones))  [age]         (course_id)  (title)  (credits)
        \              |                 |       /                  \         |        /
         +------------------ STUDENT ---+                            +---- COURSE ----+
                            |                                                 |
                            +-------------------< ENROLLS >-------------------+
                                                     |
                                                  (grade)

  legend: (x) attribute, (a: b, c) composite, ((x)) multivalued, [x] derived, < R > relationship
```

- `student_id` is the key attribute (underlined in a drawn diagram).
- `name` is **composite**: stored as first and last, so you can sort by last name.
- `phones` is **multivalued**: a student can have zero, one or several.
- `age` is **derived** from the date of birth; storing it would go stale every birthday.
- `grade` is an attribute of the **relationship**: it describes one student in one course.

#### Why attribute types matter later

| attribute type | how it becomes tables |
|---|---|
| simple | one column |
| composite | one column per component (`first_name`, `last_name`) |
| multivalued | a separate table (`student_phones(student_id, phone)`) |
| derived | not stored; computed in queries or a view |
| relationship attribute | a column in the table that represents the relationship |

Putting a multivalued attribute in one column (`"98xxx, 99xxx"`) breaks first normal form and makes "find the student with this phone" a string search.

#### Code: a derived attribute

```cpp
struct Date { int y, m, d; };

int ageOn(const Date& dob, const Date& today) {       // derived: never stored
    int age = today.y - dob.y;
    if (today.m < dob.m || (today.m == dob.m && today.d < dob.d)) --age;   // no birthday yet
    return age;
}

int main() {
    Date dob{2004, 9, 30};
    cout << "on 2026-09-25: " << ageOn(dob, {2026, 9, 25}) << "\n";
    cout << "on 2026-09-30: " << ageOn(dob, {2026, 9, 30}) << "\n";
}
```

Output:

```text
on 2026-09-25: 21
on 2026-09-30: 22
```

A stored `age` column would have been wrong from 30 September onward unless something updated it; computing it from `dob` is always right.

#### Relationship degree and roles

- **Recursive**: `EMPLOYEE —manages→ EMPLOYEE`, with roles *manager* and *subordinate*.
- **Ternary**: `SUPPLIER supplies PART to PROJECT` records which supplier provides which part for which project; three binary relationships cannot always express the same fact.

#### Pitfalls

- Making an attribute out of something that has its own attributes or relationships (an `address` that several people share may deserve to be an entity).
- Storing derived values without a plan to keep them updated.
- Putting a relationship attribute on one of the entities (a `grade` column in `STUDENT` cannot say which course it is for).

Connects to: cardinality and participation, weak entities, ER to relational mapping, normal forms.

### questions
Q: What are composite, multivalued and derived attributes? Give examples.
A: A composite attribute is made of smaller parts, like a name made of first and last names. A multivalued attribute can hold several values for one entity, like a student's phone numbers. A derived attribute is computed from others, like age from date of birth, and is usually not stored.

Q: What is the difference between an entity and an entity set?
A: An entity is one distinguishable object, such as the student Asha. An entity set, or entity type, is the collection of all entities of the same kind that share the same attributes, such as all students.

Q: Can a relationship have attributes? Give an example.
A: Yes. An attribute that describes the association itself belongs to the relationship: a grade belongs to a student's enrollment in a course, and a start date belongs to an employee working on a project. It cannot live on either entity alone.

Q: What is a recursive relationship?
A: A relationship between entities of the same set, where each side plays a different role, such as an employee managing other employees or a course being a prerequisite of another course.

Q: How is a multivalued attribute stored in a relational database?
A: In a separate table containing the owning entity's key and one value per row, such as student_phones with student_id and phone, with the pair as the primary key. Storing several values in one column would break first normal form.

## dbms.er.cardinality-and-participation
name: "Cardinality and participation"
importance: must
prereqs: [dbms.er.entities-attributes-and-relationships]
scope: "one-to-one, one-to-many, many-to-many, total vs partial"

### simple
Cardinality says how many entities on each side of a relationship can be linked: one to one, one to many, or many to many. Participation says whether every entity must take part: every department must have a manager (total) but not every employee manages one (partial). Together they are the rules of a relationship, like "each passport belongs to exactly one person, and a person may have none".

### interview
- **Cardinality ratios** for binary relationships: **1:1** (an employee manages at most one department, a department has one manager), **1:N** (a department has many employees, an employee belongs to one department), **M:N** (students enroll in many courses, courses have many students).
- **Participation**: **total** (every entity must participate; double line in Chen notation) vs **partial** (some may not). Total participation is an **existence dependency**.
- **(min, max) notation** on each side combines both: `(1, 1)` means exactly one, `(0, N)` means any number.
- These constraints come from the **business rules**, not from the current data; data can only reveal a violation.
- They decide the mapping: 1:N puts a foreign key on the N side; M:N needs a junction table; total participation becomes `NOT NULL` on the foreign key.

### deep
#### Worked examples

| relationship | cardinality | participation |
|---|---|---|
| employee MANAGES department | 1:1 | department total (always has a manager), employee partial |
| department HAS employee | 1:N | employee total (everyone is in a department), department partial (a new one may be empty) |
| student ENROLLS course | M:N | both partial |
| person HOLDS passport | 1:1 | passport total, person partial |

Read "1:N department has employees" as: one department relates to many employees, and each employee relates to one department.

#### Code: what does the data show?

The functions below read relationship pairs and report the ratio and participation the data exhibits. Data can only show what has happened so far, which is why the real constraint must come from the rules.

```cpp
using Pairs = vector<pair<string, string>>;

string cardinalityOf(const Pairs& pairs) {
    map<string, set<string>> leftPartners, rightPartners;
    for (auto& [a, b] : pairs) {
        leftPartners[a].insert(b);
        rightPartners[b].insert(a);
    }
    auto many = [](const map<string, set<string>>& m) {
        return any_of(m.begin(), m.end(), [](auto& e) { return e.second.size() > 1; });
    };
    bool leftMany = many(rightPartners), rightMany = many(leftPartners);
    return leftMany && rightMany ? "M:N" : rightMany ? "1:N" : leftMany ? "N:1" : "1:1";
}

string participation(const set<string>& all, const Pairs& pairs, bool left) {
    set<string> seen;
    for (auto& [a, b] : pairs) seen.insert(left ? a : b);
    return seen == all ? "total" : "partial";
}

int main() {
    set<string> depts = {"cs", "ee", "me"};
    Pairs manages = {{"ana", "cs"}, {"bo", "ee"}, {"cy", "me"}};         // employee, dept
    Pairs worksIn = {{"cs", "ana"}, {"cs", "dev"}, {"ee", "bo"}, {"me", "cy"}};   // dept, employee
    Pairs enrolls = {{"s1", "dbms"}, {"s1", "os"}, {"s2", "dbms"}};      // student, course
    cout << "manages: " << cardinalityOf(manages) << ", departments "
         << participation(depts, manages, false) << "\n";
    cout << "works in: " << cardinalityOf(worksIn) << "\n";
    cout << "enrolls: " << cardinalityOf(enrolls) << "\n";
    set<string> courses = {"dbms", "os", "cn"};
    cout << "courses in enrolls: " << participation(courses, enrolls, false) << "\n";
}
```

Output:

```text
manages: 1:1, departments total
works in: 1:N
enrolls: M:N
courses in enrolls: partial
```

Every department has a manager in this data (total), while the course `cn` has no students yet (partial).

#### From constraints to tables

- **1:N, N side total**: `employees.dept_id NOT NULL REFERENCES departments(id)`.
- **1:1**: a foreign key with a `UNIQUE` constraint, placed on the side with total participation (`departments.manager_id UNIQUE NOT NULL`), which avoids nulls.
- **M:N**: `enrollments(student_id, course_id, PRIMARY KEY (student_id, course_id))`.
- A **minimum** greater than zero on the "one" side of 1:N (every department has at least one employee) cannot be enforced by a foreign key; it needs a trigger or application logic.

#### Pitfalls

- Deriving cardinality from sample data: the first week's data may look 1:1 when the rule is 1:N.
- Forgetting the time dimension: "an employee works in one department" may really mean one department at a time, with history needing its own table.
- Using 1:1 when the two sides could simply be one table.

Connects to: entities, attributes and relationships, ER to relational mapping, keys, integrity constraints.

### questions
Q: Explain one-to-one, one-to-many and many-to-many relationships with examples.
A: One-to-one: a department has one manager and a manager runs one department. One-to-many: a department has many employees but each employee works in one department. Many-to-many: a student takes many courses and a course has many students.

Q: What is the difference between total and partial participation?
A: Total participation means every entity in the set must take part in the relationship, such as every employee belonging to a department; it is drawn with a double line. Partial participation means some entities may not take part, such as departments without projects.

Q: How do cardinality constraints affect the relational schema?
A: In a one-to-many relationship, the foreign key goes in the table on the many side. In a one-to-one, a foreign key with a unique constraint goes on one side, preferably the side with total participation. A many-to-many relationship needs a separate junction table holding both keys. Total participation becomes a not-null foreign key.

Q: Can you determine cardinality from existing data?
A: Only partially. Data can show that a rule is violated, but not that it holds, since future data may differ. Cardinality and participation come from business rules, which the schema then enforces.

## dbms.er.weak-entities
name: "Weak entities"
importance: important
prereqs: [dbms.er.entities-attributes-and-relationships]
scope: "identifying relationships"

### simple
A weak entity cannot be identified on its own, only together with the entity it belongs to. Room 101 means nothing until you say which building it is in, and an order's line 3 only makes sense inside that order. The link to the owner that gives it its identity is called the identifying relationship.

### interview
- A **weak entity** has no key of its own; it has a **partial key** (discriminator) that is unique only within its **owner** (the strong, identifying entity).
- Its key is **owner's key + partial key**: (building_id, room_no), (order_id, line_no), (employee_id, dependent_name).
- The **identifying relationship** (double diamond) is many-to-one from the weak entity to its owner, with **total participation** of the weak entity (double rectangle, double line).
- **Existence dependency**: deleting the owner deletes its weak entities (`ON DELETE CASCADE`).
- Mapping: a table whose primary key is (owner key, partial key) and whose owner key is also a foreign key.
- If the thing gets its own global identifier (a room with a unique asset tag), it can be modeled as a strong entity instead.

### deep
#### Example: employees and their dependents

A dependent (a child or spouse registered for insurance) is identified by name only within one employee's family: two employees can both have a dependent named "Riya".

```sql
CREATE TABLE employees (
    emp_id INT PRIMARY KEY,
    name   VARCHAR(50) NOT NULL
);

CREATE TABLE dependents (
    emp_id   INT REFERENCES employees(emp_id) ON DELETE CASCADE,  -- owner's key
    dep_name VARCHAR(50),                                          -- partial key
    relation VARCHAR(20),
    PRIMARY KEY (emp_id, dep_name)
);

INSERT INTO employees VALUES (1, 'Asha'), (2, 'Ravi');
INSERT INTO dependents VALUES (1, 'Riya', 'daughter'), (2, 'Riya', 'spouse');
DELETE FROM employees WHERE emp_id = 1;
SELECT * FROM dependents;
```

The final query returns one row, `(2, Riya, spouse)`: two dependents shared the name because the key includes the owner, and deleting Asha took her dependent with her.

#### Weak or strong?

| thing | weak when | strong when |
|---|---|---|
| order line | numbered 1, 2, 3 within each order | each line gets a global id |
| room | numbered within a building | rooms have campus-wide codes |
| dependent | identified by name within an employee | identified by a national id number |

Modeling choices here are about identity: if the real world identifies the thing through its owner, a weak entity is the honest model.

Connects to: entities, attributes and relationships, ER to relational mapping, keys, integrity constraints.

### questions
Q: What is a weak entity?
A: An entity that has no key of its own and is identified only in combination with an owner entity, through a partial key that is unique within that owner. Examples are rooms within a building or lines within an order.

Q: What is an identifying relationship?
A: The relationship between a weak entity and its owner that supplies the owner's key as part of the weak entity's identity. It is many-to-one from the weak entity to the owner, the weak entity participates totally, and it is drawn as a double diamond.

Q: How is a weak entity mapped to a table?
A: As a table whose primary key combines the owner's primary key with the weak entity's partial key, where the owner's key is also a foreign key to the owner table, usually with ON DELETE CASCADE because the weak entity cannot exist without its owner.

Q: What is a partial key or discriminator?
A: The attribute that distinguishes weak entities belonging to the same owner, such as a line number within an order. It is not unique across the whole entity set, only within one owner.

## dbms.er.er-to-relational-mapping
name: "ER to relational mapping"
importance: must
prereqs: [dbms.er.cardinality-and-participation]
scope: "turning diagrams into tables"

### simple
ER to relational mapping turns the diagram into actual tables with columns and keys, following a few fixed rules. Each kind of entity becomes a table, and each relationship becomes either a column that points to another table or a small table of its own. It is like turning an architect's sketch into a construction plan that says exactly where every wall goes.

### interview
- **Strong entity** → a table; simple attributes become columns, **composite** attributes are flattened into component columns, the key becomes the **primary key**; **derived** attributes are not stored.
- **Weak entity** → a table with PK = owner's key + partial key, owner's key as a foreign key (`ON DELETE CASCADE`).
- **1:N** → a foreign key on the **N side** (`NOT NULL` if participation is total). Relationship attributes go in that same table.
- **1:1** → a foreign key with `UNIQUE` on one side, preferably the side with total participation; or merge the two tables if both sides are total.
- **M:N** → a **junction table** with both foreign keys, a composite primary key, and the relationship's attributes. **N-ary** relationships work the same way with more keys.
- **Multivalued** attribute → its own table (owner key, value). **Specialization** (student and staff as kinds of person) → one table per class, one table for the whole hierarchy with a type column, or tables for subclasses only.

### deep
#### The example

Departments have many instructors and one head; instructors teach courses; students enroll in courses with a grade; students have several phone numbers.

```text
DEPARTMENT 1 --- N INSTRUCTOR        (works in; instructors total)
DEPARTMENT 1 --- 1 INSTRUCTOR        (head of; departments total)
INSTRUCTOR 1 --- N COURSE            (teaches; courses total)
STUDENT    M --- N COURSE            (enrolls, with grade)
STUDENT has multivalued phones; name is composite (first, last)
```

#### The tables

```sql
CREATE TABLE departments (
    dept_id  INT PRIMARY KEY,
    name     VARCHAR(50) NOT NULL UNIQUE,
    head_id  INT UNIQUE                     -- 1:1 "head of"; FK added after instructors
);

CREATE TABLE instructors (
    instructor_id INT PRIMARY KEY,
    name          VARCHAR(50) NOT NULL,
    dept_id       INT NOT NULL REFERENCES departments(dept_id)   -- 1:N, total
);

ALTER TABLE departments
    ADD FOREIGN KEY (head_id) REFERENCES instructors(instructor_id);

CREATE TABLE courses (
    course_id     VARCHAR(10) PRIMARY KEY,
    title         VARCHAR(100) NOT NULL,
    instructor_id INT NOT NULL REFERENCES instructors(instructor_id)
);

CREATE TABLE students (
    student_id INT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,        -- composite attribute, flattened
    last_name  VARCHAR(50) NOT NULL,
    dob        DATE NOT NULL                -- age is derived, not stored
);

CREATE TABLE student_phones (               -- multivalued attribute
    student_id INT REFERENCES students(student_id) ON DELETE CASCADE,
    phone      VARCHAR(15),
    PRIMARY KEY (student_id, phone)
);

CREATE TABLE enrollments (                  -- M:N with a relationship attribute
    student_id INT REFERENCES students(student_id),
    course_id  VARCHAR(10) REFERENCES courses(course_id),
    grade      CHAR(2),
    PRIMARY KEY (student_id, course_id)
);
```

The circular reference between departments and instructors is why the head's foreign key is added with `ALTER TABLE` after both tables exist. `head_id` stays nullable so the first department can be inserted before its head; the "every department has a head" rule is then enforced by a deferred constraint or by the application.

#### Worked mapping, rule by rule

| ER element | rule | result |
|---|---|---|
| DEPARTMENT, INSTRUCTOR, COURSE, STUDENT | strong entity → table | four tables with primary keys |
| works in (1:N) | FK on the N side | `instructors.dept_id NOT NULL` |
| head of (1:1) | FK with UNIQUE on one side | `departments.head_id UNIQUE` |
| teaches (1:N) | FK on the N side | `courses.instructor_id` |
| enrolls (M:N) with grade | junction table | `enrollments(student_id, course_id, grade)` |
| phones (multivalued) | separate table | `student_phones` |
| name (composite) | flatten | `first_name`, `last_name` |
| age (derived) | not stored | computed from `dob` |

#### Specialization

A `PERSON` specialized into `STUDENT` and `STAFF` can map to (1) a `persons` table plus `students` and `staff` tables sharing its key (clean, needs joins), (2) one `persons` table with a `type` column and nullable subtype columns (fast, many nulls), or (3) only `students` and `staff` tables with the common columns repeated (no joins, but "all persons" needs a union). Choose by how the data is queried.

#### Pitfalls

- Putting the foreign key on the "one" side of 1:N: a department row cannot hold a list of instructors.
- Forgetting the composite primary key on a junction table, allowing duplicate enrollments.
- Mapping a 1:1 by merging tables when one side is optional, which fills the merged table with nulls.

Connects to: cardinality and participation, weak entities, keys, integrity constraints, normal forms.

### questions
Q: How do you map a many-to-many relationship to tables?
A: Create a junction table containing the primary keys of both entities as foreign keys, with the pair as its composite primary key, plus any attributes of the relationship itself, such as a grade for enrollments.

Q: Where does the foreign key go in a one-to-many relationship?
A: On the many side. Each employee row stores its department's id, since each employee belongs to one department, while a department cannot store a variable-length list of employees in one column. If every employee must belong to a department, the column is also NOT NULL.

Q: How are composite, multivalued and derived attributes mapped?
A: Composite attributes are flattened into one column per component. Multivalued attributes get their own table with the owner's key and one value per row. Derived attributes are usually not stored and are computed in queries or views.

Q: How do you map a one-to-one relationship?
A: Put a foreign key with a unique constraint in one of the two tables, preferably the one whose entities always participate, so the column is never null. If both sides always participate, the two tables can often be merged into one.

Q: What are the options for mapping a specialization hierarchy?
A: One table for the superclass plus one per subclass sharing the same key, a single table for the whole hierarchy with a type column and nullable subclass columns, or tables only for the subclasses that repeat the common columns. The choice trades joins against nulls and against queries over all members.
