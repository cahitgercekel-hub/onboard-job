import { Building2, Wand2 } from "lucide-react";
import { ToneAnalyzer } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";
import { useTranslation } from "react-i18next";

export default function ToneAssistant() {
  const { t } = useTranslation();

  return (
    <AssistantToolShell
      title={t("assistant.tabs.tone")}
      subtitle={t("assistant.tone.subtitle")}
      premiumTools={[
        { id: "tone-presets", icon: Building2, title: t("assistant.tone.premium.presets.title"), desc: t("assistant.tone.premium.presets.desc") },
        { id: "bulk-rewrite", icon: Wand2, title: t("assistant.tone.premium.rewrite.title"), desc: t("assistant.tone.premium.rewrite.desc") },
      ]}
    >
      <ToneAnalyzer />
    </AssistantToolShell>
  );
}
