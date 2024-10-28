import stringSimilarity from "fastest-levenshtein";
import type { ITitle, SearchResult } from "../types";
import { sanitizeTitle } from "./title";

function isObject<T>(value: T): value is T & Record<string, T> {
  return typeof value === "object" && value !== null;
}

export type StringMatchType = "strict" | "loose" | "partial";

export interface MatchResult {
  index: number;
  similarity: number;
  bestMatch: SearchResult;
  matchType: StringMatchType;
}

function wordMatchPercentage(titleA: string, titleB: string): number {
  const wordsA = titleA.split(/\s+/);
  const wordsB = titleB.split(/\s+/);
  const totalWords = Math.max(wordsA.length, wordsB.length);

  const matchingWords = wordsA.filter((wordA) => wordsB.includes(wordA)).length;
  return matchingWords / totalWords;
}

function hasExtraWords(titleA: string, titleB: string, maxExtraWords = 2): boolean {
  const wordsA = titleA.split(/\s+/);
  const wordsB = titleB.split(/\s+/);
  return Math.abs(wordsA.length - wordsB.length) > maxExtraWords;
}

function hasMatchingNumbers(titleA: string, titleB: string): boolean {
  const numberPattern = /\d+/g;
  const numbersA = titleA.match(numberPattern) || ([] as unknown as RegExpMatchArray);
  const numbersB = titleB.match(numberPattern) || ([] as unknown as RegExpMatchArray);

  if (numbersA.length === 0 && numbersB.length === 0) return true;
  return numbersA.some((num) => numbersB.includes(num));
}

function hasMatchingSubDub(titleA: string, titleB: string): boolean {
  const subDubPattern = /\b(sub|dub)\b/i;
  const subDubA = titleA.match(subDubPattern);
  const subDubB = titleB.match(subDubPattern);

  // Simplified logical expressions
  if (!(subDubA || subDubB)) return true; // Neither has sub/dub
  if (!(subDubA && subDubB)) return false; // One has it, other doesn't
  return subDubA[0].toLowerCase() === subDubB[0].toLowerCase();
}

export function findBestMatchedAnime(
  title: ITitle | undefined,
  titles: SearchResult[] | undefined,
): MatchResult | null {
  if (!(title && titles) || titles.length === 0) {
    return null;
  }

  const sanitizedTitleOptions = [
    sanitizeTitle(title.romaji ?? ""),
    sanitizeTitle(title.english ?? ""),
    sanitizeTitle(title.native ?? ""),
    sanitizeTitle(title.userPreferred ?? ""),
    ...titles.flatMap(
      (t) => (t.altTitles as string[] | undefined)?.map((t2) => sanitizeTitle(t2)) || [],
    ),
  ].filter(Boolean);

  if (sanitizedTitleOptions.length === 0) {
    return null;
  }

  const sanitizedResults = titles.map((result) => ({
    ...result,
    sanitizedTitle: sanitizeTitle(
      Array.isArray(result.altTitles)
        ? result.altTitles[0]
        : isObject(result.title as ITitle)
          ? (result.title as ITitle).userPreferred
          : (result.title as string),
    ),
  }));

  // Check for exact matches
  for (let i = 0; i < sanitizedResults.length; i++) {
    for (let j = 0; j < sanitizedTitleOptions.length; j++) {
      if (sanitizedResults[i].sanitizedTitle === sanitizedTitleOptions[j]) {
        return {
          index: i,
          similarity: 1,
          bestMatch: sanitizedResults[i],
          matchType: "strict",
        };
      }
    }
  }

  // Check for loose matches
  for (let i = 0; i < sanitizedResults.length; i++) {
    const sanitizedResult = sanitizedResults[i].sanitizedTitle;

    const isLooseMatch = sanitizedTitleOptions.some((sanitizedTitle) => {
      const matchPercentage = wordMatchPercentage(sanitizedResult, sanitizedTitle);

      return (
        matchPercentage >= 0.8 &&
        !hasExtraWords(sanitizedResult, sanitizedTitle) &&
        hasMatchingNumbers(sanitizedResult, sanitizedTitle) &&
        hasMatchingSubDub(sanitizedResult, sanitizedTitle)
      );
    });

    if (isLooseMatch) {
      return {
        index: i,
        similarity: 0.8,
        bestMatch: sanitizedResults[i],
        matchType: "loose",
      };
    }
  }

  // Fuzzy matching as fallback
  let bestMatchIndex = -1;
  let highestSimilarity = 0;
  const similarityThreshold = 0.7;

  for (const [index, result] of sanitizedResults.entries()) {
    let bestSimilarity = 0;

    for (const sanitizedTitle of sanitizedTitleOptions) {
      const distance = stringSimilarity.distance(result.sanitizedTitle, sanitizedTitle);
      const maxLen = Math.max(result.sanitizedTitle.length, sanitizedTitle.length);
      const similarity = 1 - distance / maxLen;

      bestSimilarity = Math.max(bestSimilarity, similarity);
    }

    if (bestSimilarity > highestSimilarity) {
      highestSimilarity = bestSimilarity;
      bestMatchIndex = index;
    }
  }

  if (highestSimilarity < similarityThreshold || bestMatchIndex === -1) {
    return null;
  }

  return {
    index: bestMatchIndex,
    similarity: highestSimilarity,
    bestMatch: sanitizedResults[bestMatchIndex],
    matchType: "partial",
  };
}
