import { TVDB_URL } from "../../constants";
import lycen from "../../helpers/request";
import { findBestMatchedAnime } from "../../helpers/similarity";
import { sanitizeTitle } from "../../helpers/title";
import { getInfo } from "../../providers/meta/anilist";
import { tvdbSearch } from "../../providers/meta/tvdb";

export const anilistToTVDB = async (id: number) => {
  const info = await getInfo(id);

  const res = await tvdbSearch(
    sanitizeTitle(info.title.english || info.title.userPreferred),
    Number(info.startDate?.split("-")[0]),
    info.format,
  );

  const matched = findBestMatchedAnime(info.title, res);

  if (!matched || matched === null) {
    const { data } = await lycen.get<{ thetvdb_id: string; mal_id: string }[]>(
      "https://raw.githubusercontent.com/Fribb/anime-lists/refs/heads/master/anime-list-full.json",
    );

    if (!data) return null;

    const matched2 = data.find((d) => String(d.mal_id) === String(info.idMal));
    if (matched2)
      return {
        index: 0,
        similarity: 1,
        bestMatch: {
          id: `/${info.format === "TV" || info.format === "TV_SHORT" || info.format === "SPECIAL" || info.format === "OVA" || info.format === "ONA" ? "series" : "movie"}/${matched2.thetvdb_id}`,
          title: info.title.native,
          altTitles: [
            info.title.english,
            info.title.romaji,
            info.title.native,
            info.title.userPreferred,
          ],
          image: info.coverImage,
          year: Number(info.startDate?.split("-")[0]),
          url: `${TVDB_URL}/${info.format === "TV" || info.format === "TV_SHORT" || info.format === "SPECIAL" || info.format === "OVA" || info.format === "ONA" ? "series" : "movie"}/${matched2.thetvdb_id}`,
          sanitizedTitle: sanitizeTitle(info.title.userPreferred),
          tvdb_id: matched2.thetvdb_id,
        },
        matchType: "partial",
      };
  }

  return matched;
};

// console.log(await anilistToTVDB(146065))
