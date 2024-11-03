import { TMDB_API, TMDB_KEY, TMDB_URL } from "../../constants";
import lycen from "../../helpers/request";
import type { SearchResult } from "../../types";
import type { TVDBEpisode } from "./tvdb";

interface TMDBResult {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  title?: string;
  name: string;
  original_language: string;
  original_title?: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  media_type: string;
  genre_ids: number[];
  popularity: number;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  origin_country: string[];
}

export const tmdbSearch = async (query: string) => {
  const results: SearchResult[] = [];

  const { data } = await lycen.get<{ results: TMDBResult[] }>(
    `${TMDB_API}/search/multi?api_key=${TMDB_KEY}&language=en-US&page=1&include_adult=false&query=${encodeURIComponent(query)}`,
  );

  if (!data) return undefined;

  if (data.results.length > 0) {
    for (const result of data.results) {
      if (result.media_type === "tv") {
        results.push({
          id: `/tv/${result.id}`,
          title: result.title || result.name,
          altTitles: [result.original_title || result.original_name, result.title || result.name],
          image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
          url: `${TMDB_URL}/tv/${result.id}`,
          year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
        });
      } else if (result.media_type === "movie") {
        results.push({
          id: `/movie/${result.id}`,
          title: result.title || result.name,
          altTitles: [result.original_title || result.original_name, result.title || result.name],
          image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
          url: `${TMDB_URL}/movie/${result.id}`,
          year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
        });
      }
    }
  }

  return results;
};

//TEST ID: /movie/553301
// Define the types for the TMDB response
interface TMDBInfoResponse {
  id: string;
  name: string;
  title: string;
  original_name: string;
  original_title: string;
  last_episode_to_air?: { episode_number: number };
  episode_run_time: number[];
  backdrop_path?: string;
  poster_path?: string;
  overview: string;
  first_air_date?: string;
  number_of_episodes: number;
  genres?: { id: number; name: string }[];
  vote_average: number;
  popularity: number;
  origin_country: string[];
}

export interface TMDBInfo {
  id: string;
  title: {
    english: string;
    romaji: string | null;
    native: string;
    userPreferred: string;
  };
  currentEpisode?: number;
  duration: number | null;
  bannerImage: string | null;
  coverImage: string | null;
  description: string;
  year: number;
  totalEpisodes: number;
  genres: string[];
  rating: number;
  popularity: number;
  countryOfOrigin: string | null;
}

export const getTMDBInfo = async (id: string): Promise<TMDBInfo | undefined> => {
  try {
    const response = await lycen.get<TMDBInfoResponse>(`${TMDB_API}${id}?api_key=${TMDB_KEY}`);
    const info = response.data;

    if (!info) return undefined;

    return {
      id: id,
      title: {
        english: info.name || info.title,
        romaji: null,
        native: info.original_name,
        userPreferred: info.name || info.original_name || info.original_title,
      },
      currentEpisode: info.last_episode_to_air?.episode_number,
      duration:
        info?.episode_run_time && info.episode_run_time.length > 0
          ? info.episode_run_time[0]
          : null,
      bannerImage: info.backdrop_path
        ? `https://image.tmdb.org/t/p/w500${info.backdrop_path}`
        : null,
      coverImage: info.poster_path ? `https://image.tmdb.org/t/p/w500${info.poster_path}` : null,
      description: info.overview,
      year: info.first_air_date ? new Date(info.first_air_date).getFullYear() : 0,
      totalEpisodes: info.number_of_episodes || 0,
      genres: info.genres?.map((genre) => genre.name) ?? [],
      rating: info.vote_average,
      popularity: info.popularity,
      countryOfOrigin: info.origin_country[0] ?? null,
    };
  } catch (error) {
    console.error("Error fetching TMDB info:", (error as Error).message);
    return undefined;
  }
};

interface TMDBSeason {
  id: number;
  air_date: string | null;
  episode_count: number;
  season_number: number;
}

interface TMDBEpisodeResponse {
  id: number;
  overview: string;
  still_path: string | null;
  episode_number: number;
  name: string;
  air_date: string;
  vote_average: number;
}

export const getTMDBEpisode = async (
  id: string,
  year: number,
  length: number,
): Promise<TVDBEpisode[] | undefined> => {
  try {
    const { data } = await lycen.get<{ seasons: TMDBSeason[] }>(
      `${TMDB_API}${id}?api_key=${TMDB_KEY}`,
    );

    if (!data) return undefined;

    let seasonId = "";
    let seasonNumber = 0;
    const episodes: TVDBEpisode[] = [];

    let closestYearDiff = Number.POSITIVE_INFINITY;
    const seasons = data.seasons;

    for (const season of seasons) {
      if (season.air_date && year) {
        const seasonYear = new Date(season.air_date).getFullYear();
        const yearDiff = Math.abs(seasonYear - year);

        if (yearDiff < closestYearDiff || season.episode_count === length) {
          closestYearDiff = yearDiff;
          seasonId = String(season.id);
          seasonNumber = season.season_number;
        }
      }
    }

    if (!seasonId) return undefined;

    const { data: seasonData } = await lycen.get<{ episodes: TMDBEpisodeResponse[] }>(
      `${TMDB_API}${id}/season/${seasonNumber}?api_key=${TMDB_KEY}`,
    );

    for (const episode of seasonData.episodes) {
      episodes.push({
        id: String(episode.id),
        description: episode.overview,
        image: `https://image.tmdb.org/t/p/w500${episode.still_path}`,
        number: episode.episode_number,
        title: episode.name,
        airDate: episode.air_date,
        seasonNumber: seasonNumber,
        updatedAt: new Date(episode.air_date).getTime(),
        rating: episode.vote_average,
      });
    }

    return episodes;
  } catch (_error) {
    return undefined;
  }
};
