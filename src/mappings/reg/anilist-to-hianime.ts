import { findBestMatchedAnime } from "../../helpers/similarity";
import { cleanTitle } from "../../helpers/title";
import { hianimeSearch } from "../../providers/anime/hianime";
import { getInfo } from "../../providers/meta/anilist";

export const anilistToHianime = async (id: number) => {
  const info = await getInfo(id);

  const result = await hianimeSearch(cleanTitle(info.title.userPreferred));
  const matched = findBestMatchedAnime(info.title, result);

  return matched;
};
