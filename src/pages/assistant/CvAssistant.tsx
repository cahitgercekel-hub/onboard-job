import { Target, Infinity as InfinityIcon } from "lucide-react";
import { CvAnalyzer } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";
import { useTranslation } from "react-i18next";

export default function CvAssistant() {
  const { t } = useTranslation();

  return (
    <AssistantToolShell
      title={t("assistant.tabs.cv")}
      subtitle={t("assistant.cv.subtitle")}
      premiumTools={[
        { id: "ats-sim", icon: Target, title: t("assistant.cv.premium.ats.title"), desc: t("assistant.cv.premium.ats.desc") },
        { id: "unlimited-scans", icon: InfinityIcon, title: t("assistant.cv.premium.scans.title"), desc: t("assistant.cv.premium.scans.desc") },
      ]}
    >
      <CvAnalyzer />
    </AssistantToolShell>
  );
}
