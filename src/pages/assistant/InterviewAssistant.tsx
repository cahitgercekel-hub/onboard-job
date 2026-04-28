import { Mic, MessageSquare } from "lucide-react";
import { InterviewPrep } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";

export default function InterviewAssistant() {
  return (
    <AssistantToolShell
      title="Interview Prep"
      subtitle="Generate likely questions and STAR-structured answers for any role you're currently interviewing for."
      premiumTools={[
        { id: "voice-mock", icon: Mic, title: "Live Mock Interview (Voice)", desc: "Practice out loud with real-time feedback." },
        { id: "recruiter-followups", icon: MessageSquare, title: "Recruiter-style Follow-ups", desc: "Adaptive deep-dive questions based on your answers." },
      ]}
    >
      <InterviewPrep />
    </AssistantToolShell>
  );
}
