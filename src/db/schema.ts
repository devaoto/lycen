import { sql } from "drizzle-orm";
import { 
  sqliteTable, 
  text, 
  integer, 
  real, 
  primaryKey, 
  blob 
} from "drizzle-orm/sqlite-core";

// Titles table to store different versions of titles
export const titles = sqliteTable('titles', {
  id: integer('id').primaryKey(),
  romaji: text('romaji'),
  native: text('native'),
  english: text('english'),
  userPreferred: text('user_preferred').notNull(),
});

// Main anime table
export const animes = sqliteTable('animes', {
  id: integer('id').primaryKey(),
  idMal: integer('id_mal'),
  titleId: integer('title_id').references(() => titles.id),
  averageScore: real('average_score'),
  bannerImage: text('banner_image'),
  countryOfOrigin: text('country_of_origin'),
  coverImage: text('cover_image'),
  color: text('color'),
  format: text('format'),
  duration: integer('duration'),
  description: text('description'),
  popularity: integer('popularity'),
  season: text('season'),
  seasonYear: integer('season_year'),
  status: text('status'),
  trending: integer('trending'),
  trailer: text('trailer'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  type: text('type'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Episodes table
export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  animeId: integer('anime_id').references(() => animes.id),
  number: integer('number'),
  title: text('title'),
  isFiller: integer('is_filler', { mode: 'boolean' }).default(false),
  image: text('image'),
  rating: real('rating'),
  description: text('description'),
  provider: text('provider').notNull(), // 'hianime' or 'gogoanime'
  type: text('type').notNull(), // 'sub' or 'dub'
  updatedAt: integer('updated_at'),
});

// Genres junction table
export const animeGenres = sqliteTable('anime_genres', {
  animeId: integer('anime_id').references(() => animes.id),
  genre: text('genre').notNull(),
}, (table) => ({
  pk: primaryKey(table.animeId, table.genre),
}));

// Studios junction table
export const animeStudios = sqliteTable('anime_studios', {
  animeId: integer('anime_id').references(() => animes.id),
  studio: text('studio').notNull(),
}, (table) => ({
  pk: primaryKey(table.animeId, table.studio),
}));

// Recommendations table
export const recommendations = sqliteTable('recommendations', {
  id: integer('id').primaryKey(),
  animeId: integer('anime_id').references(() => animes.id),
  recommendedAnimeId: integer('recommended_anime_id'),
  title: text('title').notNull(),
  coverImage: text('cover_image'),
  description: text('description'),
  episodes: integer('episodes'),
  status: text('status'),
});

// Relations table
export const relations = sqliteTable('relations', {
  id: integer('id').primaryKey(),
  animeId: integer('anime_id').references(() => animes.id),
  characterName: text('character_name'),
  characterRole: text('character_role'),
  relatedMediaTitle: text('related_media_title'),
  relatedMediaDescription: text('related_media_description'),
  relatedMediaEpisodes: integer('related_media_episodes'),
  relatedMediaIdMal: integer('related_media_id_mal'),
});

// Synonyms table
export const animeSynonyms = sqliteTable('anime_synonyms', {
  animeId: integer('anime_id').references(() => animes.id),
  synonym: text('synonym').notNull(),
}, (table) => ({
  pk: primaryKey(table.animeId, table.synonym),
}));

// Tags table
export const animeTags = sqliteTable('anime_tags', {
  animeId: integer('anime_id').references(() => animes.id),
  tag: text('tag').notNull(),
}, (table) => ({
  pk: primaryKey(table.animeId, table.tag),
}));

// Search results table
export const searchResults = sqliteTable('search_results', {
  id: text('id').primaryKey(),
  titleId: integer('title_id').references(() => titles.id),
  url: text('url').notNull(),
  image: text('image').notNull(),
  released: text('released'),
});

export const matchResults = sqliteTable('match_results', {
  id: integer('id').primaryKey(),
  animeId: integer('anime_id').references(() => animes.id),
  searchResultId: text('search_result_id').references(() => searchResults.id),
  index: integer('index').notNull(),
  similarity: real('similarity').notNull(),
  matchType: text('match_type', { enum: ['strict', 'loose', 'partial'] }).notNull(),
});