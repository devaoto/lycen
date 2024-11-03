import { TVDB_URL } from "../../constants";
import lycen from "../../helpers/request";
import { type MatchResult, findBestMatchedAnime } from "../../helpers/similarity";
import { sanitizeTitle } from "../../helpers/title";
import { getInfo } from "../../providers/meta/anilist";
import { tvdbSearch } from "../../providers/meta/tvdb";

export const anilistToTVDB = async (id: number) => {
  const info = await getInfo(id);

  const tvdb = await tvdbSearch(
    sanitizeTitle(info.title.english || info.title.userPreferred),
    info.seasonYear,
    info.format,
  );

  const bestMatch = findBestMatchedAnime(info.title, tvdb);

  if (bestMatch?.bestMatch.id) {
    return bestMatch;
  }

  const fribb = lycen.get<{ thetvdb_id: string; mal_id: string }[]>(
    "https://raw.githubusercontent.com/Fribb/anime-lists/refs/heads/master/anime-list-full.json",
  );
  const az = lycen.get<{ episodes: Record<string, { tvdbShowId: number }> }>(
    `https://api.ani.zip/mappings?anilist_id=${id}`,
  );

  const [data, anizip] = await Promise.all([fribb, az]);

  if (!data) return null;

  const matched2 = data.data.find((d) => String(d.mal_id) === String(info.idMal));
  if (matched2) {
    const tvdbShowId = anizip.data.episodes?.["1"]?.tvdbShowId ?? matched2.thetvdb_id;

    return tvdbShowId
      ? ({
          index: 0,
          similarity: 1,
          bestMatch: {
            id:
              id === 150672
                ? "/series/421069"
                : `/${info.format === "TV" || info.format === "TV_SHORT" || info.format === "SPECIAL" || info.format === "OVA" || info.format === "ONA" ? "series" : "movies"}/${tvdbShowId}`,
            title: info.title.native,
            altTitles: [
              info.title.english,
              info.title.romaji,
              info.title.native,
              info.title.userPreferred,
            ],
            image: info.coverImage,
            year: Number(info.startDate?.split("-")[0]),
            url: `${TVDB_URL}/${info.format === "TV" || info.format === "TV_SHORT" || info.format === "SPECIAL" || info.format === "OVA" || info.format === "ONA" ? "series" : "movies"}/${tvdbShowId}`,
            sanitizedTitle: sanitizeTitle(info.title.userPreferred),
            tvdb_id: tvdbShowId,
          },
          matchType: "partial",
        } as MatchResult)
      : null;
  }
  return null;
};
