import { describe, expect, test } from "vitest";
import { MAIN_REGISTRY_UNITS, UNITS } from "./equipment";

describe("main registry unit choices", () => {
  test("excludes RSL from registration and list choices", () => {
    expect(MAIN_REGISTRY_UNITS.map((unit) => unit.code)).not.toContain("RSL");
  });
  test("excludes GTR from registration and list choices", () => {
    expect(MAIN_REGISTRY_UNITS.map((unit) => unit.code)).not.toContain("GTR");
  });
  test("retains ASU and MNU without removing units from other registries", () => {
    expect(MAIN_REGISTRY_UNITS.map((unit) => unit.code)).toEqual(["ASU", "MNU"]);
    expect(UNITS.map((unit) => unit.code)).toContain("RSL");
    expect(UNITS.map((unit) => unit.code)).toContain("GTR");
  });
});