import { forwardRef } from "react";
import { Sparkles, BriefcaseBusiness } from "lucide-react";

export interface Milestone {
  headline: string;
  subline: string;
  emoji?: string;
}

interface Props {
  milestone: Milestone;
  stats: { total: number; interviewing: number; offers: number };
}

// MilestoneCard uses INLINE PIXEL-BASED font sizes everywhere so that
// html2canvas captures exactly what is laid out on screen, regardless of
// the host page's root font size, container scale, or device pixel ratio.
export const MilestoneCard = forwardRef<HTMLDivElement, Props>(({ milestone, stats }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: 600,
        height: 600,
        overflow: "hidden",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 60%, hsl(var(--primary)) 100%)",
        color: "#ffffff",
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 288,
          height: 288,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -96,
          left: -64,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          filter: "blur(48px)",
        }}
      />

      <div
        style={{
          position: "relative",
          height: "100%",
          padding: 48,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: "rgba(255,255,255,0.15)",
            }}
          >
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>JobFlow</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Track Job & CV Assist</div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.15)",
              marginBottom: 20,
            }}
          >
            <Sparkles size={12} /> Milestone
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {milestone.emoji && <span style={{ marginRight: 8 }}>{milestone.emoji}</span>}
            {milestone.headline}
          </div>
          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              opacity: 0.9,
              lineHeight: 1.35,
              maxWidth: 440,
            }}
          >
            {milestone.subline}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <Stat label="Tracked" value={stats.total} />
          <Stat label="Interviewing" value={stats.interviewing} />
          <Stat label="Offers" value={stats.offers} />
        </div>
      </div>
    </div>
  );
});
MilestoneCard.displayName = "MilestoneCard";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.15)",
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          opacity: 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );
}
