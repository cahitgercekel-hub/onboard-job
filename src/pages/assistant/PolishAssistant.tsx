import { Wand2 } from "lucide-react";
import { PolishTool } from "@/pages/Assistant";
import { AssistantPageHeader } from "@/components/assistant/AssistantPageHeader";

export default function PolishAssistant() {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto">
      <AssistantPageHeader
        icon={<Wand2 className="h-5 w-5 text-accent" />}
        title="Grammar & Polish"
        subtitle="Fix grammar, tighten wording, and adapt tone — in English or German (with optional Geschäftsdeutsch mode)."
      />
      <PolishTool />
    </div>
  );
}
