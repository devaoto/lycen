import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { MappingAnime, MappingEpisode } from "../mappings/generate";
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
} from "./schema";

export async function insertMappingAnime(
  db: BunSQLiteDatabase,
  anime: MappingAnime,
): Promise<number> {
  const [titleRow] = await db
    .insert(titles)
    .values({
      romaji: anime.title.romaji,
      native: anime.title.native,
      english: anime.title.english,
      userPreferred: anime.title.userPreferred,
    })
    .returning({ id: titles.id });

  const [animeRow] = await db
    .insert(animes)
    .values({
      id: anime.id,
      idMal: anime.idMal,
      titleId: titleRow.id,
      averageScore: anime.averageScore,
      bannerImage: anime.bannerImage,
      countryOfOrigin: anime.countryOfOrigin,
      coverImage: anime.coverImage,
      color: anime.color,
      format: anime.format,
      duration: anime.duration,
      description: anime.description,
      popularity: anime.popularity,
      season: anime.season,
      seasonYear: anime.seasonYear,
      status: anime.status,
      trending: anime.trending,
      trailer: anime.trailer,
      startDate: anime.startDate,
      endDate: anime.endDate,
      type: anime.type,
    })
    .returning({ id: animes.id });

  const insertEpisodes = async (
    provider: "hianime" | "gogoanime",
    type: "sub" | "dub",
    episodeList: MappingEpisode[],
  ) => {
    if (episodeList?.length) {
      await db.insert(episodes).values(
        episodeList.map((ep) => ({
          id: ep.id,
          description: ep.description,
          animeId: animeRow.id,
          number: ep.number,
          title: ep.title,
          isFiller: ep.isFiller,
          image: ep.image,
          rating: ep.rating,
          provider,
          type,
        })),
      );
    }
  };

  await insertEpisodes("hianime", "sub", anime.streamEpisodes.hianime.sub);
  await insertEpisodes("hianime", "dub", anime.streamEpisodes.hianime.dub);
  await insertEpisodes("gogoanime", "sub", anime.streamEpisodes.gogoanime.sub);
  await insertEpisodes("gogoanime", "dub", anime.streamEpisodes.gogoanime.dub);

  if (anime.genres?.length) {
    await db.insert(animeGenres).values(
      anime.genres.map((genre) => ({
        animeId: animeRow.id,
        genre,
      })),
    );
  }

  if (anime.studios?.length) {
    await db.insert(animeStudios).values(
      anime.studios.map((studio) => ({
        animeId: animeRow.id,
        studio,
      })),
    );
  }

  if (anime.recommendations?.length) {
    await db.insert(recommendations).values(
      anime.recommendations.map((rec) => ({
        animeId: animeRow.id,
        recommendedAnimeId: rec.id,
        title: rec.title,
        coverImage: rec.coverImage,
        description: rec.description,
        episodes: rec.episodes,
        status: rec.status,
      })),
    );
  }

  if (anime.relations?.length) {
    await db.insert(relations).values(
      anime.relations.map((relation) => ({
        animeId: animeRow.id,
        characterName: relation.characterName,
        characterRole: relation.characterRole,
        relatedMediaTitle: relation.relatedMedia.title,
        relatedMediaDescription: relation.relatedMedia.description,
        relatedMediaEpisodes: relation.relatedMedia.episodes,
        relatedMediaIdMal: relation.relatedMedia.idMal,
      })),
    );
  }

  if (anime.synonyms?.length) {
    await db.insert(animeSynonyms).values(
      anime.synonyms.map((synonym) => ({
        animeId: animeRow.id,
        synonym,
      })),
    );
  }

  if (anime.tags?.length) {
    await db.insert(animeTags).values(
      anime.tags.map((tag) => ({
        animeId: animeRow.id,
        tag,
      })),
    );
  }

  if (anime?.mappings?.length) {
    for (const mapping of anime.mappings) {
      const [searchResultRow] = await db
        .insert(searchResults)
        .values({
          id: mapping.bestMatch.id,
          titleId: titleRow.id,
          url: mapping.bestMatch.url,
          image: mapping.bestMatch.image,
          released: mapping.bestMatch.released,
        })
        .returning({ id: searchResults.id });

      await db.insert(matchResults).values({
        animeId: animeRow.id,
        searchResultId: searchResultRow.id,
        index: mapping.index,
        similarity: mapping.similarity,
        matchType: mapping.matchType,
      });
    }
  }

  return animeRow.id;
}

export async function updateMappingAnime(
  db: BunSQLiteDatabase,
  anime: MappingAnime,
): Promise<void> {
  await db.delete(episodes).where(eq(episodes.animeId, anime.id));
  await db.delete(animeGenres).where(eq(animeGenres.animeId, anime.id));
  await db.delete(animeStudios).where(eq(animeStudios.animeId, anime.id));
  await db.delete(recommendations).where(eq(recommendations.animeId, anime.id));
  await db.delete(relations).where(eq(relations.animeId, anime.id));
  await db.delete(animeSynonyms).where(eq(animeSynonyms.animeId, anime.id));
  await db.delete(animeTags).where(eq(animeTags.animeId, anime.id));
  await db.delete(matchResults).where(eq(matchResults.animeId, anime.id));

  const existingAnime = await db.select().from(animes).where(eq(animes.id, anime.id)).get();

  if (!existingAnime) {
    throw new Error(`Anime with ID ${anime.id} not found`);
  }

  await insertMappingAnime(db, anime);
}
