import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import type { Job } from "@/lib/types";
import { buildFunnelData, FUNNEL_NOT_APPLIED, FUNNEL_TRACKED } from "@/lib/funnelData";
import { useTranslation } from "react-i18next";

interface Props {
  jobs: Job[];
}

function useNodeLabel() {
  const { t } = useTranslation();
  return (id: string) =>
    id === FUNNEL_TRACKED ? t("ux.analytics.funnelTracked")
      : id === FUNNEL_NOT_APPLIED ? t("ux.analytics.funnelNotApplied")
      : t(`tracker.status.${id}`, { defaultValue: id });
}

// Labels sit outside the bands: the root to its left, end nodes to their right, and
// middle nodes just above their bar (with a halo so links never reduce contrast).
function NodeLabelsLayer({ nodes }: { nodes: ReadonlyArray<{ id: string; x0: number; x1: number; y0: number; y1: number; value?: number; sourceLinks?: unknown[]; targetLinks?: unknown[] }> }) {
  const labelFor = useNodeLabel();
  return (
    <g>
      {nodes.map((node) => {
        const value = Math.round(node.value || 0);
        const text = `${value} ${labelFor(node.id)}`;
        const isRoot = (node.targetLinks?.length ?? 0) === 0;
        const isLeaf = (node.sourceLinks?.length ?? 0) === 0;
        const midY = (node.y0 + node.y1) / 2;
        const x = isRoot ? node.x0 - 8 : isLeaf ? node.x1 + 8 : (node.x0 + node.x1) / 2;
        const y = isRoot || isLeaf ? midY : node.y0 - 8;
        const anchor = isRoot ? "end" : isLeaf ? "start" : "middle";
        return (
          <text
            key={node.id}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline={isRoot || isLeaf ? "middle" : "auto"}
            style={{
              fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600, pointerEvents: "none",
              paintOrder: "stroke", stroke: "hsl(var(--card))", strokeWidth: 4, strokeLinejoin: "round",
            }}
          >
            {text}
          </text>
        );
      })}
    </g>
  );
}

export function FunnelChart({ jobs }: Props) {
  const { t } = useTranslation();
  const labelFor = useNodeLabel();
  const data = useMemo(() => buildFunnelData(jobs), [jobs]);

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-12">
        {t("analytics.noScores").includes("funnel") ? t("analytics.noScores") : "Not enough data yet. Move jobs through the pipeline to see your funnel."}
      </div>
    );
  }

  return (
    <>
    <div className="w-full h-[320px] md:h-[440px]">
      <ResponsiveSankey
        data={data}
        margin={{ top: 32, right: 150, bottom: 24, left: 120 }}
        align="start"
        sort="auto"
        colors={(node: any) => node.nodeColor || "hsl(var(--muted-foreground))"}
        nodeOpacity={1}
        nodeHoverOpacity={1}
        nodeThickness={18}
        nodeInnerPadding={3}
        nodeSpacing={36}
        nodeBorderWidth={0}
        nodeBorderRadius={4}
        linkOpacity={0.55}
        linkHoverOpacity={0.9}
        linkContract={3}
        enableLinkGradient={true}
        linkBlendMode="normal"
        // We render labels via a custom layer so we can stack value over name.
        enableLabels={false}
        layers={["links", "nodes", NodeLabelsLayer as any]}
        animate
        theme={{
          tooltip: {
            container: {
              background: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
            },
          },
        }}
        nodeTooltip={({ node }: any) => (
          <div className="px-2 py-1">
            <div className="font-semibold">{labelFor(node.id)}</div>
            <div className="text-muted-foreground">
              {t("tracker.jobs", { count: Math.round((node.value as number) || 0) })}
            </div>
          </div>
        )}
        linkTooltip={({ link }: any) => {
          const sourceTotal = (link.source.sourceLinks || []).reduce(
            (a: number, l: any) => a + l.value,
            0,
          );
          const pct = sourceTotal > 0 ? Math.round((link.value / sourceTotal) * 100) : 0;
          return (
            <div className="px-2 py-1">
              <div className="font-semibold">
                {labelFor(link.source.id)} → {labelFor(link.target.id)}
              </div>
              <div className="text-muted-foreground">
                {t("tracker.jobs", { count: link.value })} · {pct}% conversion
              </div>
            </div>
          );
        }}
      />
    </div>
    <p className="mt-2 text-[11px] text-muted-foreground">{t("ux.analytics.funnelNote")}</p>
    </>
  );
}

