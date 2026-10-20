// Sample data for the no-account demo. Every company, person and posting here is fictional
// (Microsoft-style sample names like Contoso/Fabrikam, example.com links) so the demo never
// looks like a real application history. No contact details anywhere.

export const DEMO_USER_ID = "00000000-0000-4000-8000-0000000000de";
export const DEMO_USER_EMAIL = "demo@onboard.invalid";

type Row = Record<string, unknown>;
export type DemoTables = Record<string, Row[]>;

const DAY = 86_400_000;

interface SampleJob {
  company: string;
  role: string;
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected" | "archived";
  appliedDaysAgo?: number;
  updatedDaysAgo: number;
  type: string;
  industry: string;
  model: string;
  location: string;
  skills: string;
  score?: number;
  reason?: string;
  notes?: string;
  previous?: string;
  rejectionTag?: string;
  archiveType?: "closed" | "rejected" | "ghosted";
  cv?: 0 | 1;
}

const JOBS: SampleJob[] = [
  { company: "Northwind Logistics", role: "Data Analyst", status: "saved", updatedDaysAgo: 2, type: "Full-time", industry: "Tech", model: "Hybrid", location: "Berlin", skills: "SQL, Python, Tableau-style dashboards, stakeholder communication, KPI reporting", score: 82, reason: "Strong SQL and reporting match; logistics domain is new." },
  { company: "Contoso Health", role: "Junior Product Analyst", status: "saved", updatedDaysAgo: 4, type: "Full-time", industry: "Healthcare", model: "Remote", location: "Remote (EU)", skills: "analytics, A/B testing, SQL, product management, communication" },
  { company: "Tailspin Mobility", role: "Working Student Data Engineering", status: "saved", updatedDaysAgo: 6, type: "Working Student", industry: "Automotive", model: "On-site", location: "Munich", skills: "Python, Airflow, ETL, dbt, BigQuery", score: 64, reason: "Python fits; no hands-on Airflow or dbt experience yet." },
  { company: "Relecloud Analytics", role: "BI Developer", status: "saved", updatedDaysAgo: 1, type: "Full-time", industry: "Consulting", model: "Hybrid", location: "Hamburg", skills: "SQL, Snowflake, dbt, presentation, cross-functional" },
  { company: "Fabrikam Robotics", role: "Data Analyst – Operations", status: "applied", appliedDaysAgo: 5, updatedDaysAgo: 5, type: "Full-time", industry: "Manufacturing", model: "On-site", location: "Stuttgart", skills: "SQL, Python, pandas, KPI dashboards, Kanban", score: 78, reason: "Good analytics overlap; manufacturing KPIs would be new.", cv: 0 },
  { company: "Woodgrove Finance", role: "Reporting Analyst", status: "applied", appliedDaysAgo: 9, updatedDaysAgo: 9, type: "Full-time", industry: "Finance", model: "Hybrid", location: "Frankfurt", skills: "SQL, Excel modelling, stakeholder management, KPI, communication", score: 71, reason: "Reporting experience fits; finance regulations not on the CV.", cv: 0 },
  { company: "Adventure Works", role: "E-commerce Analyst", status: "applied", appliedDaysAgo: 16, updatedDaysAgo: 16, type: "Full-time", industry: "E-commerce", model: "Remote", location: "Remote (DE)", skills: "Google Ads, SEO, A/B testing, SQL, analytics", score: 69, reason: "Analytics strong; little paid-marketing exposure.", notes: "No reply yet — follow up next week.", cv: 1 },
  { company: "Litware Media", role: "Junior Data Scientist", status: "applied", appliedDaysAgo: 23, updatedDaysAgo: 23, type: "Full-time", industry: "Media", model: "Hybrid", location: "Cologne", skills: "Python, machine learning, pandas, NLP, communication", score: 58, reason: "Python and pandas fit; limited production ML.", cv: 0 },
  { company: "Proseware Education", role: "Learning Analytics Intern", status: "applied", appliedDaysAgo: 3, updatedDaysAgo: 3, type: "Internship", industry: "Education", model: "Remote", location: "Remote (EU)", skills: "analytics, SQL, data visualisation, presentation", cv: 1 },
  { company: "Margie's Travel", role: "Product Data Analyst", status: "applied", appliedDaysAgo: 12, updatedDaysAgo: 12, type: "Full-time", industry: "Other", model: "Hybrid", location: "Berlin", skills: "SQL, A/B testing, product management, roadmap, stakeholder", score: 74, reason: "Experimentation and SQL fit well.", cv: 1 },
  { company: "Coho Analytics", role: "Analytics Engineer", status: "interviewing", appliedDaysAgo: 20, updatedDaysAgo: 4, type: "Full-time", industry: "Tech", model: "Remote", location: "Remote (EU)", skills: "dbt, SQL, Snowflake, Git, CI/CD", score: 80, reason: "dbt and SQL match; CI/CD only basic.", notes: "Technical interview on Thursday — revise window functions.", cv: 0 },
  { company: "Wide World Importers", role: "Supply Chain Analyst", status: "interviewing", appliedDaysAgo: 26, updatedDaysAgo: 7, type: "Full-time", industry: "E-commerce", model: "On-site", location: "Leipzig", skills: "SQL, Python, forecasting, stakeholder, presentation", score: 72, reason: "Analytical fit; forecasting depth unclear.", notes: "Case study submitted.", cv: 0 },
  { company: "Trey Research", role: "Data Analyst (Part-time)", status: "interviewing", appliedDaysAgo: 18, updatedDaysAgo: 2, type: "Part-time", industry: "Consulting", model: "Hybrid", location: "Düsseldorf", skills: "SQL, analytics, communication, agile", score: 85, reason: "Very close match to the CV.", cv: 1 },
  { company: "Wingtip Airlines", role: "Junior BI Analyst", status: "offer", appliedDaysAgo: 40, updatedDaysAgo: 3, type: "Full-time", industry: "Other", model: "Hybrid", location: "Frankfurt", skills: "SQL, Power BI-style dashboards, KPI, communication", score: 83, reason: "Dashboards and KPI work match the role.", notes: "Offer received — compare with Coho.", previous: "interviewing", cv: 0 },
  { company: "Alpine Ski House", role: "Marketing Analyst", status: "rejected", appliedDaysAgo: 34, updatedDaysAgo: 20, type: "Full-time", industry: "Other", model: "On-site", location: "Garmisch", skills: "SEO, Google Ads, HubSpot, CRM, analytics", score: 52, reason: "Marketing tools not on the CV.", previous: "applied", rejectionTag: "Lacking Experience", cv: 1 },
  { company: "Graphic Design Institute", role: "Data Visualisation Intern", status: "rejected", appliedDaysAgo: 30, updatedDaysAgo: 11, type: "Internship", industry: "Education", model: "Remote", location: "Remote (EU)", skills: "Figma, UX, design system, presentation", score: 47, reason: "Design tooling gap.", previous: "interviewing", rejectionTag: "Role Filled/Closed" },
  { company: "Humongous Insurance", role: "Risk Data Analyst", status: "archived", appliedDaysAgo: 52, updatedDaysAgo: 30, type: "Full-time", industry: "Finance", model: "On-site", location: "Munich", skills: "SQL, Python, statistics", previous: "applied", archiveType: "ghosted" },
  { company: "Fourth Coffee", role: "Operations Analyst", status: "archived", appliedDaysAgo: 45, updatedDaysAgo: 25, type: "Full-time", industry: "Other", model: "Hybrid", location: "Hamburg", skills: "Excel, SQL, operations", previous: "applied", archiveType: "closed" },
];

const CV_TEXT = `Alex Doe — Data Analyst (sample CV for the ONboard demo)

Summary
Data analyst with 2 years of experience turning raw data into dashboards and decisions. Comfortable with SQL, Python (pandas, numpy) and stakeholder communication.

Experience
Junior Data Analyst, Example Retail GmbH (2023–2025)
- Built KPI dashboards used by 40 store managers; cut weekly reporting time by 60%.
- Ran A/B testing analysis for checkout changes with the product team.
- Automated ETL jobs in Python and SQL.

Working Student, Sample Analytics AG (2021–2023)
- Cleaned and modelled data in Postgres; wrote documentation in an agile Scrum team.

Skills
SQL, Python, pandas, numpy, Postgres, Git, analytics, KPI reporting, A/B testing, presentation, communication, Kanban, Jira

Education
B.Sc. Business Informatics (sample university)`;

export function buildDemoTables(now: number = Date.now()): DemoTables {
  const iso = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
  const versions = [
    { id: "00000000-0000-4000-8000-00000000c001", name: "Data Analyst – EN", notes: "General analytics CV", daysAgo: 60 },
    { id: "00000000-0000-4000-8000-00000000c002", name: "Product Analytics – DE", notes: "Emphasises A/B testing", daysAgo: 35 },
  ];

  const jobs = JOBS.map((j, i) => {
    const created = (j.appliedDaysAgo ?? j.updatedDaysAgo) + 1;
    return {
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      user_id: DEMO_USER_ID,
      company: j.company,
      role: j.role,
      url: `https://jobs.example.com/${j.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      date_applied: j.appliedDaysAgo !== undefined ? iso(j.appliedDaysAgo) : null,
      status: j.status,
      application_type: j.type,
      industry: j.industry,
      work_model: j.model,
      location: j.location,
      job_description: `Sample posting (fictional). We are looking for a ${j.role} to join our team. You will work with ${j.skills}.`,
      notes: j.notes ?? null,
      fitness_score: j.score ?? null,
      fitness_reasoning: j.reason ? `Sample AI output: ${j.reason}` : null,
      source: "manual",
      created_at: iso(created),
      updated_at: iso(j.updatedDaysAgo),
      archive_type: j.archiveType ?? null,
      rejection_reason: null,
      rejection_tag: j.rejectionTag ?? null,
      archived_at: j.status === "archived" ? iso(j.updatedDaysAgo) : null,
      rejected_at: j.status === "rejected" ? iso(j.updatedDaysAgo) : null,
      previous_status: j.previous ?? null,
      cv_version_id: j.cv === undefined ? null : versions[j.cv].id,
    };
  });

  return {
    jobs,
    cv_versions: versions.map((v) => ({
      id: v.id, user_id: DEMO_USER_ID, name: v.name, notes: v.notes,
      created_at: iso(v.daysAgo), updated_at: iso(v.daysAgo),
    })),
    cv_baseline: [{
      id: "00000000-0000-4000-8000-00000000b001", user_id: DEMO_USER_ID, cv_text: CV_TEXT,
      file_path: null, file_name: null, created_at: iso(60), updated_at: iso(60),
    }],
    api_tokens: [],
    privacy_settings: [],
    privacy_events: [],
    profiles: [],
    user_roles: [],
  };
}
