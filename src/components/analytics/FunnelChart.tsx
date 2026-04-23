import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import type { Job } from "@/lib/types";
import { buildFunnelData } from "@/lib/funnelData";

interface Props {
  jobs: Job[];
}

export function FunnelChart({ jobs }: Props) {
  const data = useMemo(() => buildFunnelData(jobs), [jobs]);

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-12">
        Not enough data yet. Move jobs through the pipeline to see your funnel.
      </div>
    );
  }

  return (
    <div className="w-full h-[320px] md:h-[440px]">
      <ResponsiveSankey
        data={data}
        margin={{ top: 24, right: 130, bottom: 24, left: 110 }}
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
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={14}
        labelTextColor="hsl(var(--foreground))"
        // Custom label: render the value (count) above the stage name
        label={(node: any) => `${Math.round(node.value || 0)}\n${node.id}`}
        animate
        theme={{
          labels: {
            text: {
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: "pre",
            } as any,
          },
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
            <div className="font-semibold">{node.id}</div>
            <div className="text-muted-foreground">{Math.round((node.value as number) || 0)} jobs</div>
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
                {link.source.id} → {link.target.id}
              </div>
              <div className="text-muted-foreground">
                {link.value} job{link.value === 1 ? "" : "s"} · {pct}% conversion
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
