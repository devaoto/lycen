import { findBestMatchedAnime } from "../../helpers/similarity";
import { cleanTitle } from "../../helpers/title";
import { getInfo } from "../../providers/meta/anilist";
import { searchMal } from "../../providers/meta/mal";

export const anilistToMalAnime = async (id: number) => {
  const info = await getInfo(id);

  const res = await searchMal("anime", cleanTitle(info.title.userPreferred));

  const matched = findBestMatchedAnime(info.title, res);

  return matched;
};

export const anilistToMalManga = async (id: number) => {
  const info = await getInfo(id);

  const res = await searchMal("manga", cleanTitle(info.title.userPreferred));

  const matched = findBestMatchedAnime(info.title, res);

  return matched;
};
