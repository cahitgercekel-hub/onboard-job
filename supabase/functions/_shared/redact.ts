// Data minimisation for AI requests: strip direct contact details from CV text before it leaves
// our backend. Names, employers and dates stay — the AI needs them to give useful advice.
// Pure module (no Deno APIs) so it is unit-tested with vitest.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_LIKE = /\b(?:https?:\/\/|www\.)[^\s<>()]+|\b(?:linkedin\.com|xing\.com|github\.com)\/[^\s<>()]+/gi;
// Phone-like: optional +/00 country prefix, then digit groups separated by single spaces, dots,
// slashes, dashes or parentheses. Checked afterwards for 8–15 digits so years ("2019-2023"),
// postcodes and salaries are left alone.
const PHONE_CANDIDATE = /(?:\+|\b00)?\(?\d[\d ()./-]{6,}\d\b/g;

function looksLikePhone(match: string): boolean {
  const digits = match.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  if (/^\d{4}\s?[-–]\s?\d{4}$/.test(match.trim())) return false; // year range
  if (/\d{2}[./]\d{2}[./]\d{4}/.test(match)) return false; // date
  const trimmed = match.trim();
  const international = trimmed.startsWith("+") || trimmed.startsWith("00");
  if (!international && /^\d{1,3}(?:[.,]\d{3})+(?:\s*[-–]\s*\d{1,3}(?:[.,]\d{3})+)?$/.test(trimmed)) return false; // amounts
  if (!international && /\s[-–]\s/.test(trimmed)) return false; // spaced ranges ("50 - 60")
  const groups = match.split(/[ ()./-]+/).filter(Boolean);
  return international || match.includes("(") || groups.length <= 4;
}

export function redactContactDetails(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL, "[email removed]")
    .replace(URL_LIKE, "[link removed]")
    .replace(PHONE_CANDIDATE, (m) => (looksLikePhone(m) ? "[phone removed]" : m));
}
