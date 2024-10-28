import { load } from "cheerio";
import { GOGO_AJAX_URL, GOGO_URL } from "../../constants";
import lycen from "../../helpers/request";
import { cleanTitle } from "../../helpers/title";
import type { SearchResult } from "../../types";

export interface GogoInfo {
  id: string;
  coverImage: string;
  title: string;
  season: string;
  year: number;
  type: string;
  description: string;
  genres: string[];
  released: string;
  synonyms: string[];
  status: string;
}

// Helper functions
const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const isNotEmpty = (value: any): boolean =>
  typeof value === "string"
    ? value.trim() !== ""
    : Array.isArray(value)
      ? value.length > 0
      : typeof value === "object"
        ? Object.keys(value).length > 0
        : Boolean(value);

export const gogoSearch = async (query: string) => {
  const response = await lycen.get<string>(
    `${GOGO_URL}/search.html?keyword=${encodeURIComponent(query)}`,
  );
  const data = response.data;

  const $ = load(data);

  const results: SearchResult[] = [];

  $("ul.items li").each((_i, el) => {
    const $el = $(el);

    const title = $el.find(".name").text().trim();
    const released = $el.find(".released").text().trim();
    const urlUnparsed = $el.find(".name a").attr("href");
    const url = `${GOGO_URL}${urlUnparsed}`;
    const id = urlUnparsed?.split("/")[2];
    const image = $el.find("img").attr("src");

    results.push({
      id: isDefined(id) ? id : "",
      title: cleanTitle(title),
      url,
      image: isNotEmpty(image) ? (image as string) : "",
      released,
    });
  });

  return results;
};

export const getGogoInfo = async (id: string): Promise<GogoInfo> => {
  const { data } = await lycen.get<string>(`${GOGO_URL}/category/${id}`);
  const $ = load(data);

  const typeText = $(".type span:contains('Type:')").next().text().trim();
  const [season, yearStr, type] = typeText.split(" ");
  const year = Number(yearStr);

  return {
    id,
    coverImage: isNotEmpty($(".anime_info_body_bg img").attr("src"))
      ? ($(".anime_info_body_bg img").attr("src") as string)
      : "",
    title: $(".anime_info_body_bg h1").text().trim(),
    season: isDefined(season) ? season.toUpperCase() : "UNKNOWN",
    year: Number.isNaN(year) ? 0 : year,
    type: isNotEmpty(type) ? type.toUpperCase() : "ANIME",
    description: $(".description").text().trim(),
    genres: $(".type span:contains('Genre:')")
      .nextAll("a")
      .map((_i, el) => $(el).text().trim().replace(/, /g, ""))
      .get(),
    released: $(".type span:contains('Released:')").next().text().trim(),
    synonyms: $(".type.other-name span:contains('Other name:')").next().text().trim().split(", "),
    status: $(".type span:contains('Status:')").next().text().trim(),
  };
};

export interface GogoEpisode {
  id: string;
  number: number;
  url: string;
}

export const getGogoEpisode = async (id: string) => {
  const { data } = await lycen.get<string>(`${GOGO_URL}/category/${id}`);
  const $ = load(data);

  const epStart = $("#episode_page > li").first().find("a").attr("ep_start");
  const epEnd = $("#episode_page > li").last().find("a").attr("ep_end");
  const movieId = $("#movie_id").attr("value");
  const alias = $("#alias_anime").attr("value");

  const { data: ajaxData } = await lycen.get<string>(
    `${GOGO_AJAX_URL}/load-list-episode?ep_start=${epStart}&ep_end=${epEnd}&id=${movieId}&default_ep=${0}&alias=${alias}`,
  );

  const $$ = load(ajaxData);

  const episodes = $$("#episode_related > li")
    .map((i, el) => ({
      id: $(el).find("a").attr("href")?.split("/")[1] ?? "",
      number: Number($(el).find("div.name").text().replace("EP ", "")) || i + 1,
      url: `${GOGO_URL}/${$(el).find("a").attr("href")?.trim() || ""}`,
    }))
    .get() as GogoEpisode[];

  return episodes.reverse();
};
