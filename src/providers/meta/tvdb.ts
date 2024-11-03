import type { AxiosResponse } from "axios";
import { TVDB_API, TVDB_KEYS, TVDB_URL } from "../../constants";
import lycen from "../../helpers/request";
import type { Artwork, SearchResult } from "../../types";

interface Search {
  objectID: string;
  country?: Country;
  director?: string;
  extended_title?: string;
  genres?: Genre[];
  id: string;
  image_url: string;
  name: string;
  overview?: string;
  primary_language?: PrimaryLanguage;
  primary_type: TVDBType;
  status?: Status;
  type: TVDBType;
  tvdb_id: string;
  year?: string;
  slug?: string;
  overviews?: Overviews;
  translations: Overviews;
  remote_ids?: RemoteID[];
  thumbnail?: string;
  aliases?: string[];
  first_air_time?: Date;
  network?: string;
  studios?: string[];
}

enum Country {
  CZE = "cze",
  JPN = "jpn",
  USA = "usa",
}

enum Genre {
  ACTION = "Action",
  ADVENTURE = "Adventure",
  ANIMATION = "Animation",
  ANIME = "Anime",
  CHILDREN = "Children",
  COMEDY = "Comedy",
  DRAMA = "Drama",
  FAMILY = "Family",
  FANTASY = "Fantasy",
  SPORT = "Sport",
}

interface Overviews {
  eng?: string;
  fra?: string;
  ita?: string;
  jpn?: string;
  pol?: string;
  pt?: string;
  spa?: string;
  por?: string;
  ara?: string;
  cat?: string;
  deu?: string;
  heb?: string;
  kor?: string;
  msa?: string;
  rus?: string;
  srp?: string;
  tur?: string;
  zho?: string;
  hun?: string;
  cha?: string;
  nld?: string;
  tha?: string;
  ces?: string;
}

enum PrimaryLanguage {
  CES = "ces",
  ENG = "eng",
  ITA = "ita",
  JPN = "jpn",
}

enum TVDBType {
  LIST = "list",
  MOVIE = "movie",
  SERIES = "series",
}

interface RemoteID {
  id: string;
  type: number;
  sourceName: SourceName;
}

enum SourceName {
  EIDR = "EIDR",
  FACEBOOK = "Facebook",
  FANSITE = "Fan Site",
  IMDB = "IMDB",
  INSTAGRAM = "Instagram",
  OFFICIAL_WEBSITE = "Official Website",
  TMS_ZAP2It = "TMS (Zap2It)",
  TMDB = "TheMovieDB.com",
  TWITTER = "Twitter",
  YOUTUBE = "Youtube",
}

enum Status {
  CONTINUING = "Continuing",
  ENDED = "Ended",
  RELEASED = "Released",
  UPCOMING = "Upcoming",
}

async function getToken(key: string): Promise<string | undefined> {
  const res = await lycen
    .post<{ data: { token: string } }, { apikey: string }>(
      `${TVDB_API}/login`,
      { apikey: key },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .catch((err) => {
      console.error(err);
      return undefined;
    });
  if (!res) return undefined;
  if (!res.data) return undefined;

  return res.data.data.token;
}

export async function tvdbSearch(query: string, year?: number, format?: string) {
  const results: SearchResult[] = [];

  const token = await getToken(TVDB_KEYS[Math.floor(Math.random() * TVDB_KEYS.length)]);
  if (!token) return results;

  const formattedType =
    format && format === "MOVIE"
      ? "movie"
      : format === "TV" || format === "TV_SHORT" || format === "SPECIAL"
        ? "series"
        : undefined;

  const { data: res } = await lycen.get<{ data: Search[] }>(
    `${TVDB_API}/search?query=${query}${formattedType ? `&type=${formattedType}` : ""}${year ? `&year=${year}` : ""}`,
    {
      headers: {
        Authorization: token,
      },
    },
  );

  const searchData = res.data;

  for (const data of searchData) {
    if (data.primary_type !== TVDBType.SERIES && data.primary_type !== TVDBType.MOVIE) continue;

    results.push({
      id: `/${data.primary_type}/${data.tvdb_id}`,
      tvdb_id: data.tvdb_id,
      title: data.name,
      altTitles: data.aliases ?? [],
      image: data.image_url,
      year: Number(data.year ?? new Date().getFullYear()),
      url: `${TVDB_URL}/${data.primary_type}/${data.tvdb_id}`,
    });
  }

  return results;
}

interface TVDBInfoResponse {
  data: {
    aliases?: { name: string }[];
    firstAired?: string;
    averageRuntime?: number;
    genres?: { name: string }[];
    tags?: { name: string }[];
    artworks: {
      type: number;
      image: string;
      language: string | null;
    }[];
    seasons?: {
      year: string;
      yearEnd: string;
      id: string;
    }[];
    trailers?: { url: string }[];
  };
}

export interface TVDBInfoRes {
  id: number;
  trailer: string | null;
  duration: number | null;
  bannerImage: string | null;
  coverImage: string | undefined;
  synonyms: string[];
  year: number;
  genres: string[];
  tags: string[];
  artworks: Artwork[];
}

export async function getTVDBInfo(id: string): Promise<TVDBInfoRes | undefined> {
  const token = await getToken(TVDB_KEYS[Math.floor(Math.random() * TVDB_KEYS.length)]);
  if (!token) return undefined;

  const { data: res } = await lycen.get<TVDBInfoResponse>(`${TVDB_API}${id}/extended`, {
    headers: {
      Authorization: token,
    },
  });

  const info = res.data;
  const artworkData = info.artworks;

  const artworkIds = {
    banner: [1, 16, 6],
    poster: [2, 7, 14, 27],
    backgrounds: [3, 8, 15],
    icon: [5, 10, 18, 19, 26],
    clearArt: [22, 24],
    clearLogo: [23, 25],
    fanart: [11, 12],
    actorPhoto: [13],
    cinemagraphs: [20, 21],
  };

  const coverImages = artworkData.filter((art) => artworkIds.poster.includes(art.type));
  const banners = artworkData.filter((art) => artworkIds.backgrounds.includes(art.type));

  const artwork = artworkData
    .map((art) => {
      const type = artworkIds.banner.includes(art.type)
        ? "banner"
        : artworkIds.poster.includes(art.type)
          ? "poster"
          : artworkIds.clearLogo.includes(art.type)
            ? "clear_logo"
            : null;
      return type ? { type, image: art.image, provider: "tvdb", lang: art.language } : null;
    })
    .filter((a) => a !== null) as { type: string; image: string; provider: string }[];

  return {
    id: Number(id),
    trailer: info.trailers?.[0]?.url || null,
    duration: info.averageRuntime || null,
    bannerImage: banners[0]?.image || null,
    coverImage: coverImages[0]?.image,
    synonyms: info.aliases?.map((alias) => alias.name) || [],
    year: Number(info.firstAired?.split("-")[0]) || new Date().getFullYear(),
    genres: info.genres?.map((genre) => genre.name) || [],
    tags: info.tags?.map((tag) => tag.name) || [],
    artworks: artwork,
  };
}

export interface TVDBEpisode {
  airDate: string | number | Date;
  id: string;
  description: string;
  title: string;
  image: string;
  number: number;
  seasonNumber: number;
  updatedAt: number;
  [key: string]: unknown;
}

export async function getTVDBEpisode(id: string, year: number, length: number) {
  const token = await getToken(TVDB_KEYS[Math.floor(Math.random() * TVDB_KEYS.length)]);
  if (!token) return undefined;

  const episodes: TVDBEpisode[] = [];

  const { data: res } = await lycen.get<TVDBInfoResponse>(`${TVDB_API}${id}/extended`, {
    headers: {
      Authorization: token,
    },
  });

  const infoSeasons = res.data.seasons;

  const relevantSeasons = infoSeasons;

  const seasonRequests = relevantSeasons
    ?.map((season) =>
      lycen.get<{
        data: {
          year: number;
          episodes: {
            id: string;
            name: string;
            overview: string;
            image: string;
            imageType: number;
            isMovie: number;
            number: number;
            absoluteNumber: number;
            seasonNumber: 1;
            runtime: number;
            aired: number;
            seriesId: number;
            lastUpdated: string;
            finaleType: string;
            year: string;
          }[];
        };
      }>(`${TVDB_API}/seasons/${season.id}/extended`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    )
    .filter(Boolean);

  const seasonResponses = await Promise.all(
    seasonRequests as Promise<
      AxiosResponse<
        {
          data: {
            year: number;
            episodes: {
              id: string;
              name: string;
              overview: string;
              image: string;
              imageType: number;
              isMovie: number;
              number: number;
              absoluteNumber: number;
              seasonNumber: 1;
              runtime: number;
              aired: number;
              seriesId: number;
              lastUpdated: string;
              finaleType: string;
              year: string;
            }[];
          };
        },
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        any
      >
    >[],
  );

  for (const seasonResponse of seasonResponses) {
    if (!seasonResponse) continue;

    const seasonInfo = seasonResponse?.data.data;

    const seasonMatches =
      (Number(seasonInfo?.year) === Number(year) ||
        seasonInfo?.episodes.some((ep) => new Date(ep.aired).getFullYear() === year)) &&
      Math.abs(seasonInfo?.episodes.length - length) <= 1;

    if (!seasonMatches) continue;

    const list = seasonInfo?.episodes;
    if (!list) continue;

    const relevantEpisodes = list.filter(
      (episode) => new Date(episode.aired).getFullYear() === year,
    );

    const translationRequests = relevantEpisodes.map((episode) =>
      lycen
        .get<{
          data: {
            id: string;
            name: string;
            overview: string;
            image: string;
            imageType: number;
            isMovie: number;
            number: number;
            absoluteNumber: number;
            seasonNumber: 1;
            runtime: number;
            aired: number;
            seriesId: number;
            lastUpdated: string;
            finaleType: string;
            year: string;
          }[];
        }>(`${TVDB_API}/episodes/${episode.id}/translations/eng`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .catch(() => ({
          data: async () => ({
            data: {
              name: episode.name,
              overview: episode.overview,
            },
          }),
        })),
    );

    const translationResponses = await Promise.all(translationRequests);

    for (let i = 0; i < relevantEpisodes.length; i++) {
      const episode = relevantEpisodes[i];
      // @ts-expect-error
      const translations = translationResponses[i]?.data.data
      

      episodes.push({
        id: String(episode.id),
        // biome-ignore lint/complexity/useOptionalChain: <explanation>
        description: translations && translations.overview ? translations.overview : "TBD",
        image: episode.image as string,
        number: episode.number,
        // biome-ignore lint/complexity/useOptionalChain: <explanation>
        title: translations && translations.name ? translations.name : "TBD",
        updatedAt: new Date(episode.aired).getTime(),
        seasonNumber: episode.seasonNumber,
        airDate: new Date(episode.aired).toISOString(),
      });
    }
  }

  const uniqueEpisodes = episodes.reduce((acc, current) => {
    const existingEpisode = acc.find(
      (ep) => ep.number === current.number && ep.seasonNumber === current.seasonNumber,
    );

    if (!existingEpisode) {
      acc.push(current);
    } else {
      const existingYearDiff = Math.abs(new Date(existingEpisode.airDate).getFullYear() - year);
      const currentYearDiff = Math.abs(new Date(current.airDate).getFullYear() - year);

      if (currentYearDiff < existingYearDiff) {
        const index = acc.indexOf(existingEpisode);
        acc[index] = current;
      }
    }
    return acc;
  }, [] as TVDBEpisode[]);

  return uniqueEpisodes.sort((a, b) => a.number - b.number);
}
