import { Sparkles } from "lucide-react";
import { ToneAnalyzer } from "@/pages/Assistant";
import { AssistantPageHeader } from "@/components/assistant/AssistantPageHeader";

export default function ToneAssistant() {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto">
      <AssistantPageHeader
        icon={<Sparkles className="h-5 w-5 text-accent" />}
        title="Corporate Tone"
        subtitle="Match a company's culture. Paste a draft + target company; get a tone score and concrete edits."
      />
      <ToneAnalyzer />
    </div>
  );
}
