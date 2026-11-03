import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GERMAN_CITIES, formatLocations, normalizeCity, parseLocations, searchCities } from "@/lib/german-cities";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

export function LocationCombobox({ id, value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => parseLocations(value), [value]);
  const results = useMemo(() => searchCities(query), [query]);
  const q = query.trim();
  const exact = q && [...GERMAN_CITIES.map((c) => c.name), ...selected].some((n) => normalizeCity(n) === normalizeCity(q));

  const toggle = (name: string) => {
    const has = selected.includes(name);
    onChange(formatLocations(has ? selected.filter((s) => s !== name) : [...selected, name]));
    setQuery(""); // otherwise the next search is appended to the previous one ("munichheilbr")
  };
  const add = (name: string) => {
    if (!selected.includes(name)) onChange(formatLocations([...selected, name]));
    setQuery("");
  };

  return (
    <div className="grid gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
              {selected.length === 0 ? t("ux.job.locationPlaceholder") : t("ux.job.locationCount", { count: selected.length })}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[240px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={query} onValueChange={setQuery} placeholder={t("ux.job.locationSearch")} />
            <CommandList>
              {results.length === 0 && !q && <CommandEmpty>{t("ux.job.locationNone")}</CommandEmpty>}
              {q && !exact && results.length === 0 && (
                <CommandGroup>
                  <CommandItem value={`__add__${q}`} onSelect={() => add(q)}>
                    <Plus className="h-4 w-4" />
                    {t("ux.job.locationAdd", { text: q })}
                  </CommandItem>
                </CommandGroup>
              )}
              {results.length > 0 && (
                <CommandGroup>
                  {results.map((c) => (
                    <CommandItem key={c.name} value={c.name} onSelect={() => toggle(c.name)}>
                      <Check className={cn("h-4 w-4", selected.includes(c.name) ? "opacity-100" : "opacity-0")} />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1 font-normal">
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                aria-label={t("ux.job.locationRemove", { text: s })}
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
