import { getName, getData, getCode } from "country-list";

/**
 * Converts an ISO country code to its full country name.
 * Falls back to the code itself if no name is found.
 */
export function getCountryName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const name = getName(code);
  if (!name) return code;

  // Remove content in parentheses and any trailing ", the" or " (the)"
  return name
    .replace(/\s*\(.*?\)/g, "")
    .replace(/,\s*the$/i, "")
    .trim();
}

/**
 * Gets a list of all countries with their codes and names.
 */
export function getAllCountries() {
  return getData();
}

/**
 * Converts a country name back to its ISO code.
 */
export function getCountryCode(
  name: string | null | undefined,
): string | undefined {
  if (!name) return undefined;
  return getCode(name);
}
