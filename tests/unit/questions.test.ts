import { describe, expect, it } from "vitest";
import { answerIsEmpty } from "../../src/components/QuestionInput";
describe("required question values", () => {
  it("treats numeric zero as a completed answer", () => expect(answerIsEmpty(0)).toBe(false));
  it("accepts one or more choices", () => expect(answerIsEmpty(["Software"])).toBe(false));
  it("rejects empty, whitespace and missing answers", () => {
    for (const value of [undefined, null, "", "  ", []]) expect(answerIsEmpty(value)).toBe(true);
  });
});
