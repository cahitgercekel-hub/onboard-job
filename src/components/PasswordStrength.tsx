import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface Props {
  password: string;
  className?: string;
}

interface Rule {
  key: string;
  label: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  { key: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "Uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { key: "num", label: "Number (0-9)", test: (p) => /\d/.test(p) },
  { key: "sym", label: "Symbol (!@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordScore(password: string): number {
  // 0..4 → weak/fair/good/strong
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  const variety = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (variety >= 2) score++;
  if (variety >= 3) score++;
  if (variety >= 4 && password.length >= 12) score = 4;
  return Math.min(4, score);
}

const LEVEL = [
  { label: "Too weak", color: "bg-destructive", text: "text-destructive" },
  { label: "Weak", color: "bg-destructive", text: "text-destructive" },
  { label: "Fair", color: "bg-warning", text: "text-warning" },
  { label: "Good", color: "bg-accent", text: "text-accent" },
  { label: "Strong", color: "bg-success", text: "text-success" },
];

export function PasswordStrength({ password, className }: Props) {
  const score = getPasswordScore(password);
  const level = LEVEL[score];
  const filledBars = Math.max(0, score); // 0..4
  const missing = RULES.filter((r) => !r.test(password));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted transition-colors",
              i < filledBars && level.color
            )}
          />
        ))}
      </div>
      {password && (
        <div className="flex items-center justify-between text-[11px]">
          <span className={cn("font-medium", level.text)}>{level.label}</span>
          <span className="text-muted-foreground">{filledBars}/4</span>
        </div>
      )}
      {password && missing.length > 0 && (
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li key={r.key} className={cn("flex items-center gap-1.5", ok && "text-success")}>
                {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-muted-foreground/60" />}
                {r.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
