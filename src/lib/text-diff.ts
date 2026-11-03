/** Word-level diff between an original and a polished text, with change classification. */

export type ChangeKind = "spelling" | "style";

export type DiffSegment =
  | { type: "equal"; text: string }
  | { type: "change"; id: number; kind: ChangeKind; original: string; text: string };

const TOKEN_RE = /\s+|[\p{L}\p{N}'’-]+|[^\s\p{L}\p{N}]/gu;

function tokenize(s: string): string[] {
  return s.match(TOKEN_RE) ?? [];
}

const isSpace = (t: string) => /^\s+$/.test(t);
const isWord = (t: string) => /[\p{L}\p{N}]/u.test(t);

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Common agreement / article swaps that exceed edit distance 2 but are grammar fixes. */
const GRAMMAR_PAIRS = new Set([
  "is|are", "was|were", "has|have", "do|does", "a|an", "this|these", "that|those", "its|it's", "your|you're", "their|they're", "there|their",
]);
const isGrammarPair = (x: string, y: string) => GRAMMAR_PAIRS.has(`${x}|${y}`) || GRAMMAR_PAIRS.has(`${y}|${x}`);

/** Spelling & grammar if every changed word is a small edit, or only punctuation/case changed. */
export function classifyChange(original: string, next: string): ChangeKind {
  const a = tokenize(original).filter((t) => !isSpace(t));
  const b = tokenize(next).filter((t) => !isSpace(t));
  const aw = a.filter(isWord);
  const bw = b.filter(isWord);
  // Only punctuation added/removed/changed.
  if (aw.length === bw.length && aw.every((w, i) => w.toLowerCase() === bw[i].toLowerCase())) return "spelling";
  if (aw.length !== bw.length || aw.length === 0) return "style";
  const small = aw.every((w, i) => editDistance(w.toLowerCase(), bw[i].toLowerCase()) <= 2 || isGrammarPair(w.toLowerCase(), bw[i].toLowerCase()));
  return small ? "spelling" : "style";
}

type Op = { op: "eq" | "del" | "ins"; tok: string };

function lcsOps(a: string[], b: string[]): Op[] {
  const m = a.length;
  const n = b.length;
  const dp: Uint16Array[] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { ops.push({ op: "eq", tok: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ op: "del", tok: a[i] }); i++; }
    else { ops.push({ op: "ins", tok: b[j] }); j++; }
  }
  while (i < m) ops.push({ op: "del", tok: a[i++] });
  while (j < n) ops.push({ op: "ins", tok: b[j++] });
  return ops;
}

const MAX_TOKENS = 3000;

export function diffWords(original: string, polished: string): DiffSegment[] {
  const a = tokenize(original);
  const b = tokenize(polished);
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return [{ type: "equal", text: polished }];
  const ops = lcsOps(a, b);

  // Group into hunks; a lone whitespace "equal" between two changes is absorbed into the hunk.
  const segments: DiffSegment[] = [];
  let id = 0;
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === "eq") {
      let text = "";
      while (k < ops.length && ops[k].op === "eq") text += ops[k++].tok;
      segments.push({ type: "equal", text });
      continue;
    }
    let del = "";
    let ins = "";
    while (k < ops.length) {
      const o = ops[k];
      if (o.op === "del") { del += o.tok; k++; continue; }
      if (o.op === "ins") { ins += o.tok; k++; continue; }
      // Absorb whitespace-only equal runs if another change follows.
      let m = k;
      let ws = "";
      while (m < ops.length && ops[m].op === "eq" && isSpace(ops[m].tok)) ws += ops[m++].tok;
      if (ws && m < ops.length && ops[m].op !== "eq") { del += ws; ins += ws; k = m; continue; }
      break;
    }
    // Keep leading/trailing whitespace of an insertion outside the box.
    const lead = ins.match(/^\s*/)?.[0] ?? "";
    const trail = ins.slice(lead.length).match(/\s*$/)?.[0] ?? "";
    const core = ins.slice(lead.length, ins.length - trail.length);
    const origCore = del.trim();
    if (!core && !origCore) { if (ins) segments.push({ type: "equal", text: ins }); continue; }
    if (lead) segments.push({ type: "equal", text: lead });
    segments.push({ type: "change", id: id++, kind: classifyChange(origCore, core), original: origCore, text: core });
    if (trail) segments.push({ type: "equal", text: trail });
  }
  return segments;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Ids of diff changes that a "key changes" sentence seems to refer to. */
export function matchChangeIds(description: string, segments: DiffSegment[]): number[] {
  const d = ` ${norm(description)} `;
  const ids: number[] = [];
  for (const s of segments) {
    if (s.type !== "change") continue;
    const cands = [norm(s.original), norm(s.text)].filter((c) => c.length >= 3);
    if (cands.some((c) => d.includes(` ${c} `) || d.includes(c))) ids.push(s.id);
  }
  return ids;
}

const SPELLING_HINT = /spell|typo|grammar|punctuat|capital|agreement|comma|apostrophe|tense/i;

export function describeKind(description: string, segments: DiffSegment[]): ChangeKind {
  const ids = matchChangeIds(description, segments);
  const first = segments.find((s) => s.type === "change" && ids.includes(s.id));
  if (first && first.type === "change") return first.kind;
  return SPELLING_HINT.test(description) ? "spelling" : "style";
}
