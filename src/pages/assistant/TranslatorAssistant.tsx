import { Languages } from "lucide-react";
import { SkillTranslator } from "@/pages/Assistant";
import { AssistantPageHeader } from "@/components/assistant/AssistantPageHeader";

export default function TranslatorAssistant() {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto">
      <AssistantPageHeader
        icon={<Languages className="h-5 w-5 text-accent" />}
        title="Skill Translator"
        subtitle="Turn unconventional experience into corporate-ready resume bullets, tailored to a job description."
      />
      <SkillTranslator />
    </div>
  );
}
