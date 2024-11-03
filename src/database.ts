import mongoose, { Schema } from "mongoose";
import type { MappingAnime } from "./mappings/generate";

// Main Anime Schema
const AnimeSchema = new Schema({
  title: Schema.Types.Mixed,
  averageScore: Number,
  bannerImage: String,
  countryOfOrigin: String,
  coverImage: String,
  color: String,
  id: { type: Number, required: true, unique: true, index: true },
  idMal: Number,
  format: String,
  genres: [String],
  episodes: Number,
  duration: Number,
  description: String,
  popularity: Number,
  season: String,
  seasonYear: Number,
  status: String,
  synonyms: [String],
  tags: [String],
  trending: Number,
  trailer: String,
  startDate: String,
  endDate: String,
  studios: [String],
  type: String,
  characters: [Schema.Types.Mixed],
  recommendations: [Schema.Types.Mixed],
  relations: [Schema.Types.Mixed],
  data: Schema.Types.Mixed,
  streamEpisodes: Schema.Types.Mixed,
  mappings: Schema.Types.Mixed,
});

AnimeSchema.index({ idMal: 1 });
AnimeSchema.index({ "title.english": 1 });
AnimeSchema.index({ "title.romaji": 1 });
AnimeSchema.index({ status: 1 });
AnimeSchema.index({ seasonYear: 1, season: 1 });

const Anime = mongoose.model<MappingAnime>("Anime", AnimeSchema);

const getAllAnime = async () => {
  try {
    const animeList = await Anime.find({}, { id: 1 }).lean();
    return animeList.map((anime) => anime.id);
  } catch (error) {
    throw new Error(`Error fetching anime list: ${(error as Error).message}`);
  }
};

const getAnime = async (id: string) => {
  try {
    const anime = await Anime.findOne(
      { id },
      {
        __v: 0,
        _id: 0,
      },
    ).lean();

    if (!anime) {
      return undefined;
    }
    return anime;
  } catch (error) {
    throw new Error(`Error fetching anime: ${(error as Error).message}`);
  }
};

const insertAnime = async (animeData: MappingAnime) => {
  try {
    const newAnime = new Anime(animeData);
    await newAnime.save();
    return newAnime.id;
  } catch (error) {
    throw new Error(`Error inserting anime: ${(error as Error).message}`);
  }
};

const deleteAnime = async (id: string) => {
  try {
    const result = await Anime.deleteOne({ id });
    if (result.deletedCount === 0) {
      throw new Error("Anime not found");
    }
    return true;
  } catch (error) {
    throw new Error(`Error deleting anime: ${(error as Error).message}`);
  }
};

const updateAnime = async <T extends object>(id: string, updateData: T) => {
  try {
    const result = await Anime.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
      fields: { __v: 0, _id: 0 },
    });

    if (!result) {
      throw new Error("Anime not found");
    }
    return result;
  } catch (error) {
    throw new Error(`Error updating anime: ${(error as Error).message}`);
  }
};

const deleteAllAnime = async () => {
  await Anime.deleteMany({});
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("Deleted all anime");
};

export { Anime, getAllAnime, getAnime, insertAnime, deleteAnime, updateAnime, deleteAllAnime };
