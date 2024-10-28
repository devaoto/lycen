import { type CheerioAPI, type SelectorType, load } from "cheerio";
import { HIANIME_URL } from "../../constants";
import lycen from "../../helpers/request";
import { cleanTitle } from "../../helpers/title";
import type { SearchResult } from "../../types";

const HIANIME_AJAX = `${HIANIME_URL}/ajax`;

interface AnimeInfo {
  id: string | null;
  name: string | null;
  description: string | null;
  poster: string | null;
  anilistId: number | null;
  malId: number | null;
  stats: {
    rating: string | null;
    quality: string | null;
    episodes: {
      sub: number | null;
      dub: number | null;
    };
    type: string | null;
    duration: string | null;
  };
  promotionalVideos: {
    title: string | undefined;
    source: string | undefined;
    thumbnail: string | undefined;
  }[];
  charactersVoiceActors: {
    character: {
      id: string;
      poster: string;
      name: string;
      cast: string;
    };
    voiceActor: {
      id: string;
      poster: string;
      name: string;
      cast: string;
    };
  }[];
  moreInfo: {
    [key: string]: string | string[];
  };
}

interface AnimeSeasons {
  id: string | null;
  name: string | null;
  title: string | null;
  poster: string | null;
  isCurrent: boolean;
}

export interface AnimeResult {
  anime: {
    info: AnimeInfo;
    moreInfo: { [key: string]: string | string[] };
  };
  seasons: AnimeSeasons[];
}

export const hianimeSearch = async (query: string) => {
  const response = await lycen.get<string>(
    `${HIANIME_URL}/search?keyword=${encodeURIComponent(query)}`,
  );
  const data = response.data;

  const $ = load(data);

  const results: SearchResult[] = [];

  $(".film_list-wrap .flw-item").each((_i, el) => {
    const $el = $(el);

    const title = $el.find(".film-name").text().trim();
    const romaji = $el.find(".film-name a").attr("data-jname");
    const urlUnparsed = $el.find(".film-name a").attr("href");
    const url = `${HIANIME_URL}${urlUnparsed}`;
    const id = urlUnparsed?.split("?ref=").shift()?.split("/").pop();
    const image = $el.find("img").attr("data-src");

    results.push({
      id: id || "",
      title: {
        english: cleanTitle(title),
        romaji: cleanTitle(romaji || ""),
        userPreferred: cleanTitle(romaji || title || ""),
      },
      url,
      image: image || "",
    });
  });

  return results;
};

export const getHiAnimeInfo = async (id: string): Promise<AnimeResult> => {
  const animeUrl: URL = new URL(id, HIANIME_URL);
  const mainPage = await lycen.get<string>(animeUrl.href);

  const $: CheerioAPI = load(mainPage.data);
  const res: AnimeResult = {
    anime: {
      info: {
        id: null,
        name: null,
        description: null,
        poster: null,
        anilistId: null,
        malId: null,
        stats: {
          rating: null,
          quality: null,
          episodes: { sub: null, dub: null },
          type: null,
          duration: null,
        },
        promotionalVideos: [],
        charactersVoiceActors: [],
        moreInfo: {},
      },
      moreInfo: {},
    },
    seasons: [],
  };

  try {
    res.anime.info.anilistId = Number(
      JSON.parse($("body").find("#syncData").text() || "{}")?.anilist_id,
    );
    res.anime.info.malId = Number(JSON.parse($("body").find("#syncData").text() || "{}")?.mal_id);
  } catch (_err) {
    res.anime.info.anilistId = null;
    res.anime.info.malId = null;
  }

  const selector = "#ani_detail .container .anis-content";

  res.anime.info.id =
    $(selector)?.find(".anisc-detail .film-buttons a.btn-play")?.attr("href")?.split("/")?.pop() ||
    null;
  res.anime.info.name =
    $(selector)?.find(".anisc-detail .film-name.dynamic-name")?.text()?.trim() || null;
  res.anime.info.description =
    $(selector)
      ?.find(".anisc-detail .film-description .text")
      .text()
      ?.split("[")
      ?.shift()
      ?.trim() || null;
  res.anime.info.poster =
    $(selector)?.find(".film-poster .film-poster-img")?.attr("src")?.trim() || null;

  res.anime.info.stats.rating = $(`${selector} .film-stats .tick .tick-pg`)?.text()?.trim() || null;
  res.anime.info.stats.quality =
    $(`${selector} .film-stats .tick .tick-quality`)?.text()?.trim() || null;
  res.anime.info.stats.episodes = {
    sub: Number($(`${selector} .film-stats .tick .tick-sub`)?.text()?.trim()) || null,
    dub: Number($(`${selector} .film-stats .tick .tick-dub`)?.text()?.trim()) || null,
  };
  res.anime.info.stats.type =
    $(`${selector} .film-stats .tick`)
      ?.text()
      ?.trim()
      ?.replace(/[\s\n]+/g, " ")
      ?.split(" ")
      ?.at(-2) || null;
  res.anime.info.stats.duration =
    $(`${selector} .film-stats .tick`)
      ?.text()
      ?.trim()
      ?.replace(/[\s\n]+/g, " ")
      ?.split(" ")
      ?.pop() || null;

  $(".block_area.block_area-promotions .block_area-promotions-list .screen-items .item").each(
    (_, el) => {
      res.anime.info.promotionalVideos.push({
        title: $(el).attr("data-title"),
        source: $(el).attr("data-src"),
        thumbnail: $(el).find("img").attr("src"),
      });
    },
  );

  $(".block_area.block_area-actors .block-actors-content .bac-list-wrap .bac-item").each(
    (_, el) => {
      res.anime.info.charactersVoiceActors.push({
        character: {
          id: $(el).find($(".per-info.ltr .pi-avatar")).attr("href")?.split("/")[2] || "",
          poster: $(el).find($(".per-info.ltr .pi-avatar img")).attr("data-src") || "",
          name: $(el).find($(".per-info.ltr .pi-detail a")).text(),
          cast: $(el).find($(".per-info.ltr .pi-detail .pi-cast")).text(),
        },
        voiceActor: {
          id: $(el).find($(".per-info.rtl .pi-avatar")).attr("href")?.split("/")[2] || "",
          poster: $(el).find($(".per-info.rtl .pi-avatar img")).attr("data-src") || "",
          name: $(el).find($(".per-info.rtl .pi-detail a")).text(),
          cast: $(el).find($(".per-info.rtl .pi-detail .pi-cast")).text(),
        },
      });
    },
  );

  $(`${selector} .anisc-info-wrap .anisc-info .item:not(.w-hide)`).each((_, el) => {
    let key = $(el).find(".item-head").text().toLowerCase().replace(":", "").trim();
    key = key.includes(" ") ? key.replace(" ", "") : key;

    const value = [
      ...$(el)
        .find("*:not(.item-head)")
        .map((_, el) => $(el).text().trim()),
    ]
      .map((i) => `${i}`)
      .toString()
      .trim();

    if (key === "genres") {
      res.anime.moreInfo[key] = value.split(",").map((i) => i.trim());
      return;
    }
    if (key === "producers") {
      res.anime.moreInfo[key] = value.split(",").map((i) => i.trim());
      return;
    }
    res.anime.moreInfo[key] = value;
  });

  const seasonsSelector = "#main-content .os-list a.os-item";
  $(seasonsSelector).each((_, el) => {
    res.seasons.push({
      id: $(el)?.attr("href")?.slice(1)?.trim() || null,
      name: $(el)?.attr("title")?.trim() || null,
      title: $(el)?.find(".title")?.text()?.trim(),
      poster:
        $(el)
          ?.find(".season-poster")
          ?.attr("style")
          ?.split(" ")
          ?.pop()
          ?.split("(")
          ?.pop()
          ?.split(")")[0] || null,
      isCurrent: $(el).hasClass("active"),
    });
  });

  return res;
};

export interface HiAnimeEpisode {
  id: string;
  isFiller: boolean;
  title: string;
  number: number;
}

export const getHiAnimeEpisodes = async (id: string) => {
  const episodesAjax = await lycen.get<{ html: string }>(
    `${HIANIME_AJAX}/v2/episode/list/${id.split("-").pop()}`,
    { headers: { "X-Requested-With": "XMLHttpRequest", Referer: `${HIANIME_URL}/watch/${id}` } },
  );

  const $ = load(episodesAjax.data.html);

  const episodes = $(".detail-infor-content .ss-list a")
    .map((i, el) => ({
      id: $(el)?.attr("href")?.split("/")?.pop() || "",
      title: $(el)?.attr("title")?.trim() || "",
      number: Number($(el).attr("data-number")) || i + 1,
      isFiller: $(el).hasClass("ssl-item-filler"),
    }))
    .get() as HiAnimeEpisode[];

  return episodes;
};
