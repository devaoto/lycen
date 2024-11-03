import { findBestMatchedAnime } from "../../helpers/similarity";
import { cleanTitle } from "../../helpers/title";
import { getInfo } from "../../providers/meta/anilist";
import { tmdbSearch } from "../../providers/meta/tmdb";

export const anilistToTmdb = async (id: number) => {
  const info = await getInfo(id);

  const res = await tmdbSearch(cleanTitle(info.title.english || info.title.userPreferred));

  const matched = findBestMatchedAnime(info.title, res);

  return matched;
};
