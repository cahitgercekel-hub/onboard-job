import { cn } from "@/lib/utils";

export function Logo({ className, size = 64, src = "/onboard_kanban.png" }: { className?: string; size?: number; src?: string }) {
  return (
    <img
      src={src}
      alt="ONboard logo"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
