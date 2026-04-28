import { cn } from "@/lib/utils";

export function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      src="/favicon.ico"
      alt="Jobby logo"
      width={size}
      height={size}
      className={cn("rounded-md shrink-0 object-contain", className)}
    />
  );
}
