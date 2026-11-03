import { describe, it, expect } from "vitest";
import { searchCities, parseLocations, formatLocations } from "@/lib/german-cities";

describe("location search", () => {
  it("finds München for 'munchen'", () => {
    expect(searchCities("munchen").map((c) => c.name)).toContain("München");
  });
  it("finds München for the English alias 'Munich'", () => {
    expect(searchCities("Munich").map((c) => c.name)).toContain("München");
  });
  it("finds Köln for 'Cologne'", () => {
    expect(searchCities("cologne").map((c) => c.name)).toContain("Köln");
  });
  it("returns nothing for an unknown city", () => {
    expect(searchCities("Zzyzx")).toHaveLength(0);
  });
  it("round-trips multiple locations as a ', ' string", () => {
    expect(formatLocations(["Berlin", "Remote (EU)"])).toBe("Berlin, Remote (EU)");
    expect(parseLocations("Berlin,  Remote (EU)")).toEqual(["Berlin", "Remote (EU)"]);
  });
});
