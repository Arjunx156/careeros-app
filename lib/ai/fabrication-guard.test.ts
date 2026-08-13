import { describe, expect, test } from "vitest";
import {
  checkForFabricatedNumbers,
  extractQuantities,
  isPlaceholder,
  redactFabricatedNumbers,
} from "@/lib/ai/fabrication-guard";

describe("extractQuantities", () => {
  test("pulls plain integers", () => {
    expect(extractQuantities("Led 3 teams")).toEqual(["3"]);
  });

  test("normalizes thousands separators", () => {
    expect(extractQuantities("50,000 users")).toEqual(["50000"]);
  });

  test("treats trailing-zero decimals as equal to integers", () => {
    expect(extractQuantities("3.0x growth")).toEqual(["3"]);
  });

  test("captures percentages and currency amounts", () => {
    expect(extractQuantities("Cut costs by 40% saving €12,500")).toEqual([
      "40",
      "12500",
    ]);
  });

  test("returns nothing for text without quantities", () => {
    expect(extractQuantities("Improved stakeholder communication")).toEqual([]);
  });

  test("returns nothing for empty input", () => {
    expect(extractQuantities("")).toEqual([]);
  });
});

describe("isPlaceholder", () => {
  test.each(["X", "XX", "[number]", "<value>", "___", "N", "?"])(
    "recognizes %s as a placeholder",
    (token) => {
      expect(isPlaceholder(token)).toBe(true);
    },
  );

  test("does not treat a real number as a placeholder", () => {
    expect(isPlaceholder("40")).toBe(false);
  });
});

describe("checkForFabricatedNumbers", () => {
  const resume =
    "Built Power BI dashboards tracking 12 KPIs, cutting reporting from 5 days to 3. Analysed 50,000 users.";

  test("passes when the suggestion reuses a number from the resume", () => {
    const result = checkForFabricatedNumbers(
      "Built 12 executive dashboards",
      [resume],
    );
    expect(result.ok).toBe(true);
    expect(result.fabricated).toEqual([]);
  });

  test("passes when a number appears only in the original bullet", () => {
    const result = checkForFabricatedNumbers("Reduced churn by 8%", [
      "Reduced churn by 8 percent",
      resume,
    ]);
    expect(result.ok).toBe(true);
  });

  test("catches an invented percentage", () => {
    const result = checkForFabricatedNumbers(
      "Cut reporting time by 40%",
      [resume],
    );
    expect(result.ok).toBe(false);
    expect(result.fabricated).toEqual(["40"]);
  });

  test("catches an inflated version of a real number", () => {
    // The resume says 50,000 — claiming 500,000 is fabrication, not rounding.
    const result = checkForFabricatedNumbers("Analysed 500,000 users", [resume]);
    expect(result.ok).toBe(false);
    expect(result.fabricated).toEqual(["500000"]);
  });

  test("matches across differing thousands formatting", () => {
    const result = checkForFabricatedNumbers("Analysed 50000 users", [resume]);
    expect(result.ok).toBe(true);
  });

  test("passes a suggestion containing no numbers at all", () => {
    const result = checkForFabricatedNumbers(
      "Partnered with engineering to improve reconciliation",
      [resume],
    );
    expect(result.ok).toBe(true);
  });

  test("reports each fabricated value once", () => {
    const result = checkForFabricatedNumbers("Grew 99% then another 99%", [
      resume,
    ]);
    expect(result.fabricated).toEqual(["99"]);
  });

  test("allows placeholder-style suggestions through untouched", () => {
    const result = checkForFabricatedNumbers(
      "Cut reporting time by X% (add your real figure)",
      [resume],
    );
    expect(result.ok).toBe(true);
  });
});

describe("redactFabricatedNumbers", () => {
  test("replaces only the fabricated value, preserving real ones", () => {
    expect(
      redactFabricatedNumbers("Built 12 dashboards, cutting time by 40%", ["40"]),
    ).toBe("Built 12 dashboards, cutting time by X%");
  });

  test("handles formatted numbers", () => {
    expect(redactFabricatedNumbers("Served 500,000 users", ["500000"])).toBe(
      "Served X users",
    );
  });

  test("returns the input unchanged when nothing was fabricated", () => {
    expect(redactFabricatedNumbers("Built 12 dashboards", [])).toBe(
      "Built 12 dashboards",
    );
  });
});
