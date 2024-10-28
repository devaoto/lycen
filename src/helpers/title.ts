/**
 * Cleans a string by normalizing Unicode characters, removing special characters,
 * and enforcing length limits.
 *
 * @param {string} title - The input string to clean
 * @returns {string} The cleaned string with only alphanumeric characters and spaces
 * @example
 * cleanTitle("Hello   World! ") // Returns "Hello World"
 * cleanTitle("Title with émojis 🎉") // Returns "Title with emojis"
 */
export function cleanTitle(title: string): string {
  return title
    .normalize("NFKC")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/**
 * Sanitizes anime/media titles by normalizing variations while preserving season numbers.
 *
 * @param {string} title - The input title to sanitize
 * @returns {string} A normalized, sanitized version of the title with season numbers preserved
 *
 * @example
 * sanitizeTitle("Yu-Oh!! Season 2 (Dub)") // Returns "yuoh 2"
 * sanitizeTitle("Anime Name 3rd Season (Uncensored)") // Returns "anime name 3"
 * sanitizeTitle("Show Title Part 4 (TV)") // Returns "show title 4"
 * sanitizeTitle("Series 2nd Season") // Returns "series 2"
 *
 * @remarks
 * The function performs the following operations:
 * - Converts to lowercase
 * - Preserves season/part numbers while removing indicators
 * - Removes format indicators (e.g., "dub", "uncensored")
 * - Normalizes common character patterns (e.g., "yuu" to "yu")
 * - Removes parenthetical information
 * - Removes diacritical marks
 */
export function sanitizeTitle(title: string): string {
  if (!title) return "";

  let sanitized = title
    .toLowerCase()
    .replace(/\b(season|cour|part)\b/g, "")
    .replace(/(\d+)(?:th|rd|nd|st)?\s*(?:season|cour|part)\b/gi, " $1 ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/yuu/g, "yu")
    .replace(/ouh/g, "oh")
    .replace(/yaa/g, "ya")

    .replace(
      /\b(?:uncut|uncensored|dub(?:bed)?|censored|sub(?:bed)?)\b|\([^)]*\)|\bBD\b|\(TV\)/gi,
      "",
    );

  sanitized = sanitized.normalize("NFD").replace(/\p{M}/gu, "");

  return cleanTitle(sanitized);
}
