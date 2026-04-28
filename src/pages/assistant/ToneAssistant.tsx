import { Building2, Wand2 } from "lucide-react";
import { ToneAnalyzer } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";

export default function ToneAssistant() {
  return (
    <AssistantToolShell
      title="Corporate Tone"
      subtitle="Match a company's culture. Paste a draft + target company; get a tone score and concrete edits."
      premiumTools={[
        { id: "tone-presets", icon: Building2, title: "Multi-company Tone Presets", desc: "Save tone profiles for every company you target." },
        { id: "bulk-rewrite", icon: Wand2, title: "Bulk Cover-letter Rewrite", desc: "Rewrite multiple cover letters in one pass." },
      ]}
    >
      <ToneAnalyzer />
    </AssistantToolShell>
  );
}
