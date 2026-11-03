// Pre-written AI examples for the no-account demo. In demo mode every AI tool shows one of these
// instead of calling the backend, so the features can be shown without sending anything anywhere.
// All names, companies and numbers are fictional and match the demo seed data.

import { CV_TEXT } from "./seed";

export const DEMO_AI_DELAY_MS = 900;

export function demoDelay(ms: number = DEMO_AI_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------ Sample inputs ----------------------------- */

export const DEMO_SAMPLE_CV = CV_TEXT;

export const DEMO_TONE_SAMPLE = {
  company: "Contoso Health",
  draft:
    "Hey team,\n\nI saw your Junior Product Analyst job and I think I'd be a great fit. I'm super into data and I've done loads of A/B tests. " +
    "Honestly I'm a fast learner so the healthcare stuff won't be a problem.\n\nLet me know when we can chat!\nAlex",
};

export const DEMO_TRANSLATE_SAMPLE = {
  experience:
    "Ran the weekly sales report for my student job at a bike shop. Built a spreadsheet that tracked which repair types took longest, " +
    "and suggested a booking change that cut waiting times. Helped the owner pick which products to reorder.",
  jobDescription:
    "Fabrikam Robotics is looking for a Data Analyst – Operations. You will build KPI dashboards with SQL and Python (pandas), " +
    "analyse production bottlenecks and present findings to shift leads. Experience with Kanban or lean methods is a plus.",
};

export const DEMO_POLISH_SAMPLE =
  "Dear Hiring team, i am writting to apply for the Reporting Analyst position at Woodgrove Finance. " +
  "I have experiance with SQL and excel and i worked with alot of stakeholders in my last role. " +
  "I think my skills is a good match and i would love to talk more about it.";

/* ------------------------------ Tool results ------------------------------ */

export interface DemoToneResult {
  culture: string; toneVerdict: string; toneScore: number; toneReasoning: string;
  issues: string[]; edits: { before: string; after: string; reason: string }[];
}
export interface DemoTranslateResult { bullets: { text: string; reason: string }[] }
export interface DemoPolishResult { polished: string; changes: string[] }
export interface DemoInterviewResult {
  questions: { question: string; situation: string; task: string; action: string; result: string }[];
}
export interface DemoCvResult {
  scores: { language: number; formatting: number; ats: number; keywords: number };
  tips: string[]; strongKeywords: string[];
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export function demoTone(payload: Record<string, unknown>): DemoToneResult {
  const company = str(payload.company, "Contoso Health");
  return {
    culture: `${company} reads as a regulated, patient-focused organisation: friendly but careful, with an emphasis on evidence and accuracy.`,
    toneVerdict: "Too casual for this company",
    toneScore: 5,
    toneReasoning: "The draft is warm and motivated, but slang and unsupported claims undercut credibility in a healthcare setting.",
    issues: [
      "Opening with \"Hey team\" is too informal for a first contact.",
      "\"Loads of A/B tests\" is vague — give one concrete example with a result.",
      "\"The healthcare stuff won't be a problem\" can sound dismissive of a regulated domain.",
    ],
    edits: [
      {
        before: "Hey team,",
        after: `Dear ${company} hiring team,`,
        reason: "A neutral, respectful greeting fits a careful, regulated culture.",
      },
      {
        before: "I'm super into data and I've done loads of A/B tests.",
        after: "I enjoy turning product data into decisions — in my last project I ran four A/B tests that lifted sign-up conversion by 9%.",
        reason: "Specific evidence replaces enthusiasm-only language.",
      },
      {
        before: "Honestly I'm a fast learner so the healthcare stuff won't be a problem.",
        after: "I'm new to healthcare and have started reading up on patient-data privacy, so I can learn your domain quickly and responsibly.",
        reason: "Acknowledges the domain gap honestly and shows respect for it.",
      },
    ],
  };
}

export function demoTranslate(): DemoTranslateResult {
  return {
    bullets: [
      {
        text: "Built and maintained a weekly sales KPI report, giving the owner a single view of revenue and repair volume.",
        reason: "Maps your weekly report to the posting's \"KPI dashboards\" requirement.",
      },
      {
        text: "Analysed repair turnaround data to find the slowest job types and proposed a booking change that reduced customer waiting times.",
        reason: "Frames your spreadsheet work as bottleneck analysis, the core of the operations role.",
      },
      {
        text: "Presented reorder recommendations to the owner based on sales trends, supporting stock decisions with data.",
        reason: "Shows you can present findings to decision-makers, like the shift leads mentioned.",
      },
    ],
  };
}

export function demoPolish(): DemoPolishResult {
  return {
    polished:
      "Dear Hiring Team,\n\nI am writing to apply for the Reporting Analyst position at Woodgrove Finance. " +
      "I have hands-on experience with SQL and Excel, and in my previous role I worked closely with stakeholders across several teams.\n\n" +
      "I believe my skills are a strong match for this position, and I would welcome the opportunity to discuss them with you.",
    changes: [
      "Fixed spelling: \"writting\", \"experiance\", \"alot\".",
      "Capitalised \"I\" and \"Excel\" throughout.",
      "Corrected grammar: \"my skills is\" → \"my skills are\".",
      "Split one long paragraph into two for readability.",
      "Replaced \"I think\" with a more confident \"I believe\".",
      "Made the closing more formal.",
    ],
  };
}

export function demoInterview(payload: Record<string, unknown>): DemoInterviewResult {
  const company = str(payload.company, "Coho Analytics");
  const role = str(payload.role, "Analytics Engineer");
  return {
    questions: [
      {
        question: `Why do you want to work as a ${role} at ${company}?`,
        situation: "During my thesis I spent most of my time cleaning and modelling data rather than analysing it.",
        task: "I wanted to make that pipeline reliable so others could trust the numbers.",
        action: `I rebuilt it with SQL models and tests, which is exactly the kind of work ${company} describes.`,
        result: "Report preparation went from two days to two hours, and I realised this is the work I enjoy most.",
      },
      {
        question: "Tell me about a time a number in a report turned out to be wrong.",
        situation: "A weekly dashboard showed a 30% jump in orders that nobody could explain.",
        task: "I had to find the cause before the numbers went to management.",
        action: "I traced the data back step by step and found duplicate rows from a changed export format, then added a uniqueness check.",
        result: "We corrected the report the same day, and the check has caught two similar issues since.",
      },
      {
        question: "How would you explain a window function to a non-technical colleague?",
        situation: "A product manager asked why our running totals differed from their spreadsheet.",
        task: "I needed to explain the logic without jargon.",
        action: "I compared it to a moving tally on a whiteboard that only looks at the rows around today, and showed both side by side.",
        result: "They understood the difference and now ask for running totals by name.",
      },
      {
        question: "Describe a time you had to prioritise several urgent requests.",
        situation: "Three teams asked for data pulls in the same week as a release.",
        task: "I had to deliver without missing the release.",
        action: "I listed each request's deadline and impact, agreed the order with my manager, and sent each team an honest date.",
        result: "All three were delivered within two days of the agreed dates, and the release went out on time.",
      },
    ],
  };
}

export function demoCv(): DemoCvResult {
  return {
    scores: { language: 78, formatting: 84, ats: 81, keywords: 66 },
    tips: [
      "Add a result to each bullet in your most recent role (for example time saved or error rate reduced).",
      "Mention dbt and Airflow only if you have used them — several saved jobs ask for them.",
      "Move Skills above Education so recruiters see SQL and Python in the first few seconds.",
    ],
    strongKeywords: ["SQL", "Python", "pandas", "KPI reporting", "Stakeholder communication", "A/B testing"],
  };
}

/** Pre-written result for a career-assistant tool, by tool name. */
export function demoToolResult(tool: string, payload: Record<string, unknown>): unknown {
  switch (tool) {
    case "tone": return demoTone(payload);
    case "translate": return demoTranslate();
    case "polish": return demoPolish();
    case "interview": return demoInterview(payload);
    case "cv": return demoCv();
    default: return null;
  }
}

/* -------------------------------- Auto-add -------------------------------- */

export const DEMO_EXTRACT_SAMPLE_TEXT =
  "Fourth Coffee is hiring a Junior Data Analyst (Full-time, hybrid, Berlin). You will build weekly sales dashboards in SQL, " +
  "analyse store performance with Python and present insights to regional managers. Nice to have: experience with A/B testing.";

export function demoExtract() {
  return {
    company: "Fourth Coffee",
    role: "Junior Data Analyst",
    applicationType: "Full-time",
    industry: "Other",
    workModel: "Hybrid",
    location: "Berlin",
    jobDescription: DEMO_EXTRACT_SAMPLE_TEXT,
    notes: "Example output (demo): extracted from a sample posting.",
  };
}

/* -------------------------------- Fitness --------------------------------- */

export function demoFitness(company: string, role: string): { score: number; reasoning: string } {
  let h = 0;
  for (const ch of `${company}|${role}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const score = 60 + (h % 30);
  return {
    score,
    reasoning:
      `Example output (demo): SQL, Python and KPI reporting on your CV match the core of the ${role} role at ${company}. ` +
      "The posting also asks for tools you have not used in production yet, which keeps the score below 90.",
  };
}

/* ---------------------------------- Chat ---------------------------------- */

export interface DemoChatJob { company: string; role: string }

export function demoChatReply(prompt: string, job: DemoChatJob | null): string {
  const p = prompt.toLowerCase();
  const company = job?.company ?? "Fabrikam Robotics";
  const role = job?.role ?? "Data Analyst – Operations";

  if (p.includes("tailor")) {
    return `## Tailored for ${role} at ${company}

**Rewritten summary**

> Data analyst with hands-on SQL and Python (pandas) experience who turns operational data into clear KPI dashboards. Comfortable presenting findings to non-technical teams and improving processes step by step.

**3 most-improved bullet points**

1. *Before:* "Made reports for the team." → **After:** "Built a weekly KPI dashboard in SQL that replaced three manual spreadsheets and saved about 4 hours a week."
2. *Before:* "Helped with data cleaning." → **After:** "Wrote pandas checks that cut duplicate records by 95% before monthly reporting."
3. *Before:* "Worked with other departments." → **After:** "Presented bottleneck findings to operations leads, leading to a schedule change that reduced wait times by 12%."

**Tip:** ${company} mentions Kanban — add one line about how you organised your own work on a board.`;
  }

  if (p.includes("interview questions")) {
    return `## 8 likely questions for ${role} at ${company}

### Technical
1. **How would you find the slowest step in a production line from raw event data?** — *Hint:* talk about timestamps per step, medians, and checking for outliers.
2. **Write a query that shows each week's output and the change vs. the week before.** — *Hint:* mention a window function like \`LAG\`.
3. **How do you check a dashboard number before sharing it?** — *Hint:* reconcile with the source and one manual sample.
4. **Which KPIs would you track for an operations team?** — *Hint:* throughput, cycle time, defect rate — and why each matters.

### Behavioural
5. **Tell me about a time your analysis changed a decision.** — *Hint:* use STAR and end with a number.
6. **Describe a disagreement with a stakeholder about data.** — *Hint:* show you listened, then let the data settle it.
7. **How do you handle several urgent requests?** — *Hint:* impact × deadline, and say it out loud to people.
8. **Why ${company}?** — *Hint:* connect robotics and operations to a concrete project you admire.

Want to practise one? Pick a number.`;
  }

  if (p.includes("mock interview")) {
    return `Let's start the mock interview for **${role} at ${company}**.

**Question 1:** *"Tell me about a time you found a problem in a process using data. What did you do, and what changed?"*

Take your time and answer in a few sentences. I'll give STAR feedback before the next question.`;
  }

  if (p.includes("negotiate")) {
    return `## Negotiating your offer at ${company}

1. **Thank them and ask for the full offer in writing** before discussing numbers.
2. **Anchor on market data:** junior analyst roles in your city typically range €48–56k — ask for the upper half with a short reason.
3. **Negotiate the package, not just base:** sign-on bonus, learning budget, remote days.
4. **Keep it friendly and specific:** "Based on the scope and my SQL and Python experience, I was hoping for €54k. Is there flexibility?"

*All figures are example values for the demo.*`;
  }

  if (p.includes("skill gaps")) {
    return `## Your biggest skill gaps (based on the demo jobs)

| Skill | Asked for in | On your CV |
|---|---|---|
| dbt | 3 jobs | No |
| Airflow | 2 jobs | No |
| Snowflake | 2 jobs | No |

**90-day plan**
- **Weeks 1–4:** finish a free dbt course and model one public dataset.
- **Weeks 5–8:** schedule that model with Airflow locally.
- **Weeks 9–12:** write a short case study and add it to your CV.`;
  }

  if (p.includes("pivot")) {
    return `## Adjacent roles you could move into

1. **Analytics Engineer** — add dbt, Git and testing.
2. **Product Analyst** — add experiment design and product metrics.
3. **BI Developer** — add a BI tool and data modelling.

Your SQL and stakeholder skills carry over to all three.`;
  }

  // Default and "follow-up": a follow-up plan for the selected job.
  return `## Follow-up plan for ${company}

You applied for **${role}** a few days ago. Here's a calm, professional plan:

1. **Day 7 — short follow-up email** to the recruiter (draft below).
2. **Day 10 — connect on LinkedIn** with one person on the team, with a one-line note.
3. **Day 14 — final check-in**, then move your energy to new applications.

**Draft email**

> Subject: ${role} application — Alex Doe
>
> Hi there, I applied for the ${role} position last week and wanted to say I'm still very interested. My SQL and pandas work on KPI dashboards matches what you describe, and I'd be glad to share an example. Thank you for your time!
>
> Best regards, Alex

Nothing is sent automatically — copy it into your own email when you're ready.`;
}
