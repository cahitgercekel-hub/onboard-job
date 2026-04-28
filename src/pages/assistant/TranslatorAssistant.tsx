import { Layers, Briefcase } from "lucide-react";
import { SkillTranslator } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";

export default function TranslatorAssistant() {
  return (
    <AssistantToolShell
      title="Skill Translator"
      subtitle="Turn unconventional experience into corporate-ready resume bullets, tailored to a job description."
      premiumTools={[
        { id: "jd-batch", icon: Layers, title: "JD Batch Translation", desc: "Translate one experience against many JDs at once." },
        { id: "industry-packs", icon: Briefcase, title: "Industry-specific Packs", desc: "Tone packs for finance, tech, consulting & more." },
      ]}
    >
      <SkillTranslator />
    </AssistantToolShell>
  );
}
