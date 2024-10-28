import { findBestMatchedAnime } from "../../helpers/similarity";
import { cleanTitle } from "../../helpers/title";
import { gogoSearch } from "../../providers/anime/gogo";
import { getInfo } from "../../providers/meta/anilist";

export const anilistToGogo = async (id: number) => {
  const info = await getInfo(id);

  const title = {
    english: info?.title.english
      ?.toLowerCase()
      .replaceAll("tower of god season 2", "Kami no Tou: Ouji no Kikan")
      .replaceAll("tower of god", "kami no tou"),
    romaji: info?.title.romaji
      ?.toLowerCase()
      .replaceAll("kami no tou: tower of god - ouji no kikan", "Kami no Tou: Ouji no Kikan")
      .replaceAll("kami no tou: tower of god", "kami no tou"),
    native: info?.title.native
      ?.toLowerCase()
      .replaceAll("神之塔 -tower of god- 王子の帰還", "Kami no Tou: Ouji no Kikan"),
    userPreferred: info?.title.userPreferred
      ?.toLowerCase()
      .replaceAll("kami no tou: tower of god - ouji no kikan", "Kami no Tou: Ouji no Kikan")
      .replaceAll("kami no tou: tower of god", "kami no tou"),
  };

  const result = await gogoSearch(cleanTitle(title.english || title.romaji || title.userPreferred));
  const sub = result.filter((res) => !(res.id as string).includes("-dub"));
  const dub = result.filter((res) => (res.id as string).includes("-dub"));

  const matchedSub = findBestMatchedAnime(title, sub);
  const matchedDub = findBestMatchedAnime(title, dub);

  return {
    sub: matchedSub,
    dub: matchedDub,
  };
};
