// What each AI tool sends, shown to the user before the tool's first use (see aiAccess.tsx).
// Keep in sync with the payloads built in the components and edge functions.

export type AiFeature =
  | "chat" | "fitness" | "fitness_bulk" | "extract" | "polish" | "cover_letter"
  | "tone" | "translate" | "interview" | "cv_review" | "cv_optimize";

export const AI_FEATURES: Record<AiFeature, { title: string; sends: string[] }> = {
  chat: {
    title: "AI career chat",
    sends: [
      "The messages in this conversation (the last 24)",
      "If a job is attached: its company, role, job description and match score",
      "Your baseline CV text — only while \"Share my CV\" is on (emails, phone numbers and links removed)",
    ],
  },
  fitness: {
    title: "Fitness score",
    sends: [
      "This job's company, role, type, industry, work model, location and description",
      "Your baseline CV text (emails, phone numbers and links removed)",
    ],
  },
  fitness_bulk: {
    title: "Recalculate all fitness scores",
    sends: [
      "For every active job that has a description: company, role, type, industry, work model, location and description",
      "Your baseline CV text with each job (emails, phone numbers and links removed)",
    ],
  },
  extract: { title: "AI Auto-Add", sends: ["The job posting text you pasted", "The posting URL, if you entered one"] },
  polish: { title: "Grammar & polish", sends: ["The text you entered", "The selected language"] },
  cover_letter: { title: "Cover letter refinement", sends: ["Your current cover letter draft", "The quick-action instruction"] },
  tone: { title: "Corporate tone analyzer", sends: ["The company name you entered", "Your cover letter draft"] },
  translate: { title: "Skill translator", sends: ["The experience text you entered", "The job description you entered"] },
  interview: { title: "Interview prep", sends: ["The selected job's company, role and job description (not your notes)"] },
  cv_review: { title: "CV analyzer", sends: ["The CV text in the analyzer (emails, phone numbers and links removed)"] },
  cv_optimize: {
    title: "CV optimizer",
    sends: ["Your baseline CV text (emails, phone numbers and links removed)", "The skill names from your skill heatmap"],
  },
};
