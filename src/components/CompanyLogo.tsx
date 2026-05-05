import { useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_CACHE = new Map<string, string>();

const COMPANY_SUFFIXES = /\b(group|holdings?|holding|gmbh|ag|kg|se|inc|incorporated|ltd|limited|llc|plc|co|company|corp|corporation|sa|nv|bv|oy|ab|spa|srl|germany|deutschland|usa|uk|europe|emea|emeia|international|global|labs|technologies|technology|tech|digital|studios?|solutions|services|partners?|ventures?)\b/gi;

function slugifyToDomain(company: string): string | null {
  // Cut at common separators that mark sub-brands or suffixes.
  let base = company.split(/[-–—|/(),]/)[0] || company;
  // Strip company-form suffixes ("Group", "GmbH", ...).
  base = base.replace(COMPANY_SUFFIXES, " ");
  // Take first significant token (>= 2 chars), fall back to whole cleaned string.
  const tokens = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
  if (tokens.length === 0) return null;
  // Single most-distinctive token works best for logo CDNs.
  const slug = tokens[0];
  if (!slug) return null;
  return `${slug}.com`;
}

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

interface CompanyLogoProps {
  company: string;
  url?: string | null;
  size?: number;
  className?: string;
}

export function CompanyLogo({ company, url, size = 28, className }: CompanyLogoProps) {
  const domain = useMemo(() => domainFromUrl(url) || slugifyToDomain(company), [url, company]);
  const sources = useMemo(() => {
    if (!domain) return [] as string[];
    if (LOGO_CACHE.has(domain)) return [LOGO_CACHE.get(domain)!];
    return [
      `https://cdn.brandfetch.io/${domain}/w/80/h/80?c=1idV74_default`,
      `https://img.logo.dev/${domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&size=80`,
      `https://logo.clearbit.com/${domain}`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    ];
  }, [domain]);

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(sources.length === 0);

  const initial = (company || "?").trim().charAt(0).toUpperCase() || "?";
  const hue = hashHue(company || "x");
  const placeholderStyle = {
    width: size,
    height: size,
    background: `hsl(${hue} 70% 92%)`,
    color: `hsl(${hue} 60% 35%)`,
  };

  if (failed) {
    return (
      <div
        className={cn("rounded-md border border-border flex items-center justify-center text-[11px] font-bold shrink-0", className)}
        style={placeholderStyle}
        aria-label={`${company} logo`}
      >
        {initial === "?" ? <Briefcase className="h-3.5 w-3.5 opacity-70" /> : initial}
      </div>
    );
  }

  return (
    <img
      src={sources[idx]}
      alt={`${company} logo`}
      width={size}
      height={size}
      loading="lazy"
      className={cn("rounded-md border border-border bg-white object-contain shrink-0", className)}
      style={{ width: size, height: size }}
      onLoad={() => {
        if (domain) LOGO_CACHE.set(domain, sources[idx]);
      }}
      onError={() => {
        if (idx + 1 < sources.length) setIdx(idx + 1);
        else setFailed(true);
      }}
    />
  );
}
