import { load } from "cheerio";
import { ANIDB_URL } from "../../constants";
import lycen from "../../helpers/request";
import { cleanTitle } from "../../helpers/title";
import type { SearchResult } from "../../types";

export interface ICharacter {
  name: string;
  image: string;
  voiceActor: {
    name: string;
    image: string;
  };
}

export interface IAnimeInfo {
  id: string;
  year?: number;
  status: "Releasing" | "Finished";
  totalEpisodes: number;
  title: {
    english: string | undefined;
    romaji: string | undefined;
    native: string | undefined;
  };
  synonyms: string[];
  coverImage: string | null;
  characters: ICharacter[];
  season: string | undefined;
  rating: number;
  popularity: number;
  description: string | undefined;
}

export interface Episode {
  id: string;
  description?: string | null;
  hasDub?: boolean;
  image?: string | null;
  isFiller?: boolean;
  number?: number;
  rating?: number;
  title?: string;
  updatedAt?: number;
}

export const anidbSearch = async (query: string) => {
  const res = await lycen.get<string>(
    `${ANIDB_URL}/search/fulltext/?adb.search=${encodeURIComponent(query)}&do.search=1&entity.animetb=1&field.titles=1`,
  );
  const data = res.data;

  const $ = load(data);

  const results: SearchResult[] = [];

  const promises: Promise<void>[] = [];

  $("table.search_results tbody tr").map((_i, el) => {
    promises.push(
      new Promise((resolve) => {
        const id = ($(el).find("td.relid a").attr("href") ?? "").split("/anime/")[1]?.split("?")[0];

        lycen.get<string>(`${ANIDB_URL}/anime/${id}`).then((req) => {
          const $$ = load(req.data);

          const english = $$("div.info div.titles tr.official")
            .first()
            ?.find("td.value label")
            .text();
          const romaji = $$("div.info div.titles tr.romaji td.value span").text();
          const native = $$("div.info div.titles tr.official")
            .last()
            ?.find("td.value label")
            .text();
          const synonyms =
            $$("div.info div.titles tr.syn td.value")
              .text()
              ?.split(", ")
              .map((data) => data.trim())
              .concat($$("div.titles tr.short td.value").text()?.split(", ")) ?? [];
          const year = Number.isNaN(
            new Date(
              $$("div.info tr.year td.value span").first()?.attr("content")?.trim() ?? "",
            ).getFullYear(),
          )
            ? 0
            : new Date(
                $$("div.info tr.year td.value span").first()?.attr("content")?.trim() ?? "",
              ).getFullYear();

          const altTitles = [english, romaji, native, ...synonyms].filter(Boolean);

          results.push({
            id: `/anime/${id}`,
            url: `${ANIDB_URL}/anime/${id}`,
            altTitles,
            title: {
              english: cleanTitle(english),
              romaji: cleanTitle(romaji),
              native: native,
              userPreferred: cleanTitle(romaji || english || native),
            },
            image: $(el).find("td.thumb img").attr("src") ?? "",
            released: year.toString(),
          });

          resolve();
        });
      }),
    );
  });

  await Promise.all(promises);

  return results;
};

export const getAnidbInfo = async (id: string) => {
  const res = await lycen.get<string>(`${ANIDB_URL}${id}`);
  const data = res.data;

  const $ = load(data);

  const characters: ICharacter[] = [];

  $("div#characterlist div.character div.column div.g_bubble").map((_, el) => {
    characters.push({
      image: $(el).find("div.thumb img").attr("src") ?? "",
      name: $(el).find("div.data div.name a.name-colored span").text()?.trim(),
      voiceActor: {
        image: "",
        name: $("div.info div.seiyuu span.name a.primary span").first().text()?.trim(),
      },
    });
  });

  $("div#characterlist div.cast div.column div.g_bubble").map((_, el) => {
    characters.push({
      image: $(el).find("div.thumb img").attr("src") ?? "",
      name: $(el).find("div.data div.name a.name-colored span").text()?.trim(),
      voiceActor: {
        image: "",
        name: $("div.info div.seiyuu span.name a.primary span").first().text()?.trim(),
      },
    });
  });

  return {
    id: id,
    year: Number.isNaN(
      new Date($("div.info tr.year td.value span").first()?.text().trim()).getFullYear(),
    )
      ? undefined
      : new Date($("div.info tr.year td.value span").first()?.text().trim()).getFullYear(),
    status:
      new Date($("div.info tr.year td.value span").last()?.text().trim()) > new Date()
        ? "Releasing"
        : "Finished",
    totalEpisodes: Number($("div.info tr.type td.value span").html()),
    title: {
      english: $("div.info div.titles tr.official").first()?.find("td.value label").text(),
      romaji: $("div.info div.titles tr.romaji td.value span").text(),
      native: $("div.info div.titles tr.official").last()?.find("td.value label").text(),
    },
    synonyms:
      $("div.info div.titles tr.syn td.value")
        .text()
        ?.split(", ")
        .map((data) => data.trim())
        .concat($("div.titles tr.short td.value").text()) ?? [],
    coverImage: $("div.info div.image div.container img").attr("src") ?? null,
    characters,
    season: $("div.info tr.season td.value a")
      .text()
      ?.split(" ")[0]
      .toUpperCase()
      .replace(/"/g, ""),
    rating: Number($("div.info tr.rating td.value a span.value").text() ?? 0),
    popularity: Number($("div.info tr.rating td.value span.count").attr("content") ?? 0),
    description: $("div.desc").text()?.trim(),
  } as IAnimeInfo;
};

export const fetchEpisodeData = async (episode: {
  id: string;
  title: string;
  number: number;
  duration: string;
  airDate: number;
}) => {
  try {
    const response = (await lycen.get<string>(`${ANIDB_URL}${episode.id}`)).data;
    const $ = load(response);

    const description = $("div.desc div.summary").text()?.trim() || null;
    const rating = Number($("div.info tr.rating td.value a span.value").text());

    return {
      id: episode.id,
      description,
      hasDub: false,
      image: null,
      isFiller: false,
      number: episode.number,
      rating,
      title: episode.title,
      updatedAt: Number.isNaN(
        new Date($("div.info tr.date td.value span").text()?.trim() || "").getTime(),
      )
        ? undefined
        : new Date($("div.info tr.date td.value span").text()?.trim() || "").getTime(),
    } as Episode;
  } catch {
    return undefined;
  }
};

export const fetchEpisodeList = async (id: string) => {
  const res = await lycen.get<string>(`${ANIDB_URL}${id}`);
  const data = res.data;

  const $ = load(data);

  const episodeList: {
    id: string;
    title: string;
    number: number;
    duration: string;
    airDate: number;
  }[] = [];

  $("div.episodes table#eplist tr").map((_i, el) => {
    if ($(el).find("td.id a abbr").attr("title") === "Regular Episode") {
      episodeList.push({
        id: $(el).find("td.id a").attr("href") ?? "",
        number: Number($(el).find("td.id").text()),
        title: $(el).find("td.episode label").text()?.trim() ?? "",
        duration: $(el).find("td.duration").text(),
        airDate: new Date($(el).find("td.date").attr("content") ?? "").getTime(),
      });
    }
  });

  const episodePromises = episodeList.map((episode) => fetchEpisodeData(episode));

  const episodes = await Promise.all(episodePromises);

  return episodes.filter((episode) => episode !== undefined) as Episode[];
};
