import { Target } from "lucide-react";
import { InterviewPrep } from "@/pages/Assistant";
import { AssistantPageHeader } from "@/components/assistant/AssistantPageHeader";

export default function InterviewAssistant() {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto">
      <AssistantPageHeader
        icon={<Target className="h-5 w-5 text-accent" />}
        title="Interview Prep"
        subtitle="Generate likely questions and STAR-structured answers for any role you're currently interviewing for."
      />
      <InterviewPrep />
    </div>
  );
}
