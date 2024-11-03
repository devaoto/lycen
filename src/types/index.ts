export interface ITitle {
  romaji?: string;
  native?: string;
  english?: string;
  userPreferred: string;
}

export interface SearchResult {
  id: string;
  title: string | ITitle;
  url: string;
  image: string;
  released?: string;
  [key: string]: unknown;
}

export interface Artwork {
  image: string;
  provider: string;
  type: string;
  lang?: string | null;
}
