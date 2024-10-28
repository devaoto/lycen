import { performance } from "node:perf_hooks";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { db } from "./db";
import { insertMappingAnime } from "./db/insert";
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
import { generateMappings } from "./mappings/generate";

const app = new Hono();

app.use(cors());
app.use(prettyJSON());

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

app.get("/", (ctx) => ctx.json({ message: "Lycen API is UP! and running." }));

app.get("/info/:id", async (ctx) => {
  const { id } = ctx.req.param();

  if (!id || Number.isNaN(Number(id))) {
    return ctx.json({ message: "Invalid or missing 'id' parameter." });
  }

  const animeId = Number(id);

  if (await animeExists(animeId)) {
    return ctx.json(await getAnime(animeId));
  }

  const startTime = performance.now();

  const anime = await generateMappings(animeId);
  await insertMappingAnime(db, anime);

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  return ctx.json({
    message: "Anime mapped, please re-send the request to get results.",
    processingTime: `${totalTime.toFixed(2)}ms`,
  });
});

app.get("/episodes/:id", async (ctx) => {
  const { id } = ctx.req.param();
  const animeId = Number(id);

  if (!id || Number.isNaN(animeId)) {
    return ctx.json({ message: "Invalid or missing 'id' parameter." }, 400);
  }

  try {
    const episodeData = await db
      .select()
      .from(episodes)
      .where(eq(episodes.animeId, animeId))
      .orderBy(episodes.number);

    const hianime = episodeData.filter((ep) => ep.provider === "hianime");
    const gogo = episodeData.filter((ep) => ep.provider === "gogoanime");
    const hsub = hianime.filter((ep) => ep.type === "sub");
    const hdub = hianime.filter((ep) => ep.type === "dub");
    const gsub = gogo.filter((ep) => ep.type === "sub");
    const gdub = gogo.filter((ep) => ep.type === "dub");

    return ctx.json({
      episodes: [
        {
          data: {
            sub: gsub,
            dub: gdub,
          },
          providerId: "gogoanime",
        },
        {
          data: {
            sub: hsub,
            dub: hdub,
          },
          providerId: "hianime",
        },
      ],
      total: gogo.length ?? hianime.length,
    });
  } catch (error) {
    console.error(`Error fetching episodes for anime ID ${id}:`, error);
    return ctx.json({ message: "Internal server error" }, 500);
  }
});

app.get("/relations/:id", async (ctx) => {
  const { id } = ctx.req.param();
  const animeId = Number(id);

  if (!id || Number.isNaN(animeId)) {
    return ctx.json({ message: "Invalid or missing 'id' parameter." }, 400);
  }

  try {
    const relationData = await db.select().from(relations).where(eq(relations.animeId, animeId));

    return ctx.json({
      data: relationData,
      total: relationData.length,
    });
  } catch (error) {
    console.error(`Error fetching relations for anime ID ${id}:`, error);
    return ctx.json({ message: "Internal server error" }, 500);
  }
});

app.get("/relations/:id", async (ctx) => {
  const { id } = ctx.req.param();
  const animeId = Number(id);

  if (!id || Number.isNaN(animeId)) {
    return ctx.json({ message: "Invalid or missing 'id' parameter." }, 400);
  }

  try {
    const relationData = await db.select().from(relations).where(eq(relations.animeId, animeId));

    return ctx.json({
      data: relationData,
      total: relationData.length,
    });
  } catch (error) {
    console.error(`Error fetching relations for anime ID ${id}:`, error);
    return ctx.json({ message: "Internal server error" }, 500);
  }
});

app.get("/recommendations/:id", async (ctx) => {
  const { id } = ctx.req.param();
  const animeId = Number(id);

  if (!id || Number.isNaN(animeId)) {
    return ctx.json({ message: "Invalid or missing 'id' parameter." }, 400);
  }

  try {
    const recommendationData = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.animeId, animeId));

    return ctx.json({
      data: recommendationData,
      total: recommendationData.length,
    });
  } catch (error) {
    console.error(`Error fetching recommendations for anime ID ${id}:`, error);
    return ctx.json({ message: "Internal server error" }, 500);
  }
});

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT) || 6942,
};
