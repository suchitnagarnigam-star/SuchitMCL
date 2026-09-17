/**
 * Utility functions for name formatting and honorific prefixes in Suchit Nagar Nigam.
 * Follows Punjab Government / Indian administrative protocol of prefixing personal names with 'Sh.'.
 */

/**
 * Ensures that whenever a person's name is displayed in the system,
 * it is prefixed with "Sh." (e.g. "Sh. Shyam Lal", "Sh. Ranjit Singh", "Sh. Vijay Kumar").
 * Institutional / post titles like "Additional Commissioner" or "Zonal Commissioner A" remain intact.
 */
export function formatPersonName(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";

  // If already prefixed with honorific, return as-is
  if (/^(sh\.|sh\s|shri\s|smt\.|smt\s)/i.test(trimmed)) {
    return trimmed;
  }

  // Designations / non-person titles that should NOT have personal honorifics
  const nonPersonTitles = [
    "additional commissioner",
    "commissioner",
    "zonal commissioner",
    "joint commissioner",
    "superintending engineer",
    "municipal town planner",
    "mcl"
  ];
  if (nonPersonTitles.some(title => trimmed.toLowerCase().startsWith(title))) {
    return trimmed;
  }

  return `Sh. ${trimmed}`;
}

/**
 * Returns 2-letter uppercase initials from a name, stripping any honorific prefixes first
 * so that "Sh. Ranjit Singh" returns "RS" instead of "SR".
 */
export function cleanInitials(name?: string | null): string {
  if (!name) return "";
  const cleaned = name.replace(/^(sh\.|sh\s|shri\s|smt\.|smt\s)/i, "").trim();
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}
