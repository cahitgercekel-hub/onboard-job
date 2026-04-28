import { Target, Infinity as InfinityIcon } from "lucide-react";
import { CvAnalyzer } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";

export default function CvAssistant() {
  return (
    <AssistantToolShell
      title="CV Analyzer"
      subtitle="Score your CV across language, formatting, ATS friendliness, and keywords — with actionable tips."
      premiumTools={[
        { id: "ats-sim", icon: Target, title: "Detailed ATS Simulation", desc: "Per-section parser report and recruiter heatmap." },
        { id: "unlimited-scans", icon: InfinityIcon, title: "Unlimited Daily Scans", desc: "Re-scan as often as you iterate on your CV." },
      ]}
    >
      <CvAnalyzer />
    </AssistantToolShell>
  );
}
