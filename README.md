# ONboard - AI-Powered Job Tracking & Career Assistant

![ONboard Logo](/public/onboard_logo.png)

ONboard is a comprehensive, AI-driven platform designed to streamline your job search and boost your career strategy. It combines an intuitive Kanban tracker with powerful AI tools to help you manage applications, optimize your CV, and prepare for interviews.

## 🚀 Key Features

### 📋 Job Tracker (Kanban Board)
*   **Drag-and-Drop Management:** Visualize your job hunt funnel through stages: Saved, Applied, Interviewing, Offer, and Rejected.
*   **AI Auto-Add:** Automatically extract job details from descriptions or links using AI.
*   **Smart Filtering & Sorting:** Filter by industry, work model, or application type. Sort by "Match Score" or date.
*   **Auto-Ghosting Detection:** Get notified when a job has been inactive for too long to keep your board clean.

### 🤖 AI Career Assistant
*   **CV Analyzer:** Detailed ATS parsing simulations and optimization feedback.
*   **Corporate Tone Adjuster:** Refine your professional communication to match industry standards.
*   **Skill Translator:** Translate technical experience into industry-specific terminology.
*   **Interview Prep:** AI-generated questions and tips based on specific job descriptions.
*   **Grammar & Polish:** Ensure your professional documents are error-free and impactful.

### 📊 Advanced Analytics
*   **Funnel Visualization:** Identify drop-off points in your application process.
*   **Role Distribution:** Analyze the types of roles you're successfully targeting.
*   **Skill Heatmaps:** See which of your skills are most in-demand for the roles you want.

## 🛠 Tech Stack

*   **Frontend:** React 18 + TypeScript + Vite
*   **Styling:** Tailwind CSS + shadcn/ui
*   **State & Data:** TanStack Query (React Query)
*   **Backend & Auth:** Supabase (PostgreSQL, Auth, Edge Functions)
*   **AI Engine:** Google Gemini Flash (via Supabase Edge Functions)
*   **Charts:** Recharts & Nivo
*   **Internationalization:** i18next

## 🏁 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Supabase Account & CLI

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/onboard.git
    cd onboard
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```

## 📂 Project Structure

*   `src/components/`: UI components (shadcn, Kanban, Assistant tools).
*   `src/lib/`: Core logic, stores, and utility functions.
*   `src/pages/`: Main views (Tracker, Analytics, Assistant, Settings).
*   `supabase/`: Edge Functions (AI processing) and Database migrations.

---

Built to help you land your next big role.
