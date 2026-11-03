import { describe, expect, it } from "vitest";
import { classifyChange, diffWords } from "@/lib/text-diff";

const changes = (a: string, b: string) => diffWords(a, b).filter((s) => s.type === "change");

describe("polish diff classification", () => {
  it("typo fix is spelling & grammar", () => {
    expect(classifyChange("writting", "writing")).toBe("spelling");
  });
  it("agreement is → are is spelling & grammar", () => {
    expect(classifyChange("is", "are")).toBe("spelling");
  });
  it("capitalisation only is spelling & grammar", () => {
    expect(classifyChange("berlin", "Berlin")).toBe("spelling");
  });
  it("reworded phrase is style & clarity", () => {
    expect(classifyChange("very good at", "skilled in")).toBe("style");
  });
  it("diff finds the typo and keeps the rest unchanged", () => {
    const c = changes("I am writting code", "I am writing code");
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ original: "writting", text: "writing", kind: "spelling" });
  });
  it("rebuilding the polished text from segments gives the clean text", () => {
    const b = "We are skilled in SQL, and Python.";
    const out = diffWords("we is very good at sql and python", b)
      .map((s) => s.text).join("");
    expect(out).toBe(b);
  });
});
