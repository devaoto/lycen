import { findBestMatchedAnime } from "../../helpers/similarity";
import { cleanTitle } from "../../helpers/title";
import { getInfo } from "../../providers/meta/anilist";
import { kitsuSearch } from "../../providers/meta/kitsu";

export const anilistToKitsu = async (id: number) => {
  const info = await getInfo(id);

  const res = await kitsuSearch(cleanTitle(info.title.userPreferred));

  const matched = findBestMatchedAnime(info.title, res);

  return matched;
};
