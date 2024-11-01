import lycen from "../helpers/request";
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
import { type IParsedMediaInfo, getInfo } from "../providers/meta/anilist";
import { type KitsuInfo, getKitsuInfo } from "../providers/meta/kitsu";
import { type IAnimeData, getEpisodeListMal, getMalAnime } from "../providers/meta/mal";
import {
  type TVDBEpisode,
  type TVDBInfoRes,
  getTVDBInfo,
} from "../providers/meta/tvdb";
import { anilistToAniDB } from "./reg/anilist-to-anidb";
import { anilistToGogo } from "./reg/anilist-to-gogo";
import { anilistToHianime } from "./reg/anilist-to-hianime";
import { anilistToKitsu } from "./reg/anilist-to-kitsu";
import { anilistToMalAnime } from "./reg/anilist-to-mal";
import { anilistToTVDB } from "./reg/anilist-to-tvdb";

interface Titles {
  "x-jat": string;
  ja: string;
  en: string;
  it: string;
  he: string;
  de: string;
  fr: string;
  es: string;
  ru: string;
  ko: string;
  ar: string;
  "zh-Hans": string;
}

interface EpisodeTitle {
  ja: string;
  en: string;
  fr: string;
  "x-jat": string;
}

interface ITVDBEpisode {
  tvdbShowId: number;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber: number;
  title: EpisodeTitle;
  airDate: string;
  airDateUtc: string;
  runtime: number;
  overview: string;
  image: string;
  episode: string;
  anidbEid: number;
  length: number;
  airdate: string;
  rating: string;
  summary: string;
}

interface TVDBEpisodes {
  [key: string]: ITVDBEpisode;
}

interface Series {
  titles: Titles;
  episodes: TVDBEpisodes;
}


export const mergeMappings = (
  tvdbInfo: TVDBInfoRes | undefined,
  anilistInfo: IParsedMediaInfo,
  anidbInfo: IAnimeInfo | undefined,
  gogo: { sub: GogoInfo | undefined; dub: GogoInfo | undefined },
  kitsu: KitsuInfo | undefined,
  mal: IAnimeData | undefined,
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
    status: anilistInfo.status,
    id: anilistInfo.id,
    ...(artworks.length > 0 && { artworks }),
    ...(synonyms.length > 0 && { synonyms }),
    ...(genres.length > 0 && { genres }),
    ...(tags.length > 0 && { tags }),
  };

  if (tvdbInfo?.coverImage || kitsu?.coverImage || anilistInfo.coverImage) {
    // @ts-expect-error
    result.coverImage = tvdbInfo?.coverImage || kitsu?.coverImage || anilistInfo.coverImage;
  }

  const bannerImage =
    tvdbInfo?.bannerImage ||
    kitsu?.bannerImage ||
    tvdbInfo?.artworks?.find((art) => art.type === "banner")?.image;
  if (bannerImage) {
    // @ts-expect-error
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

export const mergeEpisodes = (
  gogoEpisodeSub: GogoEpisode[] | undefined,
  gogoEpisodeDub: GogoEpisode[] | undefined,
  hianimeEpisode: HiAnimeEpisode[] | undefined,
  anidbEpisode: Episode[] | undefined,
  malEpisode: Episode[] | undefined,
  tvdbEpisode: TVDBEpisode[] | undefined,
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

      const mergedEpisode: MergedEpisode = {
        id: hiEp.id,
        number: hiEp.number,
        title: malEp?.title || hiEp?.title || tvdbEp?.title,
        isFiller: malEp?.isFiller,
        image: tvdbEp?.image ?? malEp?.image ?? anidbEp?.image,
        updatedAt: tvdbEp?.updatedAt,
        description: tvdbEp?.description,
        rating: malEp?.rating,
      };

      output.hianime.sub.push(mergedEpisode);
    }
  }

  if (gogoEpisodeSub?.length) {
    for (const gogoEp of gogoEpisodeSub) {
      const malEp = findEpisodeByNumber(malEpisode, gogoEp.number);
      const tvdbEp = findEpisodeByNumber(tvdbEpisode, gogoEp.number);
      const anidbEp = findEpisodeByNumber(anidbEpisode, gogoEp.number);

      const mergedEpisode: MergedEpisode = {
        id: gogoEp.id,
        number: gogoEp.number,
        title: malEp?.title || tvdbEp?.title,
        isFiller: malEp?.isFiller,
        image: tvdbEp?.image ?? malEp?.image ?? anidbEp?.image,
        updatedAt: tvdbEp?.updatedAt,
        description: tvdbEp?.description,
        rating: malEp?.rating,
      };

      output.gogoanime.sub.push(mergedEpisode);
    }
  }

  if (gogoEpisodeDub?.length) {
    for (const gogoEp of gogoEpisodeDub) {
      const malEp = findEpisodeByNumber(malEpisode, gogoEp.number);
      const tvdbEp = findEpisodeByNumber(tvdbEpisode, gogoEp.number);
      const anidbEp = findEpisodeByNumber(anidbEpisode, gogoEp.number);

      const mergedEpisode: MergedEpisode = {
        id: gogoEp.id,
        number: gogoEp.number,
        title: malEp?.title || tvdbEp?.title,
        isFiller: malEp?.isFiller,
        image: tvdbEp?.image ?? malEp?.image ?? anidbEp?.image,
        updatedAt: tvdbEp?.updatedAt,
        description: tvdbEp?.description,
        rating: malEp?.rating,
      };

      output.gogoanime.dub.push(mergedEpisode);
    }
  }

  return output;
};

const getAnizipEpisodes = async (id: number) => {
  const res = await lycen.get<Series>(`https://api.ani.zip/mappings?anilist_id=${id}`);

  const episodes: TVDBEpisode[] = [];

  for (const episodeKey in res.data.episodes) {
    const episode = res.data.episodes[episodeKey];

    episodes.push({
      id: `${episode.tvdbId}`,
      description: episode.overview ?? episode.summary,
      image: episode.image,
      updatedAt: new Date(episode.airDateUtc).getTime(),
      number: episode.absoluteEpisodeNumber,
      title: episode.title.en || episode.title["x-jat"] || episode.title.ja
    })
  }

  return episodes;
}

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
  characters: string[];
  recommendations: MappingRecommendation[];
  relations: MappingRelation[];
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
  mappings: MatchResult[];
}

// This function is hella slow. If any of you are expert and can help pls send help.
export const generateMappings = async (id: number) => {
  // Helper function to safely execute promises
  const safePromise = async <T>(promise: Promise<T>): Promise<T | undefined> => {
    try {
      return await promise;
    } catch (error) {
      console.error(error);
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
  ] = await Promise.all([
    safePromise(anilistToAniDB(id)),
    safePromise(anilistToGogo(id)),
    safePromise(anilistToHianime(id)),
    safePromise(anilistToKitsu(id)),
    safePromise(anilistToMalAnime(id)),
    safePromise(anilistToTVDB(id)),
    safePromise(getInfo(id)),
  ]);

  // If anilist info couldn't be fetched, we can't proceed
  if (!anilist) {
    throw new Error("Failed to fetch essential Anilist information");
  }

  const mappings = {
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
        id: anilist.id,
        image: anilist.coverImage,
        url: `https://anilist.co/anime/${anilist.id}`,
      },
      matchType: "strict",
    },
    hianime: anilistToHianimeRes,
    anidb: anilistToAniDBRes,
    gogo: anilistToGogoRes,
    kitsu: anilistToKitsuRes,
    mal: anilistToMalAnimeRes,
    tvdb: anilistToTVDBRes,
  };

  const gogoIdSub = mappings.gogo?.sub?.bestMatch.id;
  const gogoIdDub = mappings.gogo?.dub?.bestMatch.id;
  const anidbId = mappings.anidb?.bestMatch?.id;
  const hianimeId = mappings.hianime?.bestMatch?.id;
  const kitsuId = mappings.kitsu?.bestMatch?.id;
  const malId = mappings.mal?.bestMatch?.id;
  const tvdbId = mappings.tvdb?.bestMatch?.id;

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
    safePromise(tvdbId ? getAnizipEpisodes(id): Promise.resolve(undefined)),
  ]);

  return {
    ...mergeMappings(
      tvdbInfo,
      anilist,
      anidbInfo,
      { sub: gogoInfo, dub: gogoInfoDub },
      kitsuInfo,
      malInfo,
    ),
    mappings,
    streamEpisodes: mergeEpisodes(
      gogoEpisodeSub,
      gogoEpisodeDub,
      hianimeEpisode,
      anidbEpisode,
      malEpisodes,
      tvdbEpisode,
    ),
  } as unknown as MappingAnime;
};
