import { describe, expect, it } from "vitest";
import {
  checkAnswer,
  evaluateExpression,
  ExpressionError,
  variablesIn,
} from "@/lib/quant/answerCheck";

describe("evaluateExpression", () => {
  it("handles numbers, fractions, powers, constants and sqrt", () => {
    expect(evaluateExpression("161/36")).toBeCloseTo(4.4722, 4);
    expect(evaluateExpression("1/e")).toBeCloseTo(0.3679, 4);
    expect(evaluateExpression("2^10")).toBe(1024);
    expect(evaluateExpression("2**3")).toBe(8);
    expect(evaluateExpression("-2^2")).toBe(-4);
    expect(evaluateExpression("sqrt(50)")).toBeCloseTo(7.0711, 4);
    expect(evaluateExpression("√2")).toBeCloseTo(1.4142, 4);
    expect(evaluateExpression("2pi")).toBeCloseTo(6.2832, 4);
    expect(evaluateExpression("3(4 + 1)")).toBe(15);
    expect(evaluateExpression("50.7%")).toBeCloseTo(0.507, 6);
    expect(evaluateExpression("1,000 / 4")).toBe(250);
    expect(evaluateExpression("1 - (5/6)^4")).toBeCloseTo(671 / 1296, 10);
    expect(evaluateExpression("1/(n+1)", { n: 4 })).toBe(0.2);
  });

  it("rejects anything that is not arithmetic, without eval", () => {
    for (const bad of ["alert(1)", "2 +", "(1 + 2", "1..2", "foo", "1; 2", "constructor"]) {
      expect(() => evaluateExpression(bad), bad).toThrow(ExpressionError);
    }
  });

  it("finds variables", () => {
    expect(variablesIn("1/(n+1)")).toEqual(["n"]);
    expect(variablesIn("sqrt(pi) + e")).toEqual([]);
  });
});

describe("checkAnswer", () => {
  it("accepts equivalent forms within 0.5%", () => {
    expect(checkAnswer("2/3", "2/3")).toBe("correct");
    expect(checkAnswer("0.667", "2/3")).toBe("correct");
    expect(checkAnswer("0.66", "2/3")).toBe("incorrect");
    expect(checkAnswer("x = 6", "6")).toBe("correct");
    expect(checkAnswer("≈ 0.507", "0.507")).toBe("correct");
    expect(checkAnswer("50.7%", "0.507")).toBe("correct");
    expect(checkAnswer("14 drops", "14")).toBe("correct");
    expect(checkAnswer("6.", "6")).toBe("correct");
  });

  it("compares yes/no answers as words", () => {
    expect(checkAnswer("Yes, XOR is 2", "yes")).toBe("correct");
    expect(checkAnswer("no", "yes")).toBe("incorrect");
    expect(checkAnswer("maybe", "yes")).toBe("unreadable");
  });

  it("reports unreadable input instead of guessing", () => {
    expect(checkAnswer("I think it's a lot", "6")).toBe("unreadable");
    expect(checkAnswer("", "6")).toBe("unreadable");
  });
});
