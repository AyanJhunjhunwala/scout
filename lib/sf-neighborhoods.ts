// Small curated list for autocomplete UI suggestions
const POPULAR_NEIGHBORHOODS = [
  "Mission", "Hayes Valley", "North Beach", "Castro", "Marina",
  "SoMa", "Japantown", "Nob Hill", "Russian Hill", "Pacific Heights",
  "Sunset", "Richmond", "Potrero Hill", "Dogpatch", "Bernal Heights",
  "Noe Valley", "Haight-Ashbury", "Fillmore", "NOPA", "Cow Hollow",
  "Oakland", "Berkeley", "Palo Alto", "San Jose",
];

export function getNeighborhoodSuggestions(query: string): string[] {
  if (!query.trim()) return POPULAR_NEIGHBORHOODS.slice(0, 8);
  const lower = query.toLowerCase();
  return POPULAR_NEIGHBORHOODS.filter((n) =>
    n.toLowerCase().includes(lower)
  ).slice(0, 6);
}
