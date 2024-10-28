import { and, eq } from "drizzle-orm";
import { db } from "./db";
import {
  animeGenres,
  animeStudios,
  animeSynonyms,
  animeTags,
  animes,
  episodes,
  matchResults,
  recommendations,
  relations,
  searchResults,
  titles,
} from "./db/schema";

type AnimeWithRelations = {
  anime: typeof animes.$inferSelect;
  title: typeof titles.$inferSelect;
  episodes: (typeof episodes.$inferSelect)[];
  genres: string[];
  studios: string[];
  recommendations: (typeof recommendations.$inferSelect)[];
  relations: (typeof relations.$inferSelect)[];
  synonyms: string[];
  tags: string[];
  searchResults: {
    result: typeof searchResults.$inferSelect;
    matches: (typeof matchResults.$inferSelect)[];
  }[];
};

export async function getAnime(id: number): Promise<AnimeWithRelations | null> {
  try {
    const animeData = await db
      .select()
      .from(animes)
      .where(eq(animes.id, id))
      .leftJoin(titles, eq(animes.titleId, titles.id))
      .limit(1);

    if (!animeData || animeData.length === 0) {
      return null;
    }

    const [{ animes: anime, titles: title }] = animeData;

    const episodeData = await db
      .select()
      .from(episodes)
      .where(eq(episodes.animeId, id))
      .orderBy(episodes.number);

    const genreData = await db.select().from(animeGenres).where(eq(animeGenres.animeId, id));

    const studioData = await db.select().from(animeStudios).where(eq(animeStudios.animeId, id));

    const recommendationData = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.animeId, id));

    const relationData = await db.select().from(relations).where(eq(relations.animeId, id));

    const synonymData = await db.select().from(animeSynonyms).where(eq(animeSynonyms.animeId, id));

    const tagData = await db.select().from(animeTags).where(eq(animeTags.animeId, id));

    const searchResultData = await db
      .select()
      .from(searchResults)
      .innerJoin(
        matchResults,
        and(eq(matchResults.animeId, id), eq(matchResults.searchResultId, searchResults.id)),
      )
      .orderBy(matchResults.similarity);

    const formattedSearchResults = searchResultData.reduce<{
      [key: string]: {
        result: typeof searchResults.$inferSelect;
        matches: (typeof matchResults.$inferSelect)[];
      };
    }>((acc, { search_results, match_results }) => {
      if (!acc[search_results.id]) {
        acc[search_results.id] = {
          result: search_results,
          matches: [],
        };
      }
      acc[search_results.id].matches.push(match_results);
      return acc;
    }, {});

    const response: AnimeWithRelations = {
      anime,
      // @ts-expect-error
      title,
      episodes: episodeData,
      genres: genreData.map((g) => g.genre),
      studios: studioData.map((s) => s.studio),
      recommendations: recommendationData,
      relations: relationData,
      synonyms: synonymData.map((s) => s.synonym),
      tags: tagData.map((t) => t.tag),
      searchResults: Object.values(formattedSearchResults),
    };

    return response;
  } catch (error) {
    console.error(`Error fetching anime with ID ${id}:`, error);
    throw error;
  }
}

export async function getMultipleAnime(ids: number[]): Promise<AnimeWithRelations[]> {
  const animePromises = ids.map((id) => getAnime(id));
  const results = await Promise.all(animePromises);
  return results.filter((result): result is AnimeWithRelations => result !== null);
}

export async function getAnimeByMalId(malId: number): Promise<AnimeWithRelations | null> {
  const animeData = await db.select().from(animes).where(eq(animes.idMal, malId)).limit(1);

  if (!animeData || animeData.length === 0) {
    return null;
  }

  return getAnime(animeData[0].id);
}

export async function animeExists(id: number): Promise<boolean> {
  const result = await db.select({ id: animes.id }).from(animes).where(eq(animes.id, id)).limit(1);

  return result.length > 0;
}
