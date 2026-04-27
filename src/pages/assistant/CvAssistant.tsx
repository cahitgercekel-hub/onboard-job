import { FileText } from "lucide-react";
import { CvAnalyzer } from "@/pages/Assistant";
import { AssistantPageHeader } from "@/components/assistant/AssistantPageHeader";

export default function CvAssistant() {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto">
      <AssistantPageHeader
        icon={<FileText className="h-5 w-5 text-accent" />}
        title="CV Analyzer"
        subtitle="Score your CV across language, formatting, ATS friendliness, and keywords — with actionable tips."
      />
      <CvAnalyzer />
    </div>
  );
}
