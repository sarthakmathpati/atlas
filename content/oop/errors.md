---
topic: oop.errors
name: "Error handling design"
subject: oop
order: 9
prereqs: [oop.foundations]
---

## oop.errors.exceptions-vs-error-codes
name: "Exceptions vs error codes"
importance: important
scope: "trade-offs, exception safety guarantees"

### simple
There are two main ways for code to report a problem: return a special value saying it failed, or throw an exception that jumps out of the normal path. An error code is like a note left on your desk that you might forget to read, while an exception is like a fire alarm that everyone hears and must deal with. Each suits different situations, and good code picks one style on purpose.

### interview
- **Error codes** (return values, `errno`, `std::error_code`, Go's `value, err`): explicit and cheap, but **easy to ignore**, they clutter every call site, and they compete with the real return value.
- **Exceptions**: separate the error path from the normal path, **cannot be silently ignored** (they propagate), carry rich information, and work in constructors and operators. Costs: hidden control flow, and throwing is slow (C++ uses a "zero-cost" model: nothing on the happy path, expensive on throw).
- Typed results sit in between: `std::optional`, C++23 `std::expected`, Rust's `Result`, Java's `Optional`; the failure is in the type, so the caller must look.
- Rule of thumb: exceptions for **unexpected** failures the immediate caller cannot handle (file missing mid-run, out of memory, broken invariants); codes or result types for **expected** outcomes (user typed a bad number, key not found), hot loops and C or cross-language boundaries.
- C++ **exception safety guarantees**: **no-throw** (never fails, required for destructors, swaps and moves), **strong** (commit or roll back: on failure, state is unchanged), **basic** (no leaks and invariants hold, but state may have changed), none.
- Tools for safety: RAII for cleanup, copy-and-swap for the strong guarantee, `noexcept` on operations that cannot fail.

### deep
#### Intuition

With error codes, every caller must check and forward failures by hand, and the one place that forgets turns a clear error into silent corruption. Exceptions make propagation automatic but invisible: any call might jump out of your function, so every function must be written to clean up correctly when that happens. That second requirement is what the exception safety guarantees describe.

#### Three styles for one task

```cpp
// 1. Error code: the caller must remember to check.
int parsePortCode(const string& s, int& out) {
    if (s.empty() || s.size() > 5 || !all_of(s.begin(), s.end(), ::isdigit)) return -1;
    int v = stoi(s);
    if (v < 1 || v > 65535) return -2;
    out = v;
    return 0;
}

// 2. Exception: failure cannot be ignored and carries a message.
int parsePort(const string& s) {
    int v;
    if (int rc = parsePortCode(s, v); rc != 0)
        throw invalid_argument("bad port '" + s + "' (code " + to_string(rc) + ")");
    return v;
}

// 3. Typed result: the failure is part of the type.
optional<int> tryParsePort(const string& s) {
    int v;
    return parsePortCode(s, v) == 0 ? optional<int>(v) : nullopt;
}

int main() {
    int port = 0;
    if (parsePortCode("8080", port) == 0) cout << port << "\n";         // 8080
    try {
        parsePort("99999");
    } catch (const invalid_argument& e) {
        cout << e.what() << "\n";                                       // bad port '99999' (code -2)
    }
    cout << tryParsePort("http").value_or(80) << "\n";                  // 80
}
```

```python
def parse_port(s):
    if not s.isdigit() or not 1 <= int(s) <= 65535:
        raise ValueError(f"bad port {s!r}")
    return int(s)


try:
    parse_port("99999")
except ValueError as e:
    print(e)              # bad port '99999'
```

Python leans on exceptions even for expected cases ("easier to ask forgiveness than permission"), because they are cheap relative to the rest of the language.

#### Exception safety guarantees (worked example)

Moving money between two accounts stored in a map:

```cpp
struct Bank {
    map<string, long long> balances;
    vector<string> audit;

    // No guarantee: if account b does not exist, at(b) throws after a was already debited,
    // and the money vanishes.
    void transferUnsafe(const string& a, const string& b, long long x) {
        balances.at(a) -= x;
        balances.at(b) += x;
        audit.push_back(a + "->" + b);
    }

    // Strong guarantee: do the throwing work on copies, then commit with no-throw swaps.
    void transferStrong(const string& a, const string& b, long long x) {
        auto newBalances = balances;                       // may throw: nothing changed yet
        newBalances.at(a) -= x;                            // may throw (missing key): nothing changed
        newBalances.at(b) += x;
        auto newAudit = audit;
        newAudit.push_back(a + "->" + b);                  // may throw: nothing changed
        balances.swap(newBalances);                        // no-throw commit
        audit.swap(newAudit);
    }
};
```

| guarantee | promise if an exception escapes | example |
|---|---|---|
| no-throw | the operation never fails | destructors, `swap`, move constructors marked `noexcept` |
| strong | state is exactly as before the call | `vector::push_back` for copyable or `noexcept`-movable types, `transferStrong` |
| basic | no leaks, invariants hold, values may differ | `std::sort` with a comparator that throws: every element is still there, in some order |
| none | anything goes | `transferUnsafe`: money can disappear |

The strong version copies the whole map, which is expensive; you choose the guarantee per operation. Destructors must never throw: during stack unwinding a second exception calls `std::terminate`.

#### Java's checked and unchecked exceptions

Java splits exceptions into **checked** (subclasses of `Exception` other than `RuntimeException`, which the compiler forces callers to catch or declare, for recoverable conditions such as `IOException`) and **unchecked** (`RuntimeException` and its subclasses, for programming errors like `NullPointerException`). Checked exceptions make failure part of the signature, the same goal as `expected`, at the cost of boilerplate.

#### Pitfalls

- Catching everything (`catch (...)`, `except Exception: pass`) and hiding real bugs.
- Using exceptions for normal control flow in hot loops (slow in C++ and Java).
- Ignoring return codes, especially from `write`, `close` and system calls.
- Mixing styles randomly inside one module.

Connects to: designing custom exceptions, RAII, rule of three and five, defensive programming.

### questions
Q: What are the trade-offs between exceptions and error codes?
A: Error codes are explicit and cheap but easy to ignore and clutter every call site, and they occupy the return value. Exceptions cannot be silently ignored, keep the normal path clean and carry rich information, but they create hidden control flow and are slow when thrown.

Q: What are the C++ exception safety guarantees?
A: No-throw means the operation never fails. Strong means that if it fails, the program state is unchanged, like a transaction. Basic means that if it fails, nothing leaks and invariants still hold, but values may have changed. Code with no guarantee may leak or corrupt state.

Q: How do you give a function the strong exception guarantee?
A: Do all the work that might throw on copies or temporary objects without touching the real state, then commit the result using operations that cannot throw, such as swap. If anything throws before the commit, the original state is untouched.

Q: Why must destructors not throw exceptions?
A: Destructors run during stack unwinding when another exception is already propagating. If a destructor throws then, the program has two active exceptions and C++ calls std::terminate. Destructors are also implicitly noexcept since C++11.

Q: When would you prefer a result type like optional or expected over an exception?
A: When failure is an ordinary, expected outcome that the caller should handle right away, such as parsing user input or looking up a key, and in performance-critical code or across boundaries where exceptions are unavailable. The type then forces the caller to deal with the failure case.

## oop.errors.designing-custom-exceptions
name: "Designing custom exceptions"
importance: important
prereqs: [oop.errors.exceptions-vs-error-codes]
scope: "hierarchy, meaningful messages"

### simple
Custom exceptions are your own named error types, built so the code that catches them knows exactly what went wrong. A hospital sorts patients by named problems, like a broken arm or a fever, instead of labelling everyone "unwell", so each goes to the right doctor. Good error types and clear messages let each problem reach the code that can fix it.

### interview
- Build a small **hierarchy**: a domain base (`PaymentError`) under the language's standard base (`std::runtime_error`, Java `Exception` or `RuntimeException`, Python `Exception`), with specific subclasses (`CardDeclined`, `InsufficientFunds`). Callers catch as broadly or narrowly as they need.
- Create a new type only when a caller would **handle it differently**; otherwise reuse standard ones (`std::invalid_argument`, `IllegalArgumentException`, `ValueError`, `KeyError`).
- **Messages** state what failed and the relevant values ("order 42: amount 500 exceeds limit 300"), never secrets such as passwords or card numbers.
- Carry **structured fields** for code, not only text: an error code, the order id, whether it is retryable.
- **Chain causes** so the root error is not lost: `new X(msg, cause)` in Java, `raise X(...) from e` in Python, `std::throw_with_nested` in C++.
- In C++ throw by value and catch by **const reference** (avoids slicing and copies). In Java choose checked for recoverable conditions the caller must handle, unchecked for programming errors.

### deep
#### Intuition

A caller catching `Exception` can only log and give up. A caller catching `InsufficientFunds` can offer a smaller amount, while one catching `PaymentGatewayUnavailable` can retry in a minute. Exception types are an API: they tell callers which failures they can react to.

#### A hierarchy in Python

```python
class PaymentError(Exception):
    """Base for every payment failure, so callers can catch them all at once."""

    retryable = False

    def __init__(self, message, *, order_id):
        super().__init__(f"order {order_id}: {message}")
        self.order_id = order_id


class CardDeclined(PaymentError):
    pass


class InsufficientFunds(PaymentError):
    def __init__(self, *, order_id, needed, available):
        super().__init__(f"needs {needed}, only {available} available", order_id=order_id)
        self.needed, self.available = needed, available


class GatewayUnavailable(PaymentError):
    retryable = True


def charge(order_id, amount, balance):
    try:
        if amount > balance:
            raise InsufficientFunds(order_id=order_id, needed=amount, available=balance)
        raise ConnectionError("timeout after 3s")          # simulate a network failure
    except ConnectionError as e:
        raise GatewayUnavailable("gateway down", order_id=order_id) from e   # keep the cause


for amount in (500, 100):
    try:
        charge(42, amount, balance=300)
    except InsufficientFunds as e:
        print("offer a partial payment:", e, e.available)
    except PaymentError as e:
        print("retry later" if e.retryable else "give up", "|", e, "| cause:", repr(e.__cause__))
# offer a partial payment: order 42: needs 500, only 300 available 300
# retry later | order 42: gateway down | cause: ConnectionError('timeout after 3s')
```

#### Worked example: who catches what

| raised | caught by `except InsufficientFunds` | caught by `except PaymentError` | caught by `except Exception` |
|---|---|---|---|
| `InsufficientFunds` | yes | yes | yes |
| `GatewayUnavailable` | no | yes | yes |
| `KeyError` (a bug) | no | no | yes |

Order the `except` or `catch` clauses from most specific to most general; the first match wins.

#### The same in C++ and Java

```cpp
class PaymentError : public runtime_error {
public:
    PaymentError(const string& msg, int orderId)
        : runtime_error("order " + to_string(orderId) + ": " + msg), orderId(orderId) {}
    int orderId;
};

class InsufficientFunds : public PaymentError {
public:
    InsufficientFunds(int orderId, long long needed, long long available)
        : PaymentError("needs " + to_string(needed) + ", only " + to_string(available), orderId),
          needed(needed), available(available) {}
    long long needed, available;
};

void pay(int orderId, long long amount, long long balance) {
    if (amount > balance) throw InsufficientFunds(orderId, amount, balance);   // throw by value
}

int main() {
    try {
        pay(42, 500, 300);
    } catch (const InsufficientFunds& e) {       // catch by const reference: no slicing
        cout << e.what() << " (short by " << e.needed - e.available << ")\n";
    } catch (const PaymentError& e) {
        cout << "payment failed: " << e.what() << "\n";
    }
}
```

```java
class PaymentException extends Exception {                  // checked: callers must handle it
    private final int orderId;
    PaymentException(String message, int orderId, Throwable cause) {
        super("order " + orderId + ": " + message, cause);   // chain the cause
        this.orderId = orderId;
    }
    int orderId() { return orderId; }
}
```

#### Message checklist

- What operation failed and on which entity (ids, file names, keys).
- The offending value and the rule it broke ("amount 500 exceeds limit 300").
- No passwords, tokens, card numbers or personal data.
- Written for the developer reading logs; user-facing text is produced elsewhere from the fields.

#### Pitfalls

- One exception class per function, or one generic `AppException` for everything.
- Catching and rethrowing a new exception without the cause, losing the original stack trace.
- Catching by value in C++ (`catch (PaymentError e)`), which slices a subclass.
- Exceptions as return values for ordinary outcomes.

Connects to: exceptions vs error codes, inheritance, defensive programming, logging.

### questions
Q: How should you structure a hierarchy of custom exceptions?
A: Create one base exception for your domain that extends the language's standard base, then specific subclasses for failures that callers handle differently. Callers can catch the specific type when they can recover and the base type when they only need to report the failure.

Q: What makes a good exception message?
A: It says which operation failed, on which entity, and why, including the relevant values such as ids and limits. It must not contain secrets or personal data, and it is aimed at developers reading logs rather than end users.

Q: What is exception chaining and why does it matter?
A: When you catch a low-level exception and throw a higher-level one, you attach the original as the cause, for example with raise from in Python or a cause argument in Java. The original error and stack trace are kept, which is essential for debugging.

Q: When should you create a new exception type instead of using a standard one?
A: When a caller would want to handle that failure differently from others, or needs structured data from it, such as the available balance. For generic cases like a bad argument or a missing key, standard exceptions communicate the meaning just as well.

Q: Why catch exceptions by const reference in C++?
A: Catching by value copies the exception and slices off any derived-class part, losing its extra data and virtual behavior. Catching by const reference avoids the copy, keeps the full dynamic type and is the idiomatic form.

## oop.errors.defensive-programming
name: "Defensive programming"
importance: advanced
scope: "validation, assertions, fail fast"

### simple
Defensive programming means writing code that expects mistakes and catches them early, before they cause damage. A careful driver assumes other cars might not signal, so they leave space and watch closely. Code that checks its inputs and stops at the first sign of trouble is much easier to fix than code that carries bad data along quietly.

### interview
- **Validate at trust boundaries**: public APIs, user input, files, network messages, configuration. Reject bad data with clear errors there, and trust the data inside.
- **Fail fast**: detect a problem as early as possible and stop loudly, instead of continuing with a bad state that fails far away later.
- **Assertions** check internal assumptions that must never be false if the code is correct (invariants, postconditions). They are often disabled in production (C and C++ `NDEBUG`, Java's `-ea` off by default, Python `-O`), so never use them for input validation.
- Techniques: guard clauses, `Objects.requireNonNull`, preconditions and postconditions, defensive copies, immutable objects, exhaustive `switch` defaults that throw, timeouts on external calls.
- Balance: checks everywhere (re-validating the same value in every layer) add noise and cost; validate once at the boundary and keep internal code clean.

### deep
#### Validation vs assertion

| | input validation | assertion |
|---|---|---|
| checks | data from outside (users, files, networks) | the program's own logic |
| failure means | bad input, expected to happen | a bug in the code |
| response | a clear error, handled by the caller | crash immediately in development |
| in production | always on | often compiled out |

```cpp
struct Account {
    long long balance = 0;

    void withdraw(long long amount) {
        if (amount <= 0)                                     // validation: callers can get this wrong
            throw invalid_argument("amount must be positive, got " + to_string(amount));
        if (amount > balance)
            throw runtime_error("insufficient funds");
        balance -= amount;
        assert(balance >= 0);                                // assertion: our invariant, a bug if false
    }
};

int main() {
    Account a{100};
    try { a.withdraw(-5); } catch (const exception& e) { cout << e.what() << "\n"; }
    a.withdraw(40);
    cout << a.balance << "\n";                               // 60
}
```

#### Fail fast (worked example)

A config loader reads `timeout = "30s"` where a number was expected.

| approach | what happens |
|---|---|
| lenient: default to 0 on parse error | every request times out instantly in production; the cause is three layers away |
| fail fast: raise at startup | the service refuses to start with "timeout: expected a number, got '30s'"; fixed in a minute |

```python
def load_timeout(config):
    raw = config.get("timeout")
    if raw is None:
        raise KeyError("timeout is missing from the config")
    if not str(raw).isdigit():
        raise ValueError(f"timeout: expected a number of seconds, got {raw!r}")
    return int(raw)


try:
    load_timeout({"timeout": "30s"})
except ValueError as e:
    print(e)   # timeout: expected a number of seconds, got '30s'
```

#### Pitfalls

- `assert user_input > 0` in Python: with `-O` the check disappears and bad input flows through.
- Swallowing errors to "keep running" (empty catch blocks), which converts a crash into silent wrong answers.
- Repeating the same null checks in every layer instead of validating once.

Connects to: exceptions vs error codes, designing custom exceptions, encapsulation, immutability.

### questions
Q: What is the difference between input validation and assertions?
A: Validation checks data from outside the program, which can legitimately be wrong, and reports a clear error; it must always run. Assertions check the program's own assumptions, where a failure means a bug, and are often disabled in production builds, so they must never guard against bad input.

Q: What does fail fast mean?
A: Detect errors as close to their source as possible and stop immediately with a clear message, rather than continuing with invalid data. Failures then appear near their cause, which makes them much cheaper to diagnose and fix.

Q: Where should validation happen in a layered application?
A: At trust boundaries, where data enters the system: public APIs, request handlers, file and message parsers, and configuration loading. Inside the boundary, code can assume the data is valid instead of re-checking it everywhere.
