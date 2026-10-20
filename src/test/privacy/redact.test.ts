import { describe, it, expect } from "vitest";
import { redactContactDetails } from "../../../supabase/functions/_shared/redact";

// Synthetic CV snippets only.
describe("redactContactDetails", () => {
  it("removes email addresses", () => {
    expect(redactContactDetails("Contact: max.mustermann+jobs@example.de")).toBe("Contact: [email removed]");
  });

  it("removes phone numbers in common formats", () => {
    for (const phone of ["+49 176 12345678", "0176 12345678", "+49 (0) 89 1234567", "0049-30-1234567", "(030) 123 4567"]) {
      expect(redactContactDetails(`Tel: ${phone}`), phone).toBe("Tel: [phone removed]");
    }
  });

  it("removes profile and website links", () => {
    expect(redactContactDetails("linkedin.com/in/max-m and https://max.example.dev/cv"))
      .toBe("[link removed] and [link removed]");
    expect(redactContactDetails("see www.example.org")).toBe("see [link removed]");
  });

  it("keeps the content the AI needs", () => {
    const keep = [
      "Software Engineer, ACME GmbH, 2019-2023",
      "2019 - 2023 Working Student",
      "80331 München",
      "Increased revenue by 25% (EUR 50.000 - 60.000)",
      "Born 01.02.1995",
      "Managed a budget of 1,200,000 EUR",
    ];
    for (const line of keep) expect(redactContactDetails(line), line).toBe(line);
  });

  it("handles empty input", () => {
    expect(redactContactDetails("")).toBe("");
  });
});
