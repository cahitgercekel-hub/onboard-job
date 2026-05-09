import { FileEdit, SlidersHorizontal } from "lucide-react";
import { PolishTool } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";
import { useTranslation } from "react-i18next";

export default function PolishAssistant() {
  const { t } = useTranslation();

  return (
    <AssistantToolShell
      title={t("assistant.tabs.polish")}
      subtitle={t("assistant.polish.subtitle")}
      premiumTools={[
        { id: "track-changes", icon: FileEdit, title: t("assistant.polish.premium.export.title"), desc: t("assistant.polish.premium.export.desc") },
        { id: "tone-presets", icon: SlidersHorizontal, title: t("assistant.polish.premium.presets.title"), desc: t("assistant.polish.premium.presets.desc") },
      ]}
    >
      <PolishTool />
    </AssistantToolShell>
  );
}
