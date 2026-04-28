import { FileEdit, SlidersHorizontal } from "lucide-react";
import { PolishTool } from "@/pages/Assistant";
import { AssistantToolShell } from "@/components/assistant/AssistantToolShell";

export default function PolishAssistant() {
  return (
    <AssistantToolShell
      title="Grammar & Polish"
      subtitle="Fix grammar, tighten wording, and adapt tone — in English or German (with optional Geschäftsdeutsch mode)."
      premiumTools={[
        { id: "track-changes", icon: FileEdit, title: "Track-changes Export", desc: "Download polished text as DOCX with edit marks." },
        { id: "tone-presets", icon: SlidersHorizontal, title: "Tone Presets", desc: "Switch between formal, friendly, and executive voices." },
      ]}
    >
      <PolishTool />
    </AssistantToolShell>
  );
}
