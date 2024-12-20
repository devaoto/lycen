import type { HttpBindings } from "@hono/node-server";
import chalk from "chalk";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { prettyJSON } from "hono/pretty-json";
import { timeout } from "hono/timeout";
import Redis from "ioredis";
import mongoose from "mongoose";
import winston from "winston";
import { Anime, deleteAllAnime, getAllAnime, getAnime, insertAnime, updateAnime } from "./database";
import { generateMappings, type MappingAnime } from "./mappings/generate";

const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    if (process.stdout.isTTY) {
      return chalk.blue(`${msg}`);
    }
    return msg;
  }),
);

const winstonLogger = winston.createLogger({
  level: "info",
  format: customFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "server.log",
      format: winston.format.combine(winston.format.uncolorize(), customFormat),
    }),
    new winston.transports.File({
      filename: "server-error.log",
      level: "error",
      format: winston.format.combine(winston.format.uncolorize(), customFormat),
    }),
  ],
});

if (!(process.env.DATABASE_URI && process.env.REDIS_HOST && process.env.REDIS_PASSWORD)) {
  winstonLogger.error("Database URI, Redis host, and Redis password are required.");
  process.exit(1);
}

const redis = new Redis({
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
});

await mongoose.connect(process.env.DATABASE_URI);

winstonLogger.info("Successfully connected to different databases", {
  databases: [{ name: "Redis" }, { name: "MongoDB" }],
});

const app = new Hono<{ Bindings: HttpBindings }>();

interface AnimeRecommendation {
  title: {
    english?: string | null;
    romaji?: string | null;
    native?: string | null;
    userPreferred?: string | null;
  };
  id: string;
  coverImage: string;
  bannerImage: string;
  description: string;
  episodes: number;
  status: string;
  genres: string[];
  tags: string[];
  studios: string[];
  themes: { mal_id: number; type: string; name: string; url: string; }[];
}

export async function getRecommendations(anime: MappingAnime): Promise<AnimeRecommendation[]> {
  const { genres, tags, data } = anime;

  const query = {
    $and: [
      { genres: { $in: genres }, "genres.length": { $gte: 2 } },
      { tags: { $in: tags }, "tags.length": { $gte: 3 } },
      { "data.themes": { $in: data.themes }, "data.themes.length": { $gte: 1 } },
    ],
    id: { $ne: anime.id },
  };

  const recommendations = await Anime.find(query, {
    title: 1,
    id: 1,
    coverImage: 1,
    bannerImage: 1,
    description: 1,
    episodes: 1,
    status: 1,
    genres: 1,
    tags: 1,
    studios: 1,
    "data.themes": 1,
  })
    .limit(10)
    .lean();

  return recommendations.map((rec) => ({
    title: rec.title,
    id: String(rec.id),
    coverImage: rec.coverImage,
    bannerImage: rec.bannerImage,
    description: rec.description,
    episodes: rec.episodes,
    studios: rec.studios,
    themes: rec.data.themes,
    status: rec.status,
    genres: rec.genres,
    tags: rec.tags,
  }));
}

app.use(cors());
app.use(prettyJSON());
app.use(timeout(5 * 60 * 1000));

app.use("*", async (ctx, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  const ip =
    ctx.req.header("x-forwarded-for") ||
    ctx.req.header("x-real-ip") ||
    ctx.req.header("cf-connecting-ip") ||
    "unknown";

  winstonLogger.info(`Incoming ${ctx.req.method} request`, {
    requestId,
    path: ctx.req.path,
    ip,
    userAgent: ctx.req.header("user-agent"),
    referer: ctx.req.header("referer"),
  });

  try {
    await next();

    const responseTime = Date.now() - start;
    winstonLogger.info("Request completed", {
      requestId,
      path: ctx.req.path,
      method: ctx.req.method,
      status: ctx.res.status,
      responseTime: `${responseTime}ms`,
    });
  } catch (error) {
    const responseTime = Date.now() - start;
    winstonLogger.error("Request failed", {
      requestId,
      path: ctx.req.path,
      method: ctx.req.method,
      error: (error as Error).message,
      stack: (error as Error).stack,
      responseTime: `${responseTime}ms`,
    });

    throw error;
  }
});

async function deleteAllKeys(): Promise<void> {
  const keys = await redis.keys("*");

  if (keys.length === 0) {
    // biome-ignore lint/suspicious/noConsoleLog: <explanation>
    console.log("No keys to delete!");
    return;
  }

  const pipeline = redis.pipeline();
  // biome-ignore lint/complexity/noForEach: <explanation>
  keys.forEach((key) => pipeline.del(key));

  await pipeline.exec();
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log(`Deleted ${keys.length} keys from cache!`);
}

app.get("/", async (ctx) =>
  ctx.json({ message: "Welcome to Lycen API.", totalAnimes: (await getAllAnime()).length }),
);

app.get("/clear_cache", async (ctx) => {
  const secret = ctx.req.query("secret");

  if (!secret) throw new HTTPException(400, { message: "Secret Key is required" });

  if (secret !== process.env.SECRET_KEY)
    throw new HTTPException(401, { message: "Invalid secret key" });

  await deleteAllKeys();

  return ctx.json({
    message: "Successfully cleared all cache",
  });
});

app.get("/delete_all", async (ctx) => {
  const secret = ctx.req.query("secret");
  const deleteKeys = ctx.req.query("cache") === "true";

  if (!secret) throw new HTTPException(400, { message: "Secret Key is required" });

  if (secret !== process.env.SECRET_KEY)
    throw new HTTPException(401, { message: "Invalid secret key" });

  await deleteAllAnime();

  if (deleteKeys) {
    await deleteAllKeys();
  }

  return ctx.json({
    message: `Successfully deleted all anime${deleteKeys ? " including cache" : ""}`,
  });
});

app.get("/info/:id", async (ctx) => {
  const { id } = ctx.req.param();

  if (!id) throw new HTTPException(400, { message: "ID is required." });

  const cacheKey = `ani:${id}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return ctx.json(JSON.parse(cachedData));
  }

  const anime = await getAnime(id);

  if (!anime?.id) {
    const mapping = await generateMappings(Number(id));
    const validStatus = ["Series Completed", "Discontinued"];

    if (mapping.id) {
      const cacheTTL = validStatus.includes(mapping.status) ? 30 * 24 * 60 * 60 : 12 * 60 * 60;

      if (validStatus.includes(mapping.status)) {
        await redis.setex(cacheKey, cacheTTL, JSON.stringify(mapping));

        const updated = await insertAnime(mapping);
        return ctx.json(updated);
      }

      const updatedMappings = await generateMappings(Number(id));
      await redis.setex(cacheKey, cacheTTL, JSON.stringify(updatedMappings));

      const updated = await updateAnime(id, updatedMappings);
      return ctx.json(updated);
    }

    return ctx.json({ message: "Anime not found" }, 404);
  }

  await redis.setex(cacheKey, 12 * 60 * 60, JSON.stringify(anime));
  return ctx.json(anime);
});

app.get("/recommendations/:id", async (ctx) => {
  const { id } = ctx.req.param();

  if (!id) throw new HTTPException(400, { message: "ID is required." });

  const cacheKey = `recommendations:${id}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return ctx.json(JSON.parse(cachedData));
  }

  const anime = await getAnime(id);
  if (!anime?.id) {
    return ctx.json({ message: "Anime not found" }, 404);
  }

  const recommendations = await getRecommendations(anime);
  await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

  return ctx.json(recommendations);
});

app.get("/search", async (ctx) => {
  try {
    // Extract query parameters
    const {
      q,
      genres,
      tags,
      season,
      status,
      id,
      idMal,
      fields,
      country,
      page = "1",
      limit = "20",
    } = ctx.req.query();

    const currentPage = Math.max(1, Number(page));
    const itemsPerPage = Math.min(50, Math.max(1, Number(limit)));
    const skip = (currentPage - 1) * itemsPerPage;

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const query: any = {};

    if (q) {
      query.$or = [
        { "title.english": { $regex: q, $options: "i" } },
        { "title.romaji": { $regex: q, $options: "i" } },
        { synonyms: { $regex: q, $options: "i" } },
      ];
    }

    if (genres) {
      const genreList = genres.split(",").map((g) => g.trim());
      query.genres = { $all: genreList };
    }

    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim());
      query.tags = { $all: tagList };
    }

    if (season) {
      query.season = season.toUpperCase();
    }

    if (status) {
      query.status = status;
    }

    if(country) {
      query.countryOfOrigin = country;
    }

    if (id) {
      query.id = Number(id);
    }

    if (idMal) {
      query.idMal = Number(idMal);
    }

    const defaultFields = {
      title: 1,
      id: 1,
      bannerImage: 1,
      coverImage: 1,
      status: 1,
      format: 1,
      season: 1,
      genres: 1,
      tags: 1,
      countryOfOrigin: 1,
      synonyms: 1,
      idMal: 1,
      _id: 0,
    };

    let projection = defaultFields;
    if (fields) {
      projection = fields.split(",").reduce(
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        (acc: any, field) => {
          acc[field.trim()] = 1;
          return acc;
        },
        { _id: 0 },
      );
    }

    const total = await Anime.countDocuments(query);

    const results = await Anime.find(query, projection).skip(skip).limit(itemsPerPage).lean();

    const cacheKey = `search:${JSON.stringify({
      q,
      genres,
      tags,
      season,
      status,
      id,
      idMal,
      fields,
      page,
      limit,
      country,
    })}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return ctx.json(JSON.parse(cachedData));
    }

    const response = {
      pagination: {
        currentPage,
        hasNextPage: skip + results.length < total,
        totalItems: total,
        totalPages: Math.ceil(total / itemsPerPage),
        itemsPerPage,
      },
      results,
    };

    await redis.setex(cacheKey, 3600, JSON.stringify(response));

    return ctx.json(response);
  } catch (error) {
    winstonLogger.error("Search error", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw new HTTPException(500, { message: "Internal server error during search" });
  }
});

export default {
  fetch: app.fetch,
  idleTimeout: 4 * 60,
  port: Number.isNaN(Number(process.env.PORT)) ? 6942 : Number(process.env.PORT),
};

winstonLogger.info("Server successfully started", {
  port: Number.isNaN(Number(process.env.PORT)) ? 6942 : Number(process.env.PORT),
});
