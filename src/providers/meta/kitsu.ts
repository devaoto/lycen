import { KITSU_API, KITSU_URL } from "../../constants";
import lycen from "../../helpers/request";
import type { Artwork, ITitle, SearchResult } from "../../types";

type KitsuResponse = {
  data: {
    attributes: {
      titles: {
        en: string | null;
        en_jp: string | null;
        ja_jp: string | null;
      };
      description: string | null;
      subtype: string;
      status: string;
      showType: string;
      synopsis: string | null;
      episodeLength: number | null;
      posterImage: {
        original: string | null;
      };
      coverImage: {
        original: string | null;
      };
      averageRating: string | null;
      episodeCount: number | null;
    };
  };
};

type KitsuResult = {
  id: string;
  type: string;
  links: {
    self: string;
  };
  attributes: {
    createdAt: string;
    updatedAt: string;
    slug: string;
    synopsis: string;
    description: string;
    coverImageTopOffset: number;
    titles: {
      en: string;
      en_us: string;
      en_kr: string;
      en_cn: string;
      en_jp: string;
      fr_fr: string;
      ja_jp: string;
      ko_kr: string;
      pt_pt: string;
      ru_ru: string;
      th_th: string;
      zh_cn: string;
    };
    canonicalTitle: string;
    abbreviatedTitles: string[];
    averageRating: string;
    ratingFrequencies: {
      [key: string]: string;
    };
    userCount: number;
    favoritesCount: number;
    startDate: string;
    endDate: string | null;
    nextRelease: string | null;
    popularityRank: number;
    ratingRank: number;
    ageRating: string;
    ageRatingGuide: string | null;
    subtype: string;
    status: string;
    tba: string | null;
    posterImage: {
      tiny: string;
      large: string;
      small: string;
      medium: string;
      original: string;
      meta: {
        dimensions: {
          tiny: {
            width: number;
            height: number;
          };
          large: {
            width: number;
            height: number;
          };
          small: {
            width: number;
            height: number;
          };
          medium: {
            width: number;
            height: number;
          };
        };
      };
    };
    coverImage: {
      tiny: string;
      large: string;
      small: string;
      original: string;
      meta: {
        dimensions: {
          tiny: {
            width: number;
            height: number;
          };
          large: {
            width: number;
            height: number;
          };
          small: {
            width: number;
            height: number;
          };
        };
      };
    };
    chapterCount: number | null;
    volumeCount: number | null;
    serialization: string;
    mangaType: string;
  };
  relationships: {
    genres: {
      links: {
        self: string;
        related: string;
      };
    };
    categories: {
      links: {
        self: string;
        related: string;
      };
    };
    castings: {
      links: {
        self: string;
        related: string;
      };
    };
    installments: {
      links: {
        self: string;
        related: string;
      };
    };
    mappings: {
      links: {
        self: string;
        related: string;
      };
    };
    reviews: {
      links: {
        self: string;
        related: string;
      };
    };
    mediaRelationships: {
      links: {
        self: string;
        related: string;
      };
    };
    characters: {
      links: {
        self: string;
        related: string;
      };
    };
    staff: {
      links: {
        self: string;
        related: string;
      };
    };
    productions: {
      links: {
        self: string;
        related: string;
      };
    };
    quotes: {
      links: {
        self: string;
        related: string;
      };
    };
    chapters: {
      links: {
        self: string;
        related: string;
      };
    };
    mangaCharacters: {
      links: {
        self: string;
        related: string;
      };
    };
    mangaStaff: {
      links: {
        self: string;
        related: string;
      };
    };
  };
};

export const kitsuSearch = async (query: string) => {
  const results: SearchResult[] = [];

  try {
    const res = await lycen.get<{ data: KitsuResult[] }>(
      `${KITSU_API}/anime/?filter[text]=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
        },
      },
    );
    const data = res.data;

    if (data.data.length > 0) {
      for (const result of data.data) {
        const altTitles = Object.values(result.attributes.titles)
          .filter(Boolean)
          .concat(result.attributes.abbreviatedTitles);

        const formatString = result.attributes.subtype.toUpperCase();

        results.push({
          title:
            result.attributes.titles.en_us ||
            result.attributes.titles.en_jp ||
            result.attributes.titles.ja_jp ||
            result.attributes.titles.en ||
            result.attributes.titles.en_kr ||
            result.attributes.titles.ko_kr ||
            result.attributes.titles.en_cn ||
            result.attributes.titles.zh_cn ||
            result.attributes.canonicalTitle ||
            Object.values(result.attributes.titles).filter(Boolean)[0],
          altTitles: altTitles,
          id: `/anime/${result.id}`,
          url: `${KITSU_URL}/anime/${result.id}`,
          image: result.attributes.posterImage?.original ?? null,
          format: formatString,
          released: result.attributes.startDate,
        });
      }
    }
  } catch {}

  try {
    const res = await lycen.get<{ data: KitsuResult[] }>(
      `${KITSU_API}/manga/?filter[text]=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
        },
      },
    );
    const data = res.data;

    if (data.data.length > 0) {
      for (const result of data.data) {
        const altTitles = Object.values(result.attributes.titles)
          .filter(Boolean)
          .concat(result.attributes.abbreviatedTitles);

        const formatString = result.attributes.subtype.toUpperCase();

        results.push({
          title:
            result.attributes.titles.en_us ||
            result.attributes.titles.en_jp ||
            result.attributes.titles.ja_jp ||
            result.attributes.titles.en ||
            result.attributes.titles.en_kr ||
            result.attributes.titles.ko_kr ||
            result.attributes.titles.en_cn ||
            result.attributes.titles.zh_cn ||
            result.attributes.canonicalTitle ||
            Object.values(result.attributes.titles).filter(Boolean)[0],
          altTitles: altTitles,
          id: `/anime/${result.id}`,
          url: `${KITSU_URL}/manga/${result.id}`,
          image: result.attributes.posterImage?.original ?? null,
          format: formatString,
          released: result.attributes.startDate,
        });
      }
    }
  } catch {}

  return results;
};

export interface KitsuInfo {
  id: string;
  title: ITitle;
  genres: string[];
  description: string;
  totalEpisodes: number;
  coverImage: string;
  bannerImage: string;
  rating: number | null;
  duration: number;
  artworks: Artwork[];
}

export const getKitsuInfo = async (id: string) => {
  const res = await lycen.get<KitsuResponse>(`${KITSU_API}${id}`);
  const attributes = res.data.data.attributes;

  if (!attributes) return undefined;

  const genreRes = await lycen.get<{ data: { attributes: { name: string } }[] }>(
    `${KITSU_API}/${id}/genres`,
  );
  const genres = genreRes.data.data;

  const artworks: Artwork[] = [];

  if (attributes.coverImage?.original)
    artworks.push({
      type: "banner",
      image: attributes.coverImage.original,
      provider: "kitsu",
    });
  if (attributes.posterImage?.original)
    artworks.push({
      type: "poster",
      image: attributes.posterImage.original,
      provider: "kitsu",
    });

  return {
    id: id,
    title: {
      english: attributes.titles.en ?? "",
      romaji: attributes.titles.en_jp ?? "",
      native: attributes.titles.ja_jp ?? "",
      userPreferred: attributes.titles.en_jp ?? attributes.titles.en ?? attributes.titles.ja_jp,
    },
    duration: attributes.episodeLength ?? null,
    bannerImage: attributes.coverImage?.original ?? null,
    coverImage: attributes.posterImage?.original ?? null,
    description: attributes.synopsis ?? null,
    totalEpisodes: attributes.episodeCount ?? 0,
    genres: genres ? genres.map((genre) => genre.attributes.name) : [],
    rating: attributes.averageRating
      ? Number.parseFloat((Number.parseFloat(attributes.averageRating) / 10).toFixed(2))
      : null,
    artworks,
  } as KitsuInfo;
};
