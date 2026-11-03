/** Predefined location options for the job panel (largest German cities + Remote (EU)). */
export interface CityOption {
  name: string;
  aliases?: string[];
}

export const GERMAN_CITIES: CityOption[] = [
  { name: "Berlin" },
  { name: "Hamburg" },
  { name: "München", aliases: ["Munich"] },
  { name: "Köln", aliases: ["Cologne"] },
  { name: "Frankfurt am Main", aliases: ["Frankfurt"] },
  { name: "Stuttgart" },
  { name: "Düsseldorf" },
  { name: "Leipzig" },
  { name: "Dortmund" },
  { name: "Essen" },
  { name: "Bremen" },
  { name: "Dresden" },
  { name: "Hannover", aliases: ["Hanover"] },
  { name: "Nürnberg", aliases: ["Nuremberg"] },
  { name: "Duisburg" },
  { name: "Bochum" },
  { name: "Wuppertal" },
  { name: "Bielefeld" },
  { name: "Bonn" },
  { name: "Münster" },
  { name: "Mannheim" },
  { name: "Karlsruhe" },
  { name: "Augsburg" },
  { name: "Wiesbaden" },
  { name: "Mönchengladbach" },
  { name: "Gelsenkirchen" },
  { name: "Aachen" },
  { name: "Braunschweig", aliases: ["Brunswick"] },
  { name: "Kiel" },
  { name: "Chemnitz" },
  { name: "Halle (Saale)", aliases: ["Halle"] },
  { name: "Magdeburg" },
  { name: "Freiburg im Breisgau", aliases: ["Freiburg"] },
  { name: "Krefeld" },
  { name: "Mainz" },
  { name: "Lübeck" },
  { name: "Erfurt" },
  { name: "Oberhausen" },
  { name: "Rostock" },
  { name: "Kassel" },
  { name: "Hagen" },
  { name: "Potsdam" },
  { name: "Saarbrücken" },
  { name: "Hamm" },
  { name: "Ludwigshafen am Rhein", aliases: ["Ludwigshafen"] },
  { name: "Oldenburg" },
  { name: "Mülheim an der Ruhr" },
  { name: "Osnabrück" },
  { name: "Leverkusen" },
  { name: "Darmstadt" },
  { name: "Heidelberg" },
  { name: "Solingen" },
  { name: "Herne" },
  { name: "Regensburg" },
  { name: "Neuss" },
  { name: "Paderborn" },
  { name: "Ingolstadt" },
  { name: "Offenbach am Main", aliases: ["Offenbach"] },
  { name: "Fürth" },
  { name: "Würzburg" },
  { name: "Ulm" },
  { name: "Heilbronn" },
  { name: "Pforzheim" },
  { name: "Wolfsburg" },
  { name: "Göttingen" },
  { name: "Bottrop" },
  { name: "Reutlingen" },
  { name: "Erlangen" },
  { name: "Bremerhaven" },
  { name: "Koblenz" },
  { name: "Bergisch Gladbach" },
  { name: "Remscheid" },
  { name: "Trier" },
  { name: "Recklinghausen" },
  { name: "Jena" },
  { name: "Moers" },
  { name: "Salzgitter" },
  { name: "Siegen" },
  { name: "Gütersloh" },
  { name: "Hildesheim" },
  { name: "Cottbus" },
  { name: "Kaiserslautern" },
  { name: "Schwerin" },
  { name: "Walldorf" },
  { name: "Remote (EU)" },
];

/** Lower-case and strip accents/umlauts so "munchen" and "muenchen" match "München". */
export function normalizeCity(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u")
    .trim();
}

export function searchCities(query: string, options: CityOption[] = GERMAN_CITIES): CityOption[] {
  const q = normalizeCity(query);
  if (!q) return options;
  return options.filter((c) => [c.name, ...(c.aliases ?? [])].some((n) => normalizeCity(n).includes(q)));
}

export function parseLocations(value: string | undefined | null): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function formatLocations(values: string[]): string {
  return values.map((v) => v.trim()).filter(Boolean).join(", ");
}
