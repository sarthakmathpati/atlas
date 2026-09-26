---
topic: eng.testing
name: "Testing and debugging"
subject: eng
order: 3
prereqs: []
---

## eng.testing.unit-integration-and-end-to-end-tests
name: "Unit, integration and end-to-end tests"
importance: must
scope: "the test pyramid"

### simple
Tests come in sizes. A unit test checks one small piece of logic on its own, an integration test checks that a few pieces work together (your code and a real file or database), and an end-to-end test drives the whole program the way a user would. The test pyramid says to have many small, fast tests and a few big, slow ones, like checking every brick, then a few walls, then walking through the finished house once.

### interview
- **Unit tests**: one function or class, no network, disk or clock; microseconds each, so thousands run on every change and a failure points at one line.
- **Integration tests**: real collaborators (a file, a database, another service); slower and fewer, they catch wiring mistakes such as formats, queries and configuration.
- **End-to-end tests**: the deployed program through its real interface (command line, HTTP, browser); the slowest and most brittle, few in number, covering the key user journeys.
- **The pyramid**: many unit tests, some integration tests, few end-to-end tests. An "ice-cream cone" of mostly end-to-end tests is slow and flaky.
- **Good tests** are fast, independent (no shared state, any order), repeatable (no dependence on time or randomness without a seed) and check behavior, not implementation details.
- Name each test after the behavior it protects, and cover edges: empty input, boundaries, errors.

### deep
#### Intuition

Each layer answers a different question. Unit tests: is this logic right? Integration tests: do the parts fit together? End-to-end tests: does the product work for a user? Lower layers are cheaper and say exactly what broke; higher layers catch what only appears when everything is connected.

#### One program, three layers

A tiny shop in C++ with a hand-made test runner (`check` records a result, and `source_location` supplies the line). The end-to-end tests start the real program as a separate process, with a file as its storage.

```cpp
struct Item { string name; int cents, qty; };

// Unit: pure logic. 10% off orders of 10.00 or more with the coupon TEN.
int total(const vector<Item>& items, const string& coupon) {
    int sum = 0;
    for (auto& i : items) sum += i.cents * i.qty;
    if (coupon == "TEN" && sum >= 1000) sum -= sum / 10;
    return sum;
}

// A part that touches the outside world: orders stored as lines in a file.
struct FileStore {
    string path;
    void add(const Item& i) {
        ofstream(path, ios::app) << i.name << ' ' << i.cents << ' ' << i.qty << '\n';
    }
    vector<Item> load() const {
        ifstream in(path);
        vector<Item> items;
        for (Item i; in >> i.name >> i.cents >> i.qty;) items.push_back(i);
        return items;
    }
};

// The program users run: "shop FILE add NAME CENTS QTY" or "shop FILE total [COUPON]".
int shop(vector<string> a) {
    FileStore store{a.at(0)};
    if (a.at(1) == "add") store.add({a.at(2), stoi(a.at(3)), stoi(a.at(4))});
    int t = total(store.load(), a.size() > 2 && a[1] == "total" ? a[2] : "");
    printf("total %d.%02d\n", t / 100, t % 100);
    return 0;
}

// The test runner: a check records a pass or prints the failure with its line.
int passed = 0, failed = 0;
void check(bool ok, const char* what, source_location at = source_location::current()) {
    ok ? ++passed : ++failed;
    if (!ok) printf("FAIL line %u: %s\n", at.line(), what);
}
string run(const string& args) {  // end to end: start this program as a user would
    static string self = filesystem::read_symlink("/proc/self/exe");
    FILE* p = popen((self + " " + args).c_str(), "r");
    string out;
    for (int ch; (ch = fgetc(p)) != EOF;) out += char(ch);
    pclose(p);
    return out;
}
template <class F> void tier(const char* name, F tests) {
    auto start = chrono::steady_clock::now();
    tests();
    auto us = chrono::duration<double, micro>(chrono::steady_clock::now() - start).count();
    printf("%-11s %8.1f us\n", name, us);
}

int main(int argc, char** argv) {
    if (argc > 1) return shop(vector<string>(argv + 1, argv + argc));
    tier("unit", [] {
        check(total({}, "") == 0, "an empty cart costs nothing");
        check(total({{"pen", 250, 2}}, "") == 500, "price times quantity");
        check(total({{"pen", 250, 4}}, "TEN") == 900, "the coupon takes 10% off");
        check(total({{"book", 1000, 1}}, "TEN") == 900, "the coupon applies at exactly 10.00");
        check(total({{"pen", 250, 3}}, "TEN") == 750, "no discount below 10.00");
    });
    string file = "/tmp/orders-" + to_string(getpid()) + ".txt";
    tier("integration", [&] {
        FileStore store{file};
        store.add({"pen", 250, 2});
        store.add({"ink", 120, 1});
        auto items = store.load();
        check(items.size() == 2 && items[1].name == "ink" && items[1].cents == 120,
              "items survive a round trip through the file");
    });
    remove(file.c_str());
    tier("end to end", [&] {
        check(run(file + " add pen 250 4") == "total 10.00\n", "adding prints the new total");
        check(run(file + " total TEN") == "total 9.00\n", "the coupon works from the command line");
    });
    remove(file.c_str());
    printf("%d passed, %d failed\n", passed, failed);
    return failed ? 1 : 0;
}
```

One run (built with `g++ -O2`; over five runs, unit 4.8 to 7.1 µs, integration 65 to 133 µs, end to end 5.3 to 7.0 ms):

```text
unit             5.3 us
integration     66.2 us
end to end    5132.5 us
8 passed, 0 failed
```

Each step up costs more: integration took more than 10 times as long as the unit tests here, and end to end nearly 80 times as long again, because a unit test is a function call, an integration test does file I/O and an end-to-end test starts processes. With real databases and browsers the gaps grow further, which is why the pyramid has the shape it has.

#### When a bug slips in

Changing `sum >= 1000` to `sum > 1000` (one character) and running again:

```text
FAIL line 60: the coupon takes 10% off
FAIL line 61: the coupon applies at exactly 10.00
unit            14.6 us
integration     59.4 us
FAIL line 76: the coupon works from the command line
end to end    5052.4 us
5 passed, 3 failed
```

The unit tests say which rule broke and where: the boundary at exactly 10.00. The end-to-end test only says the coupon doesn't work. Both are useful, but only the unit test tells you where to look.

#### Pitfalls

- **Testing through the top only**: slow suites get run less often, and flaky ones get ignored.
- **Shared state**: a test that depends on another's file or data fails in a different order; here each run uses its own file name.
- **Asserting on internals**: tests that check private details break on every refactor without catching bugs.
- **Mocking everything**: unit tests with fake collaborators can all pass while the real wiring is broken, which is what integration tests are for.

Connects to: [test-driven development](#/concept/eng.testing.test-driven-development), [mocks and stubs](#/concept/eng.testing.mocks-and-stubs), [CI/CD](#/concept/eng.devops.ci-cd), [defensive programming](#/concept/oop.errors.defensive-programming).

### questions
Q: What is the difference between unit, integration and end-to-end tests?
A: A unit test checks one piece of logic in isolation, an integration test checks several real parts working together, such as code and a database, and an end-to-end test runs the whole system through its user-facing interface. Each step up is slower and broader but closer to what users experience.

Q: What is the test pyramid?
A: A guideline to write many fast unit tests, fewer integration tests and only a handful of end-to-end tests. It keeps the suite fast and reliable while still checking that the assembled system works.

Q: Why are end-to-end tests often flaky?
A: They depend on many moving parts at once: processes, networks, timing, shared environments and data. Any of them can fail for reasons unrelated to the change under test, which is why they should be few and focused on critical paths.

Q: What makes a good unit test?
A: It is fast, deterministic and independent of other tests, it checks one behavior through the public interface, its name says what should happen, and when it fails the message points to the cause. Boundaries and error cases deserve their own tests.

Q: If all unit tests pass, why might the program still be broken?
A: Unit tests check parts in isolation, often with fakes for their collaborators, so mistakes in how the parts connect (file formats, SQL, configuration, the command-line interface) go unnoticed. Integration and end-to-end tests exist to catch exactly those.

## eng.testing.test-driven-development
name: "Test-driven development"
importance: important
prereqs: [eng.testing.unit-integration-and-end-to-end-tests]
scope: "red, green, refactor"

### simple
Test-driven development means writing a small test before the code that makes it pass. You watch the test fail (red), write just enough code to make it pass (green), then tidy the code while the tests keep you safe (refactor), and repeat in small steps. It is like setting up the target before practicing your aim: you always know whether the last shot hit.

### interview
- **The cycle**: red (write one failing test for the next small behavior), green (the simplest code that passes), refactor (improve names and structure with all tests passing). Minutes per cycle, not hours.
- **Watching it fail matters**: a test that never failed may not test anything.
- **Benefits**: every behavior has a test, the design is usable from the start (you call the code before writing it), and refactoring is safe.
- **Costs and limits**: slower at first, awkward for exploratory or UI-heavy work, and tests that mirror the implementation make change harder, not easier.
- **Faking and triangulating**: it is fine to hard-code an answer to go green; the next test forces the general solution.
- Bug fixes fit the same loop: first a test that reproduces the bug, then the fix.

### deep
#### Intuition

TDD turns a vague task ("parse durations") into a sequence of tiny, checkable promises. Each test is a requirement you can run. Because every step is small, when something breaks you know it was the last few lines you touched.

#### A real sequence

The task: turn `45m`, `2h` and `1h30m` into minutes. Each row is one step; the output column is what the test program printed at that step.

| step | change | output |
|---|---|---|
| red | test `45m` → 45; `minutes` returns 0 | `FAIL minutes("45m") = 0, expected 45` |
| green | `return stol(text);` | `1 passed, 0 failed` |
| red | test `2h` → 120 | `FAIL minutes("2h") = 2, expected 120` |
| green | times 60 when the text ends in `h` | `2 passed, 0 failed` |
| red | test `1h30m` → 90 | `FAIL minutes("1h30m") = 1, expected 90` |
| green | a loop over number-and-unit pairs, and tests that bad input throws | `10 passed, 0 failed` |
| refactor | read numbers with `from_chars` instead of a digit loop | `FAIL no error for "-5m"` |
| green | require a digit where each number starts | `10 passed, 0 failed` |

The second step looks like cheating, since `stol("45m")` happens to return 45, but it is the simplest code that passes, and the next test proved it wrong. The refactor is the interesting step: `from_chars` accepts a leading minus sign, which the hand-written loop never did, so a change meant to keep behavior changed it. The existing test for `-5m` caught it at once.

#### The final code and tests

```cpp
// Parses durations such as "45m", "2h" or "1h30m" into minutes.
long minutes(const string& text) {
    if (text.empty()) throw invalid_argument("empty duration");
    long total = 0;
    for (const char *p = text.data(), *end = p + text.size(); p != end;) {
        long n;
        auto [next, err] = from_chars(p, end, n);
        if (!isdigit((unsigned char)*p) || err != errc() || next == end)
            throw invalid_argument("bad duration: " + text);
        if (*next == 'h') total += n * 60;
        else if (*next == 'm') total += n;
        else throw invalid_argument("bad unit in: " + text);
        p = next + 1;
    }
    return total;
}
int failed = 0, passed = 0;
void expect(const string& input, long want) {
    long got = minutes(input);
    got == want ? ++passed : ++failed;
    if (got != want) printf("FAIL minutes(\"%s\") = %ld, expected %ld\n", input.c_str(), got, want);
}

int main() {
    expect("45m", 45);
    expect("2h", 120);
    expect("1h30m", 90);
    expect("0m", 0);
    for (string bad : {"", "90", "90x", "h", "1h30", "-5m"}) {
        try {
            minutes(bad);
            ++failed;
            printf("FAIL no error for \"%s\"\n", bad.c_str());
        } catch (const invalid_argument&) {
            ++passed;
        }
    }
    printf("%d passed, %d failed\n", passed, failed);
    return failed != 0;
}
```

Output:

```text
10 passed, 0 failed
```

#### Doing it well

- Test behavior through the public function, not private steps, so refactors don't break tests.
- Keep the list of cases you still want to test on paper; pick the simplest next one.
- Cover errors and boundaries as you go: empty input, missing units, signs.
- If a test is hard to write, the design is often telling you something: too many dependencies, or a function doing two jobs.

Connects to: [unit, integration and end-to-end tests](#/concept/eng.testing.unit-integration-and-end-to-end-tests), [mocks and stubs](#/concept/eng.testing.mocks-and-stubs), [clean code](#/concept/eng.practice.clean-code), [defensive programming](#/concept/oop.errors.defensive-programming).

### questions
Q: What are the three steps of test-driven development?
A: Red: write a small test for the next behavior and watch it fail. Green: write the simplest code that makes it pass. Refactor: improve the code's structure with all tests still passing, then repeat.

Q: Why write the test before the code?
A: Seeing the test fail proves it can detect the missing behavior, and writing the call first makes you design the interface from the caller's side. It also guarantees every behavior you add is covered by a test.

Q: Isn't returning a hard-coded value to pass a test pointless?
A: It keeps each step tiny and makes the next test do the work of forcing the general solution. The point is steady progress in verified steps, not clever first drafts.

Q: How do tests help during refactoring?
A: They pin down the current behavior, so a restructuring that changes behavior by accident fails immediately. For example, switching to from_chars made a negative duration parse, and an existing test caught it.

Q: When is TDD a poor fit?
A: For exploratory spikes where you don't yet know what to build, for code that is mostly layout or glue around external systems, or when the tests would just repeat the implementation. Even then, adding tests once the design settles is valuable.

## eng.testing.mocks-and-stubs
name: "Mocks and stubs"
importance: important
prereqs: [eng.testing.unit-integration-and-end-to-end-tests]
scope: "isolating dependencies"

### simple
Code often depends on things that are slow, costly or unpredictable: a payment service, an email server, today's date. In a test you swap them for stand-ins that you control, the way a film uses a stunt double for the dangerous scenes. A stub just gives a fixed answer, and a mock also remembers how it was used so the test can check it.

### interview
- **Test doubles** replace real dependencies in tests. **Dummy**: passed but unused. **Stub**: returns canned answers. **Fake**: a simple working version (an in-memory database). **Spy**: records calls. **Mock**: is set up with expectations about the calls it should receive and checks them.
- **Why**: speed, determinism (a fixed clock, no network) and safety (no real charges or emails), plus the ability to force rare cases like a declined card or a time-out.
- **How in C++**: depend on an interface (an abstract class with virtual functions) or a template parameter, and pass the real or fake object in through the constructor, which is dependency injection.
- **Stubs for queries, mocks for commands**: stub what the code asks for (the time, a balance); verify with a mock or spy what it tells others to do (charge, send).
- **Don't overdo it**: mocking every collaborator ties tests to implementation details; prefer real objects for simple, fast code, and mock at the edges (network, disk, clock, randomness).
- Keep at least one integration test with the real dependency, because doubles can drift from the real behavior.

### deep
#### Intuition

A unit test should fail for one reason: the unit is wrong. If the code under test calls a real payment service, the test can also fail because the network is down, and it may charge a card. Isolating the unit means giving it stand-ins at exactly the points where it touches the outside world, and those points are where the design should already have seams: interfaces passed in, not globals or objects created inside.

#### An example

A checkout charges a card and emails a receipt dated today. Its three dependencies are interfaces; the tests pass in a stub clock, a spy gateway and a mock mailer.

```cpp
// The dependencies, as interfaces, so tests can pass in stand-ins.
struct Clock {
    virtual ~Clock() = default;
    virtual string today() const = 0;
};
struct PaymentGateway {
    virtual ~PaymentGateway() = default;
    virtual bool charge(const string& card, int cents) = 0;  // false when declined
};
struct Mailer {
    virtual ~Mailer() = default;
    virtual void send(const string& to, const string& body) = 0;
};

// The code under test: charge the card, then email a dated receipt.
class Checkout {
    Clock& clock;
    PaymentGateway& payments;
    Mailer& mailer;
public:
    Checkout(Clock& c, PaymentGateway& p, Mailer& m) : clock(c), payments(p), mailer(m) {}
    bool placeOrder(const string& email, const string& card, int cents) {
        if (cents <= 0 || !payments.charge(card, cents)) return false;
        mailer.send(email, format("Receipt {}: {}.{:02}", clock.today(), cents / 100, cents % 100));
        return true;
    }
};

// Test doubles.
struct FixedClock : Clock {  // stub: a canned answer
    string today() const override { return "2026-09-01"; }
};
struct SpyGateway : PaymentGateway {  // spy: answers as told and records every call
    bool approve = true;
    vector<pair<string, int>> calls;
    bool charge(const string& card, int cents) override {
        calls.push_back({card, cents});
        return approve;
    }
};
struct MockMailer : Mailer {  // mock: holds the messages it expects and verifies them
    vector<string> expected, got;
    void send(const string&, const string& body) override { got.push_back(body); }
    bool verify() const { return got == expected; }
};

int passed = 0, failed = 0;
void check(bool ok, const char* what) {
    ok ? ++passed : ++failed;
    printf("%s %s\n", ok ? "ok  " : "FAIL", what);
}

int main() {
    {
        FixedClock clock;
        SpyGateway pay;
        MockMailer mail;
        mail.expected = {"Receipt 2026-09-01: 12.50"};
        bool ok = Checkout(clock, pay, mail).placeOrder("asha@example.com", "4111", 1250);
        check(ok && pay.calls == vector<pair<string, int>>{{"4111", 1250}},
              "a paid order charges the card once, for the right amount");
        check(mail.verify(), "and emails a receipt dated today");
    }
    {
        FixedClock clock;
        SpyGateway pay;
        pay.approve = false;
        MockMailer mail;  // expects nothing
        check(!Checkout(clock, pay, mail).placeOrder("asha@example.com", "4000", 1250) &&
                  mail.verify(),
              "a declined card sends no receipt");
    }
    {
        FixedClock clock;
        SpyGateway pay;
        MockMailer mail;
        check(!Checkout(clock, pay, mail).placeOrder("asha@example.com", "4111", 0) &&
                  pay.calls.empty(),
              "an empty order never reaches the payment gateway");
    }
    printf("%d passed, %d failed\n", passed, failed);
    return failed != 0;
}
```

Output:

```text
ok   a paid order charges the card once, for the right amount
ok   and emails a receipt dated today
ok   a declined card sends no receipt
ok   an empty order never reaches the payment gateway
4 passed, 0 failed
```

What each double makes possible:

- **`FixedClock`** makes the receipt's date predictable; with the real clock the expected string would change every day.
- **`SpyGateway`** lets a test choose the answer (approve or decline) and then check what was charged. The last test proves the gateway was never called for an empty order, which you can't see from the return value alone.
- **`MockMailer`** is told which messages to expect and captures the email instead of sending it; `verify` then checks the exact text, and that a declined card sends nothing. The spy leaves checking to the test; the mock carries its own expectations.

Here the doubles are handwritten, which in C++ is often enough. Mocking libraries such as Google Mock generate them from the interface and let you state expectations ("called once with 1250") in one line.

#### Pitfalls

- **Mocking what you don't own** (a third-party client class) couples tests to its details; wrap it in your own small interface and mock that.
- **Verifying every call** makes tests fail on harmless refactors; check the calls that matter to the behavior.
- **Doubles that lie**: if the real gateway returns an error code where your stub returns false, all tests pass and production fails. Contract or integration tests keep doubles honest.
- **Hidden dependencies**: code that calls `time(nullptr)` or creates its own client inside can't be isolated; inject them.

Connects to: [dependency inversion principle](#/concept/oop.principles.dependency-inversion-principle), [abstract class vs interface](#/concept/oop.pillars.abstract-class-vs-interface), [unit, integration and end-to-end tests](#/concept/eng.testing.unit-integration-and-end-to-end-tests), [test-driven development](#/concept/eng.testing.test-driven-development).

### questions
Q: What is the difference between a stub and a mock?
A: A stub supplies canned answers so the code under test can run; the test then checks the code's result. A mock records or expects calls, and the test checks the interaction itself, such as "send was called once with this receipt".

Q: Why use test doubles instead of the real dependencies?
A: Real dependencies can be slow, flaky, costly or impossible to steer: a network call can time out, a payment really charges, the clock changes every run. Doubles make tests fast and repeatable and let you force rare cases such as a declined card.

Q: How do you make C++ code mockable?
A: Have it depend on an abstraction, an interface with virtual functions or a template parameter, and pass the concrete object in, usually through the constructor. Tests then pass a double instead of the real implementation.

Q: What is a fake, and when is it better than a mock?
A: A fake is a lightweight working implementation, such as an in-memory repository. It is better when tests need realistic behavior across many calls (store, then load), where scripting a mock call by call would be brittle.

Q: What are the risks of mocking too much?
A: Tests start describing the implementation instead of the behavior, so harmless refactors break them, and they can all pass while the real components don't work together. Mock at the edges of the system and keep some integration tests with real parts.

## eng.testing.debugging-tools
name: "Debugging tools"
importance: important
scope: "debuggers, breakpoints, logging strategy"

### simple
Debugging is finding out why a program does something you didn't expect. A debugger lets you pause the program at a chosen line and look at every variable, like freezing a video and examining each frame. Logs are notes the program writes as it runs, so you can piece together what happened after the fact, especially on a server where you can't pause anything.

### interview
- **Method first**: reproduce the bug reliably, shrink it to the smallest failing case, form a hypothesis, test it, fix, then add a test that would have caught it.
- **gdb basics**: build with `-g` (and `-O0` for readable stepping); `run`, `bt` (backtrace), `break file:line` (optionally `if cond`), `next`, `step`, `finish`, `print expr`, `info locals`, `watch var` to stop when a value changes.
- **Crashes**: run under the debugger or load a core dump (`gdb prog core`) and start with `bt`; the top frames in your code are where to look.
- **Sanitizers** (`-fsanitize=address,undefined`) find out-of-bounds access, use after free and undefined behavior at the line where it happens, often faster than a debugger.
- **Logging strategy**: levels (debug, info, warning, error), one event per line with context (request id, key values), structured fields a machine can search, never secrets, and errors logged once where they are handled.
- `strace` shows the system calls a program makes, useful when a failure is about files, permissions or the network.

### deep
#### Intuition

A bug is a gap between what you believe the program does and what it does. Tools shrink that gap by showing facts: where it crashed (backtrace), what the values were (breakpoints and prints), which rule it broke (sanitizers), what happened over time (logs). Start from facts, not from rereading the code and guessing.

#### A program with two bugs

The median of each day's delivery times. It prints a wrong answer for the second day and crashes on the third:

```cpp
#include <algorithm>
#include <cstdio>
#include <vector>
using namespace std;

// The median delivery time for each day (with two bugs).
double median(vector<int> times) {
    sort(times.begin(), times.end());
    size_t mid = times.size() / 2;
    if (times.size() % 2 == 0) return (times[mid - 1] + times[mid]) / 2;
    return times[mid];
}

int main() {
    vector<vector<int>> days = {{12, 5, 9}, {7, 3, 10, 4}, {}};
    for (auto& day : days) printf("median %.1f\n", median(day));
}
```

#### Finding them

A recorded terminal session (addresses and process ids are this machine's):

```text
$ cd /work/debug
$ g++ -g -O0 -o median median.cpp
$ ./median
median 9.0
median 5.0
Segmentation fault
$ ./median | cat
$ gdb -q -batch -ex run -ex bt ./median
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
median 9.0
median 5.0

Program received signal SIGSEGV, Segmentation fault.
0x0000555555555323 in median (times=std::vector of length 0, capacity 0) at median.cpp:10
10	    if (times.size() % 2 == 0) return (times[mid - 1] + times[mid]) / 2;
#0  0x0000555555555323 in median (times=std::vector of length 0, capacity 0) at median.cpp:10
#1  0x0000555555555599 in main () at median.cpp:16
$ gdb -q -batch -ex 'break median.cpp:10 if times.size() == 4' -ex run -ex 'print times' -ex 'print (times[mid - 1] + times[mid]) / 2' -ex 'print (times[mid - 1] + times[mid]) / 2.0' ./median
Breakpoint 1 at 0x12f3: file median.cpp, line 10.
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
median 9.0

Breakpoint 1, median (times=std::vector of length 4, capacity 4 = {...}) at median.cpp:10
10	    if (times.size() % 2 == 0) return (times[mid - 1] + times[mid]) / 2;
$1 = std::vector of length 4, capacity 4 = {3, 4, 7, 10}
$2 = 5
$3 = 5.5
$ g++ -g -fsanitize=address,undefined -o median-asan median.cpp
$ ./median-asan 2>&1 | head -12
/usr/include/c++/13/bits/stl_vector.h:1129:34: runtime error: applying non-zero offset 18446744073709551612 to null pointer
AddressSanitizer:DEADLYSIGNAL
=================================================================
==661==ERROR: AddressSanitizer: SEGV on unknown address (pc 0x55b86b9a3602 bp 0x7ffcbcb5ca60 sp 0x7ffcbcb5ca30 T0)
==661==The signal is caused by a READ memory access.
==661==Hint: this fault was caused by a dereference of a high value address (see register values below).  Disassemble the provided pc to learn which register was used.
    #0 0x55b86b9a3602 in median(std::vector<int, std::allocator<int> >) /work/debug/median.cpp:10
    #1 0x55b86b9a3fe3 in main /work/debug/median.cpp:16
    #2 0x7fc63a82a1c9 in __libc_start_call_main ../sysdeps/nptl/libc_start_call_main.h:58
    #3 0x7fc63a82a28a in __libc_start_main_impl ../csu/libc-start.c:360
    #4 0x55b86b9a3484 in _start (/work/debug/median-asan+0xf484) (BuildId: ecce5b9145a68a24b6e5ea59c99adee927319ded)

$ exit
exit
```

What each step showed:

- **Run it**: two lines, then a crash. Piped into `cat`, even those two lines vanished: standard output to a pipe is fully buffered, and the crash discarded the buffer. Logs meant to survive a crash should go to standard error, which isn't buffered, or be flushed.
- **Backtrace**: the crash is at line 10 with an empty vector, called from line 16. For an empty list, `mid - 1` wraps round to a huge unsigned number.
- **Conditional breakpoint**: stopping only for the 4-element day, printing the expression in gdb gives 5, and the same with `2.0` gives 5.5. The division is on integers.
- **Sanitizers** name the bad pointer arithmetic inside `vector::operator[]` and the line in our code, without any breakpoints.

#### The fix

An empty day has no median, so the function says so with `std::optional`, and the even case divides by `2.0`:

```cpp
#include <algorithm>
#include <cstdio>
#include <optional>
#include <vector>
using namespace std;

// Fixed: no median for an empty day, and an even count averages in floating point.
optional<double> median(vector<int> times) {
    if (times.empty()) return nullopt;
    sort(times.begin(), times.end());
    size_t mid = times.size() / 2;
    if (times.size() % 2 == 0) return (times[mid - 1] + times[mid]) / 2.0;
    return times[mid];
}

int main() {
    vector<vector<int>> days = {{12, 5, 9}, {7, 3, 10, 4}, {}};
    for (auto& day : days) {
        if (auto m = median(day)) printf("median %.1f\n", *m);
        else fprintf(stderr, "warning: day with no deliveries skipped\n");
    }
}
```

Output (in a terminal):

```text
median 9.0
median 5.5
warning: day with no deliveries skipped
```

Next, a unit test for the empty and even cases, so the bugs can't return quietly.

#### Logging that helps

- One line per event, with a level, a timestamp and key-value context: `level=warn event=empty_day day=3`.
- Log at the edges (requests in and out, calls to other services, retries) rather than inside tight loops.
- Include an id that follows a request across services, so its lines can be joined.
- Never log passwords, tokens or full card numbers.

Connects to: [unit, integration and end-to-end tests](#/concept/eng.testing.unit-integration-and-end-to-end-tests), [observability](#/concept/sysd.building-blocks.observability), [processes](#/concept/eng.linux.processes), [buffering, caching and spooling](#/concept/os.io.buffering-caching-and-spooling).

### questions
Q: How do you approach a bug you can't immediately see?
A: Reproduce it reliably, then shrink the input or code until the failing case is small. Form a hypothesis, check it with a debugger, a print or a sanitizer, fix the cause rather than the symptom, and add a test that fails without the fix.

Q: What does a backtrace tell you after a crash?
A: The chain of function calls that led to the crash, innermost first, with file and line numbers when built with -g. The first frames in your own code, and the argument values shown there, are usually where to start.

Q: What is a conditional breakpoint and when is it useful?
A: A breakpoint that stops only when an expression is true, such as break median.cpp:10 if times.size() == 4. It lets you skip the thousands of iterations that work and stop at the one that fails.

Q: Why can the last lines of output be missing after a crash?
A: When standard output goes to a file or pipe, the C library buffers it and writes in large blocks; a crash loses whatever was still in the buffer. Standard error is unbuffered, and flushing after important messages also avoids the loss.

Q: What makes logs useful in production?
A: Consistent levels, one structured line per event with the context needed to understand it (ids, key values, durations), an id that ties together a request's lines across services, and no secrets. Too much noise at the info level hides the lines that matter.
