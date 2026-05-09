import { Mic, MessageSquare } from "lucide-react";
import { InterviewPrep } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";
import { useTranslation } from "react-i18next";

export default function InterviewAssistant() {
  const { t } = useTranslation();

  return (
    <AssistantToolShell
      title={t("assistant.tabs.interview")}
      subtitle={t("assistant.interview.subtitle")}
      premiumTools={[
        { id: "voice-mock", icon: Mic, title: t("assistant.interview.premium.voice.title"), desc: t("assistant.interview.premium.voice.desc") },
        { id: "recruiter-followups", icon: MessageSquare, title: t("assistant.interview.premium.followups.title"), desc: t("assistant.interview.premium.followups.desc") },
      ]}
    >
      <InterviewPrep />
    </AssistantToolShell>
  );
}
