// import { write } from "bun";
import type { MatchResult } from "../helpers/similarity";
import {
  type GogoEpisode,
  type GogoInfo,
  getGogoEpisode,
  getGogoInfo,
} from "../providers/anime/gogo";
import { type HiAnimeEpisode, getHiAnimeEpisodes } from "../providers/anime/hianime";
import {
  type Episode,
  type IAnimeInfo,
  fetchEpisodeList,
  getAnidbInfo,
} from "../providers/meta/anidb";
import { type IParsedCharacter, type IParsedMediaInfo, getInfo } from "../providers/meta/anilist";
import { type KitsuInfo, getKitsuInfo } from "../providers/meta/kitsu";
import { type IAnimeData, getEpisodeListMal, getMalAnime } from "../providers/meta/mal";
import { type TMDBInfo, getTMDBEpisode, getTMDBInfo } from "../providers/meta/tmdb";
import {
  type TVDBEpisode,
  type TVDBInfoRes,
  getTVDBEpisode,
  getTVDBInfo,
} from "../providers/meta/tvdb";
import type { Artwork } from "../types";
import { anilistToAniDB } from "./reg/anilist-to-anidb";
import { anilistToGogo } from "./reg/anilist-to-gogo";
import { anilistToHianime } from "./reg/anilist-to-hianime";
import { anilistToKitsu } from "./reg/anilist-to-kitsu";
import { anilistToMalAnime } from "./reg/anilist-to-mal";
import { anilistToTmdb } from "./reg/anilist-to-tmdb";
import { anilistToTVDB } from "./reg/anilist-to-tvdb";

const convertStatus = (status: string) => {
  switch (status.toUpperCase()) {
    case "RELEASING":
      return "Currently Airing";
    case "FINISHED":
      return "Series Completed";
    case "NOT_YET_RELEASED":
    case "NOT_YET_AIRED":
      return "Coming Soon";
    case "CANCELLED":
      return "Discontinued";
    case "HIATUS":
      return "On Break";
    default:
      return "Unknown";
  }
};

export const mergeMappings = (
  tvdbInfo: TVDBInfoRes | undefined,
  anilistInfo: IParsedMediaInfo,
  anidbInfo: IAnimeInfo | undefined,
  gogo: { sub: GogoInfo | undefined; dub: GogoInfo | undefined },
  kitsu: KitsuInfo | undefined,
  mal: IAnimeData | undefined,
  tmdb: TMDBInfo | undefined,
) => {
  const mergeDefinedProps = <T extends object>(...objects: (Record<string, T> | undefined)[]) => {
    const result: Record<string, unknown> = {};
    for (const obj of objects) {
      if (obj) {
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            result[key] = value;
          }
        }
      }
    }
    return result;
  };

  const genres = [
    ...new Set(
      [
        ...anilistInfo.genres,
        ...(gogo.sub?.genres ?? []),
        ...(gogo.dub?.genres ?? []),
        ...(kitsu?.genres ?? []),
        ...(tmdb?.genres ?? []),
        ...(mal?.genres?.map((genre) => genre.name) ?? []),
      ].filter(Boolean),
    ),
  ];

  const tags = [
    ...new Set(
      [...anilistInfo.tags.map((tag) => tag.name), ...(tvdbInfo?.tags ?? [])].filter(Boolean),
    ),
  ];

  const synonyms = [
    ...new Set(
      [
        ...(anilistInfo.synonyms ?? []),
        ...(anidbInfo?.synonyms ?? []),
        ...(gogo.sub?.synonyms ?? []),
        ...(gogo.dub?.synonyms ?? []),
        ...(mal?.titles?.map((title) => title.title) ?? []),
      ].filter(Boolean),
    ),
  ];

  const artworks = [...new Set([...(tvdbInfo?.artworks ?? []), ...(kitsu?.artworks ?? [])])];

  const title = {
    ...(anilistInfo.title ?? {}),
    ...(anilistInfo?.title?.english && { english: anilistInfo.title.english }),
    ...(anilistInfo?.title?.romaji && { romaji: anilistInfo.title.romaji }),
    ...(anilistInfo?.title?.native && { native: anilistInfo.title.native }),
    userPreferred: anilistInfo.title.userPreferred,
  };

  const result = {
    // @ts-expect-error
    ...mergeDefinedProps(anilistInfo, mal, anidbInfo, tvdbInfo, kitsu),
    title,
    season: anilistInfo.season || "",
    status: convertStatus(anilistInfo.status),
    characters: anilistInfo.characters,
    id: anilistInfo.id,
    ...(artworks.length > 0 && { artworks }),
    ...(synonyms.length > 0 && { synonyms }),
    ...(genres.length > 0 && { genres }),
    ...(tags.length > 0 && { tags }),
  } as MappingAnime;

  if (tvdbInfo?.coverImage || kitsu?.coverImage || anilistInfo.coverImage) {
    result.coverImage = tvdbInfo?.coverImage || kitsu?.coverImage || anilistInfo.coverImage;
  }

  const bannerImage =
    tvdbInfo?.bannerImage ||
    kitsu?.bannerImage ||
    tvdbInfo?.artworks?.find((art) => art.type === "banner")?.image;
  if (bannerImage) {
    result.bannerImage = bannerImage;
  }

  return result;
};

export interface MergedEpisode {
  title?: string;
  isFiller?: boolean;
  rating?: number;
  image?: string | null;
  updatedAt?: number;
  season?: number | null;
  number?: number;
  description?: string | null;
  id: string;
}

interface MergedOutput {
  hianime: {
    sub: MergedEpisode[];
    dub: MergedEpisode[];
  };
  gogoanime: {
    sub: MergedEpisode[];
    dub: MergedEpisode[];
  };
}

// 😭🙏
interface M2 {
  sub: MatchResult | null | undefined;
  dub: MatchResult | null | undefined;
}

interface ActualMapping {
  [key: string]: MatchResult | M2 | null | undefined;
}

export const mergeEpisodes = (
  gogoEpisodeSub: GogoEpisode[] | undefined,
  gogoEpisodeDub: GogoEpisode[] | undefined,
  hianimeEpisode: HiAnimeEpisode[] | undefined,
  anidbEpisode: Episode[] | undefined,
  malEpisode: Episode[] | undefined,
  tvdbEpisode: TVDBEpisode[] | undefined,
  tmdbEpisode: TVDBEpisode[] | undefined,
): MergedOutput => {
  const output: MergedOutput = {
    hianime: { sub: [], dub: [] },
    gogoanime: { sub: [], dub: [] },
  };

  const findEpisodeByNumber = <T extends Episode>(episodes: T[] | undefined, number: number) => {
    return episodes?.find((ep) => ep.number === number);
  };

  if (hianimeEpisode?.length) {
    for (const hiEp of hianimeEpisode) {
      const malEp = findEpisodeByNumber(malEpisode, hiEp.number);
      const tvdbEp = findEpisodeByNumber(tvdbEpisode, hiEp.number);
      const anidbEp = findEpisodeByNumber(anidbEpisode, hiEp.number);
      const tmdbEp = findEpisodeByNumber(tmdbEpisode, hiEp.number);

      const mergedEpisode: MergedEpisode = {
        id: hiEp.id,
        number: hiEp.number,
        title: malEp?.title || tvdbEp?.title || tmdbEp?.title || anidbEp?.title || hiEp?.title,
        isFiller: malEp?.isFiller,
        image: tvdbEp?.image ?? tmdbEp?.image ?? malEp?.image ?? anidbEp?.image,
        updatedAt: tvdbEp?.updatedAt,
        description: tvdbEp?.description,
        rating: (tmdbEp?.rating as number) ?? malEp?.rating,
        season: tvdbEp?.seasonNumber,
      };

      output.hianime.sub.push(mergedEpisode);
    }
  }

  if (gogoEpisodeSub?.length) {
    for (const gogoEp of gogoEpisodeSub) {
      const malEp = findEpisodeByNumber(malEpisode, gogoEp.number);
      const tvdbEp = findEpisodeByNumber(tvdbEpisode, gogoEp.number);
      const anidbEp = findEpisodeByNumber(anidbEpisode, gogoEp.number);
      const tmdbEp = findEpisodeByNumber(tmdbEpisode, gogoEp.number);

      const mergedEpisode: MergedEpisode = {
        id: gogoEp.id,
        number: gogoEp.number,
        title: malEp?.title || tvdbEp?.title || tmdbEp?.title || anidbEp?.title,
        isFiller: malEp?.isFiller,
        image: tvdbEp?.image ?? tmdbEp?.image ?? malEp?.image ?? anidbEp?.image,
        updatedAt: tvdbEp?.updatedAt,
        description: tvdbEp?.description,
        rating: (tmdbEp?.rating as number) ?? malEp?.rating,
        season: tvdbEp?.seasonNumber,
      };

      output.gogoanime.sub.push(mergedEpisode);
    }
  }

  if (gogoEpisodeDub?.length) {
    for (const gogoEp of gogoEpisodeDub) {
      const malEp = findEpisodeByNumber(malEpisode, gogoEp.number);
      const tvdbEp = findEpisodeByNumber(tvdbEpisode, gogoEp.number);
      const anidbEp = findEpisodeByNumber(anidbEpisode, gogoEp.number);
      const tmdbEp = findEpisodeByNumber(tmdbEpisode, gogoEp.number);

      const mergedEpisode: MergedEpisode = {
        id: gogoEp.id,
        number: gogoEp.number,
        title: malEp?.title || tvdbEp?.title || tmdbEp?.title || anidbEp?.title,
        isFiller: malEp?.isFiller,
        image: tvdbEp?.image ?? tmdbEp?.image ?? malEp?.image ?? anidbEp?.image,
        updatedAt: tvdbEp?.updatedAt,
        description: tvdbEp?.description,
        rating: (tmdbEp?.rating as number) ?? malEp?.rating,
        season: tvdbEp?.seasonNumber,
      };

      output.gogoanime.dub.push(mergedEpisode);
    }
  }

  return output;
};

interface MappingTitle {
  romaji: string;
  english: string;
  native: string;
  userPreferred: string;
}

export interface MappingEpisode {
  id: string;
  number: number;
  description: string;
  title: string;
  isFiller: boolean;
  image: string | null;
  rating: number;
}

interface MappingEpisodeSource {
  sub: MappingEpisode[];
  dub: MappingEpisode[];
}

interface MappingEpisodes {
  hianime: MappingEpisodeSource;
  gogoanime: MappingEpisodeSource;
}

interface MappingRecommendation {
  title: string;
  id: number;
  coverImage: string;
  description: string;
  episodes: number;
  status: string;
}

interface MappingRelationMedia {
  title: string;
  description: string;
  episodes: number;
  idMal: number;
}

interface MappingRelation {
  characterName: string;
  characterRole: string;
  id: number;
  relatedMedia: MappingRelationMedia;
}

interface MappingImages {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

interface MappingTrailer {
  youtube_id: string;
  url: string;
  embed_url: string;
  images: {
    image_url: string;
    small_image_url: string;
    medium_image_url: string;
    large_image_url: string;
    maximum_image_url: string;
  };
}

interface MappingAiredProp {
  day: number | null;
  month: number | null;
  year: number | null;
}

interface MappingAired {
  from: string;
  to: string | null;
  prop: {
    from: MappingAiredProp;
    to: MappingAiredProp;
  };
  string: string;
}

interface MappingProducer {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

interface MappingStudio extends MappingProducer {}

interface MappingGenre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface MappingAnime {
  title: MappingTitle;
  averageScore: number;
  bannerImage: string;
  countryOfOrigin: string;
  coverImage: string;
  color: string;
  id: number;
  idMal: number;
  format: string;
  genres: string[];
  episodes: number;
  currentEpisodes: number;
  duration: number;
  description: string;
  popularity: number;
  season: string;
  seasonYear: number;
  status: string;
  synonyms: string[];
  tags: string[];
  trending: number;
  trailer: string;
  startDate: string;
  endDate: string;
  studios: string[];
  type: string;
  characters: IParsedCharacter[];
  recommendations: MappingRecommendation[];
  relations: MappingRelation[];
  artworks: Artwork[];
  data: {
    mal_id: number;
    url: string;
    images: {
      jpg: MappingImages;
      webp: MappingImages;
    };
    trailer: MappingTrailer;
    approved: boolean;
    titles: { type: string; title: string }[];
    title: string;
    title_english: string;
    title_japanese: string;
    title_synonyms: string[];
    type: string;
    source: string;
    episodes: number;
    status: string;
    airing: boolean;
    aired: MappingAired;
    duration: string;
    rating: string;
    score: number;
    scored_by: number;
    rank: number;
    popularity: number;
    members: number;
    favorites: number;
    synopsis: string;
    background: string;
    season: string;
    year: number;
    broadcast: {
      day: string;
      time: string;
      timezone: string;
      string: string;
    };
    producers: MappingProducer[];
    licensors: MappingProducer[];
    studios: MappingStudio[];
    genres: MappingGenre[];
    explicit_genres: MappingGenre[];
    themes: MappingGenre[];
    demographics: MappingGenre[];
  };
  streamEpisodes: MappingEpisodes;
  mappings: ActualMapping;
}

// This function is hella slow. If any of you are expert and can help pls send help.
export const generateMappings = async (id: number) => {
  // Helper function to safely execute promises
  const safePromise = async <T>(promise: Promise<T>): Promise<T | undefined> => {
    try {
      return await promise;
    } catch (error) {
      console.error(`Error executing promise: ${(error as Error).message}`);
      return undefined;
    }
  };

  // First batch of parallel requests
  const [
    anilistToAniDBRes,
    anilistToGogoRes,
    anilistToHianimeRes,
    anilistToKitsuRes,
    anilistToMalAnimeRes,
    anilistToTVDBRes,
    anilist,
    anilistToTmdbRes,
  ] = await Promise.all([
    safePromise(anilistToAniDB(id)),
    safePromise(anilistToGogo(id)),
    safePromise(anilistToHianime(id)),
    safePromise(anilistToKitsu(id)),
    safePromise(anilistToMalAnime(id)),
    safePromise(anilistToTVDB(id)),
    safePromise(getInfo(id)),
    safePromise(anilistToTmdb(id)),
  ]);

  // If anilist info couldn't be fetched, we can't proceed since it's the base provider
  if (!anilist) {
    throw new Error("Failed to fetch essential Anilist information");
  }

  const mappings = {
    // Hardcode anilist mapping
    anilist: {
      index: 0,
      similarity: 1,
      bestMatch: {
        title: anilist.title.english || anilist.title.userPreferred,
        altTitles: [
          anilist.title.romaji,
          anilist.title.english,
          anilist.title.native,
          anilist.title.userPreferred,
        ],
        id: String(anilist.id),
        image: anilist.coverImage,
        url: `https://anilist.co/anime/${anilist.id}`,
      },
      matchType: "strict",
    } as MatchResult,
    hianime: anilistToHianimeRes,
    anidb: anilistToAniDBRes,
    gogo: anilistToGogoRes,
    kitsu: anilistToKitsuRes,
    mal: anilistToMalAnimeRes,
    tvdb: anilistToTVDBRes,
    tmdb: anilistToTmdbRes,
  } as ActualMapping;

  const gogoIdSub = (mappings.gogo as M2)?.sub?.bestMatch.id;
  const gogoIdDub = (mappings.gogo as M2)?.dub?.bestMatch.id;
  const anidbId = (mappings.anidb as MatchResult)?.bestMatch?.id;
  const hianimeId = (mappings.hianime as MatchResult)?.bestMatch?.id;
  const kitsuId = (mappings.kitsu as MatchResult)?.bestMatch?.id;
  const malId = (mappings.mal as MatchResult)?.bestMatch?.id;
  const tvdbId = (mappings.tvdb as MatchResult)?.bestMatch?.id;
  const tmdbId = (mappings.tmdb as MatchResult)?.bestMatch?.id;

  // Second batch of parallel requests
  const [gogoInfo, gogoInfoDub, gogoEpisodeSub, gogoEpisodeDub] = await Promise.all([
    safePromise(gogoIdSub ? getGogoInfo(gogoIdSub) : Promise.resolve(undefined)),
    safePromise(gogoIdDub ? getGogoInfo(gogoIdDub) : Promise.resolve(undefined)),
    safePromise(gogoIdSub ? getGogoEpisode(gogoIdSub) : Promise.resolve(undefined)),
    safePromise(gogoIdDub ? getGogoEpisode(gogoIdDub) : Promise.resolve(undefined)),
  ]);

  const [anidbInfo, anidbEpisode] = await Promise.all([
    safePromise(anidbId ? getAnidbInfo(anidbId) : Promise.resolve(undefined)),
    safePromise(anidbId ? fetchEpisodeList(anidbId) : Promise.resolve(undefined)),
  ]);

  const [hianimeEpisode] = await Promise.all([
    safePromise(hianimeId ? getHiAnimeEpisodes(hianimeId) : Promise.resolve(undefined)),
  ]);

  const kitsuInfo = await safePromise(kitsuId ? getKitsuInfo(kitsuId) : Promise.resolve(undefined));

  const [malInfo, malEpisodes] = await Promise.all([
    safePromise(malId ? getMalAnime(malId) : Promise.resolve(undefined)),
    safePromise(malId ? getEpisodeListMal(malId) : Promise.resolve(undefined)),
  ]);

  const [tvdbInfo, tvdbEpisode] = await Promise.all([
    safePromise(tvdbId ? getTVDBInfo(tvdbId) : Promise.resolve(undefined)),
    safePromise(
      tvdbId
        ? getTVDBEpisode(
            tvdbId,
            `${anilist.startDate ? anilist.startDate.split("-")[0] : anilist.seasonYear}${anilist.endDate?.split("-")[0] ? `-${anilist.endDate.split("-")[0]}` : ""}`,
          )
        : Promise.resolve(undefined),
    ),
  ]);

  const [tmdbInfo, tmdbEpisode] = await Promise.all([
    safePromise(tmdbId ? getTMDBInfo(tmdbId) : Promise.resolve(undefined)),
    safePromise(
      tmdbId
        ? getTMDBEpisode(tmdbId, anilist.seasonYear, anilist.episodes)
        : Promise.resolve(undefined),
    ),
  ]);

  return {
    ...mergeMappings(
      tvdbInfo,
      anilist,
      anidbInfo,
      { sub: gogoInfo, dub: gogoInfoDub },
      kitsuInfo,
      malInfo,
      tmdbInfo,
    ),
    mappings,
    streamEpisodes: mergeEpisodes(
      gogoEpisodeSub,
      gogoEpisodeDub,
      hianimeEpisode,
      anidbEpisode,
      malEpisodes,
      tvdbEpisode,
      tmdbEpisode,
    ),
  } as MappingAnime;
};

// await write("index.json", JSON.stringify(await generateMappings(21)));
