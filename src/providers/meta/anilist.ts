import { ANILIST_GRAPHQL } from "../../constants";
import lycen from "../../helpers/request";
import type { ITitle } from "../../types";

const infoQuery = `
  query ($mediaId: Int!) {
    Media(id: $mediaId) {
      title {
        romaji
        english
        native
        userPreferred
      }
      averageScore
      bannerImage
      countryOfOrigin
      coverImage {
        extraLarge
        large
        medium
        color
      }
      id
      idMal
      format
      genres
      episodes
      duration
      description
      popularity
      season
      seasonYear
      status
      synonyms
      tags {
        name
        category
      }
      trending
      trailer {
        id
        site
        thumbnail
      }
      endDate {
        year
        month
        day
      }
      startDate {
        year
        month
        day
      }
      studios(isMain: true) {
        edges {
          node {
            name
            id
          }
        }
      }
      type
      characters {
        edges {
          node {
            age
            gender
            id
            image {
              large
              medium
            }
            name {
              first
              middle
              last
              full
              native
              alternative
              alternativeSpoiler
              userPreferred
            }
          }
          role
          voiceActors {
            id
            image {
              large
              medium
            }
            name {
              first
              middle
              last
              full
              native
              alternative
              userPreferred
            }
            age
            gender
            languageV2
          }
        }
      }
      recommendations {
        edges {
          node {
            mediaRecommendation {
              title {
                romaji
                english
                native
                userPreferred
              }
              id
              coverImage {
                extraLarge
                large
                medium
                color
              }
              description
              bannerImage
              episodes
              idMal
              season
              seasonYear
              status
            }
          }
        }
      }
      relations {
        edges {
          characterName
          characterRole
          dubGroup
          id
          node {
            title {
              romaji
              english
              native
              userPreferred
            }
            id
            coverImage {
              extraLarge
              large
              medium
              color
            }
            description
            bannerImage
            episodes
            idMal
            season
            seasonYear
            status
          }
        }
      }
    }
  }
`;

// Base interfaces for common properties
interface IImage {
  large: string;
  medium: string;
}

interface IDetailedImage extends IImage {
  extraLarge: string;
  color: string;
}

interface IName {
  first: string;
  middle?: string;
  last?: string;
  full: string;
  native: string;
  alternative?: string[];
  userPreferred: string;
}

interface ICharacterName extends IName {
  alternativeSpoiler?: string[];
}

interface IDate {
  year: number;
  month: number;
  day: number;
}

// Main interfaces with proper typing
interface ICharacter {
  age?: number;
  gender?: string;
  id: number;
  image: IImage;
  name: ICharacterName;
}

interface IVoiceActor {
  id: number;
  image: IImage;
  name: IName;
  age?: number;
  gender?: string;
  languageV2?: string;
}

interface IRecommendation {
  title: ITitle;
  id: number;
  coverImage: IDetailedImage;
  description: string;
  bannerImage: string;
  episodes: number;
  idMal: number;
  season: string;
  seasonYear: number;
  status: string;
}

interface IRelation {
  characterName?: string;
  characterRole?: string;
  dubGroup?: string;
  id: number;
  node: {
    title: ITitle;
    id: number;
    coverImage: IDetailedImage;
    description: string;
    bannerImage: string;
    episodes: number;
    idMal: number;
    season: string;
    seasonYear: number;
    status: string;
  };
}

interface IInfo {
  title: ITitle;
  averageScore: number;
  bannerImage: string;
  countryOfOrigin: string;
  coverImage: IDetailedImage;
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
  tags: Array<{ name: string; category: string }>;
  trending: number;
  trailer: {
    id: string;
    site: string;
    thumbnail: string;
  } | null;
  endDate: IDate | null;
  startDate: IDate | null;
  studios: {
    edges: Array<{
      node: {
        name: string;
        id: number;
      };
    }>;
  };
  type: string;
  characters: {
    edges: Array<{
      node: ICharacter;
      role: string;
      voiceActors: IVoiceActor[];
    }>;
  };
  recommendations: {
    edges: Array<{
      node: {
        mediaRecommendation: IRecommendation;
      };
    }>;
  };
  relations: {
    edges: IRelation[];
  };
}

interface IParsedCharacter {
  name: string;
  role: string;
  image: string;
  voiceActors: Array<{
    name: string;
    age?: number;
    gender?: string;
    image: string;
  }>;
}

interface IParsedRecommendation {
  title: string;
  id: number;
  coverImage: string;
  description: string;
  episodes: number;
  status: string;
}

interface IParsedRelation {
  characterName?: string;
  characterRole?: string;
  id: number;
  relatedMedia: {
    title: string;
    description: string;
    episodes: number;
    idMal: number;
  };
}

interface IParsedMediaInfo {
  title: ITitle;
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
  tags: { name: string; category: string }[];
  trending: number;
  trailer: {
    id: string;
    site: string;
    thumbnail: string;
  } | null;
  startDate: string | null;
  endDate: string | null;
  studios: string[];
  type: string;
  characters: IParsedCharacter[];
  recommendations: IParsedRecommendation[];
  relations: IParsedRelation[];
}

const parseMediaInfo = (media: IInfo): IParsedMediaInfo => {
  const formatDate = (date: IDate | null): string | null => {
    if (!date) return null;
    let { year, month, day } = date;
    if (!month) month = 0;
    if (!year) year = new Date().getFullYear();
    if (!day) day = 1;
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  };

  return {
    title: media.title,
    averageScore: media.averageScore,
    bannerImage: media.bannerImage,
    countryOfOrigin: media.countryOfOrigin,
    coverImage: media.coverImage.extraLarge,
    color: media.coverImage.color || "",
    id: media.id,
    idMal: media.idMal,
    format: media.format,
    genres: media.genres,
    episodes: media.episodes,
    duration: media.duration,
    description: media.description,
    popularity: media.popularity,
    season: media.season,
    seasonYear: media.seasonYear,
    status: media.status,
    synonyms: media.synonyms,
    tags: media.tags.map((t) => ({ name: t.name, category: t.category })),
    trending: media.trending,
    trailer: media.trailer,
    startDate: formatDate(media.startDate),
    endDate: formatDate(media.endDate),
    studios: media.studios.edges.map((edge) => edge.node.name),
    type: media.type,
    characters: media.characters.edges.map((edge) => ({
      name: edge.node.name.full,
      role: edge.role,
      image: edge.node.image.large,
      voiceActors: edge.voiceActors.map((va) => ({
        name: va.name.full,
        age: va.age,
        gender: va.gender,
        image: va.image.large,
      })),
    })),
    recommendations:
      (media.recommendations.edges ?? []).map((edge) => ({
        title: edge.node?.mediaRecommendation?.title?.userPreferred || "",
        id: edge.node?.mediaRecommendation?.id || 0,
        coverImage: edge.node?.mediaRecommendation?.coverImage?.large || "",
        description: edge.node?.mediaRecommendation?.description || "",
        episodes: edge.node?.mediaRecommendation?.episodes || 0,
        status: edge.node?.mediaRecommendation?.status || "",
      })) || [],
    relations:
      (media.relations.edges ?? []).map((edge) => ({
        characterName: edge.characterName || "",
        characterRole: edge.characterRole || "",
        id: edge.id,
        relatedMedia: {
          title: edge.node?.title?.userPreferred || "",
          description: edge.node?.description || "",
          episodes: edge.node?.episodes || 0,
          idMal: edge.node?.idMal || 0,
        },
      })) || [],
  };
};

export const getInfo = async (id: number): Promise<IParsedMediaInfo> => {
  try {
    const response = await lycen.post<
      { data: { Media: IInfo } },
      { query: string; variables: { mediaId: number } }
    >(ANILIST_GRAPHQL, {
      query: infoQuery,
      variables: {
        mediaId: id,
      },
    });

    if (!response.data?.data?.Media) {
      throw new Error("Invalid response from AniList API");
    }

    return parseMediaInfo(response.data.data.Media);
  } catch (error) {
    throw new Error(`Failed to fetch media info: ${(error as Error).message}`);
  }
};

export type { IInfo, IParsedMediaInfo };
