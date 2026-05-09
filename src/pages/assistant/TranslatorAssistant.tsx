import { Layers, Briefcase } from "lucide-react";
import { SkillTranslator } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";
import { useTranslation } from "react-i18next";

export default function TranslatorAssistant() {
  const { t } = useTranslation();

  return (
    <AssistantToolShell
      title={t("assistant.tabs.translate")}
      subtitle={t("assistant.translate.subtitle")}
      premiumTools={[
        { id: "jd-batch", icon: Layers, title: t("assistant.translate.premium.batch.title"), desc: t("assistant.translate.premium.batch.desc") },
        { id: "industry-packs", icon: Briefcase, title: t("assistant.translate.premium.packs.title"), desc: t("assistant.translate.premium.packs.desc") },
      ]}
    >
      <SkillTranslator />
    </AssistantToolShell>
  );
}
