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

## eng.testing.test-driven-development
name: "Test-driven development"
importance: important
prereqs: [eng.testing.unit-integration-and-end-to-end-tests]
scope: "red, green, refactor"

## eng.testing.mocks-and-stubs
name: "Mocks and stubs"
importance: important
prereqs: [eng.testing.unit-integration-and-end-to-end-tests]
scope: "isolating dependencies"

## eng.testing.debugging-tools
name: "Debugging tools"
importance: important
scope: "debuggers, breakpoints, logging strategy"
