import type { ReactNode } from "react";

export function AssistantPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 md:mb-6">
      <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
        {icon} {title}
      </h1>
      <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
    </div>
  );
}
