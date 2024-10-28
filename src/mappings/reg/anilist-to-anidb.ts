import { findBestMatchedAnime } from "../../helpers/similarity";
import { cleanTitle } from "../../helpers/title";
import { anidbSearch } from "../../providers/meta/anidb";
import { getInfo } from "../../providers/meta/anilist";

export const anilistToAniDB = async (id: number) => {
  const info = await getInfo(id);

  const res = await anidbSearch(cleanTitle(info.title.userPreferred));

  const matched = findBestMatchedAnime(info.title, res);

  return matched;
};
