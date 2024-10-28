import { MAL_API, MAL_URL } from "../../constants";
import lycen from "../../helpers/request";
import type { SearchResult } from "../../types";
import type { Episode } from "./anidb";

interface Pagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

interface Image {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

interface TrailerImages {
  image_url?: string | null;
  small_image_url?: string | null;
  medium_image_url?: string | null;
  large_image_url?: string | null;
  maximum_image_url?: string | null;
}

interface Trailer {
  youtube_id?: string | null;
  url?: string | null;
  embed_url?: string | null;
  images: TrailerImages;
}

interface Title {
  type: string;
  title: string;
}

interface Aired {
  from: string;
  to?: string | null;
  prop: {
    from: {
      day: number;
      month: number;
      year: number;
    };
    to: {
      day?: number | null;
      month?: number | null;
      year?: number | null;
    };
  };
  string: string;
}

interface Broadcast {
  day?: string | null;
  time?: string | null;
  timezone?: string | null;
  string?: string | null;
}

interface Producer {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

interface Genre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

interface AnimeData {
  mal_id: number;
  url: string;
  images: {
    jpg: Image;
    webp: Image;
  };
  trailer: Trailer;
  approved: boolean;
  titles: Title[];
  title: string;
  title_english?: string | null;
  title_japanese: string;
  title_synonyms: string[];
  type: string;
  source: string;
  episodes: number;
  status: string;
  airing: boolean;
  aired: Aired;
  duration: string;
  rating: string;
  score: number;
  scored_by: number;
  rank: number;
  popularity: number;
  members: number;
  favorites: number;
  synopsis: string;
  background?: string | null;
  season?: string | null;
  year?: number | null;
  broadcast: Broadcast;
  producers: Producer[];
  licensors: Producer[];
  studios: Producer[];
  genres: Genre[];
  explicit_genres: Genre[];
  themes: Genre[];
  demographics: Genre[];
}

interface ApiResponse {
  pagination: Pagination;
  data: AnimeData[];
}

export interface IAnimeData {
  mal_id: number;
  url: string;
  images: AnimeImages;
  trailer: AnimeTrailer;
  approved: boolean;
  titles: AnimeTitle[];
  title: string;
  title_english: string;
  title_japanese: string;
  title_synonyms: string[];
  type: string;
  source: string;
  episodes: number;
  status: string;
  airing: boolean;
  aired: AnimeAired;
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
  broadcast: AnimeBroadcast;
  producers: AnimeProducer[];
  licensors: AnimeProducer[];
  studios: AnimeProducer[];
  genres: AnimeGenre[];
  explicit_genres: AnimeGenre[];
  themes: AnimeGenre[];
  demographics: AnimeGenre[];
  relations: AnimeRelation[];
  theme: AnimeTheme;
  external: AnimeExternal[];
  streaming: unknown[]; // assuming any[] since streaming is empty in the provided data
}

interface AnimeImages {
  jpg: AnimeImageUrl;
  webp: AnimeImageUrl;
}

interface AnimeImageUrl {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

interface AnimeTrailer {
  youtube_id: string;
  url: string;
  embed_url: string;
  images: AnimeTrailerImages;
}

interface AnimeTrailerImages {
  image_url: string;
  small_image_url: string;
  medium_image_url: string;
  large_image_url: string;
  maximum_image_url: string;
}

interface AnimeTitle {
  type: string;
  title: string;
}

interface AnimeAired {
  from: string;
  to: string;
  prop: AnimeAiredProp;
  string: string;
}

interface AnimeAiredProp {
  from: AnimeDate;
  to: AnimeDate;
}

interface AnimeDate {
  day: number;
  month: number;
  year: number;
}

interface AnimeBroadcast {
  day: string;
  time: string;
  timezone: string;
  string: string;
}

interface AnimeProducer {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

interface AnimeGenre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

interface AnimeRelation {
  relation: string;
  entry: AnimeEntry[];
}

interface AnimeEntry {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

interface AnimeTheme {
  openings: string[];
  endings: string[];
}

interface AnimeExternal {
  name: string;
  url: string;
}

interface MalEpisode {
  mal_id: number;
  url: string | null;
  title: string;
  title_japanese: string;
  title_romanji: string;
  aired: string;
  score: number;
  filler: boolean;
  recap: boolean;
  forum_url: string;
}

interface MalEpisodes {
  pagination: Pagination;
  data: MalEpisode[];
}

export const searchAnimeMal = async (query: string) => {
  const res = await lycen.get<ApiResponse>(`${MAL_API}/anime?sfw&q=${encodeURIComponent(query)}`);

  const data = res.data;

  return data.data.map((anime) => ({
    ...anime,
    title: {
      english: anime.title_english,
      romaji: anime.title,
      native: anime.title_japanese,
      userPreferred: anime.title ?? anime.title_english ?? anime.title_japanese,
    },
    image: anime.images.jpg.image_url,
    url: `${MAL_URL}/anime/${anime.mal_id}`,
    id: anime.mal_id.toString(),
  })) as SearchResult[];
};

export const searchMangaMal = async (query: string) => {
  const res = await lycen.get<ApiResponse>(`${MAL_API}/manga?sfw&q=${encodeURIComponent(query)}`);

  const data = res.data;

  return data.data.map((manga) => ({
    ...manga,
    title: {
      english: manga.title_english,
      romaji: manga.title,
      native: manga.title_japanese,
      userPreferred: manga.title ?? manga.title_english ?? manga.title_japanese,
    },
    image: manga.images.jpg.image_url,
    url: `${MAL_URL}/manga/${manga.mal_id}`,
    id: manga.mal_id.toString(),
  })) as SearchResult[];
};

export const searchMal = async (type: "anime" | "manga", query: string) => {
  if (type === "anime") {
    return await searchAnimeMal(query);
  }
  return await searchMangaMal(query);
};

export const getMalAnime = async (id: string) => {
  const res = await lycen.get<IAnimeData>(`${MAL_API}/anime/${id}/full`);

  return res.data;
};

export const getMalManga = async (id: string) => {
  const res = await lycen.get<IAnimeData>(`${MAL_API}/manga/${id}/full`);

  return res.data;
};

export const getMalInfo = async (type: "anime" | "manga", id: string) => {
  if (type === "anime") {
    return await getMalAnime(id);
  }
  return await getMalManga(id);
};

export const getEpisodeListMal = async (id: string) => {
  const fetchPage = async (page: number): Promise<MalEpisodes> => {
    const res = await lycen.get<MalEpisodes>(`${MAL_API}/anime/${id}/episodes?page=${page}`);
    return res.data;
  };

  const initialData = await fetchPage(1);
  const totalPages = initialData.pagination.last_visible_page;

  const pagePromises = [];
  for (let i = 1; i <= totalPages; i++) {
    pagePromises.push(fetchPage(i));
  }

  const pages = await Promise.all(pagePromises);

  const episodes: Episode[] = pages.flatMap((page, pageIndex) =>
    page.data.map((ep, episodeIndex) => ({
      id: ep.mal_id.toString(),
      description: ep.title_romanji,
      isFiller: ep.filler,
      number: pageIndex * page.data.length + episodeIndex + 1,
      rating: ep.score,
      title: ep.title ?? ep.title_romanji ?? ep.title_japanese,
      updatedAt: new Date(ep.aired).getTime(),
    })),
  );

  return episodes as Episode[];
};
