import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import type { Job } from "@/lib/types";
import { buildFunnelData } from "@/lib/funnelData";
import { useTranslation } from "react-i18next";

interface Props {
  jobs: Job[];
}

// Custom layer that renders each node's label as two stacked lines:
//   value (count) on top, stage name below — outside the node bar.
function NodeLabelsLayer({ nodes }: any) {
  const { t } = useTranslation();
  return (
    <g>
      {nodes.map((node: any) => {
        // Heuristic: nodes on the right half get labels to the right; otherwise left.
        // Nivo passes node.x0/x1; align "start" pushes terminals near their source.
        const padding = 10;
        const isRightSide = node.x1 > node.layout?.width / 2 || node.depth > 0 && node.sourceLinks?.length === 0;
        const x = isRightSide ? node.x1 + padding : node.x0 - padding;
        const anchor = isRightSide ? "start" : "end";
        const y = (node.y0 + node.y1) / 2;
        const value = Math.round(node.value || 0);

        // Map internal node ID (e.g. "saved") to translation key
        const label = t(`tracker.status.${node.id}`, { defaultValue: node.id });

        return (
          <text
            key={node.id}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 500, pointerEvents: "none" }}
          >
            <tspan x={x} dy="-0.5em" style={{ fontSize: 13, fontWeight: 700 }}>{value}</tspan>
            <tspan x={x} dy="1.2em" style={{ fill: "hsl(var(--muted-foreground))", textTransform: "capitalize" }}>{label}</tspan>
          </text>
        );
      })}
    </g>
  );
}

export function FunnelChart({ jobs }: Props) {
  const { t } = useTranslation();
  const data = useMemo(() => buildFunnelData(jobs), [jobs]);

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-12">
        {t("analytics.noScores").includes("funnel") ? t("analytics.noScores") : "Not enough data yet. Move jobs through the pipeline to see your funnel."}
      </div>
    );
  }

  return (
    <div className="w-full h-[320px] md:h-[440px]">
      <ResponsiveSankey
        data={data}
        margin={{ top: 28, right: 130, bottom: 28, left: 110 }}
        align="start"
        sort="auto"
        colors={(node: any) => node.nodeColor || "hsl(var(--muted-foreground))"}
        nodeOpacity={1}
        nodeHoverOpacity={1}
        nodeThickness={18}
        nodeInnerPadding={3}
        nodeSpacing={24}
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
            <div className="font-semibold">{t(`tracker.status.${node.id}`, { defaultValue: node.id })}</div>
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
                {t(`tracker.status.${link.source.id}`, { defaultValue: link.source.id })} → {t(`tracker.status.${link.target.id}`, { defaultValue: link.target.id })}
              </div>
              <div className="text-muted-foreground">
                {t("tracker.jobs", { count: link.value })} · {pct}% conversion
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

