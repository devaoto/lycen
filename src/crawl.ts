import chalk from "chalk";
import { eq, not, or } from "drizzle-orm";
import { createLogger, format, transports } from "winston";
import { db } from "./db";
import { insertMappingAnime, updateMappingAnime } from "./db/insert";
import { animes } from "./db/schema";
import lycen from "./helpers/request";
import { generateMappings } from "./mappings/generate";

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    }),
  ),
  transports: [new transports.Console(), new transports.File({ filename: "crawler.log" })],
});

const processedIds = new Set<number>();

async function fetchIds(): Promise<number[]> {
  try {
    const res = await lycen.get<string>(
      "https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt",
    );
    const ids = res.data
      .split("\n")
      .map(Number)
      .filter((id) => !Number.isNaN(id));
    logger.info(chalk.blue(`Fetched ${ids.length} IDs from GitHub`));
    return ids;
  } catch (error) {
    logger.error(chalk.red(`Error fetching IDs: ${(error as Error).message}`));
    return [];
  }
}

async function processNewIds(ids: number[]) {
  const newIds = ids.filter((id) => !processedIds.has(id));

  if (newIds.length === 0) {
    logger.info(chalk.yellow("No new IDs to process"));
    return;
  }

  logger.info(chalk.green(`Processing ${newIds.length} new IDs`));

  for (const id of newIds) {
    try {
      const mapping = await generateMappings(id);

      if (mapping) {
        await insertMappingAnime(db, mapping);
        processedIds.add(id);
        logger.info(chalk.green(`Successfully processed ID: ${id}`));
      }
    } catch (error) {
      logger.error(chalk.red(`Error processing ID ${id}: ${(error as Error).message}`));
    }
  }
}

async function updateExistingMappings() {
  try {
    const activeAnime = await db
      .select()
      .from(animes)
      .where(
        not(
          // @ts-expect-error
          or(eq(animes.status, "FINISHED"), eq(animes.status, "CANCELLED")),
        ),
      );

    logger.info(chalk.blue(`Updating ${activeAnime.length} active anime entries`));

    for (const anime of activeAnime) {
      try {
        const mapping = await generateMappings(anime.id);

        if (mapping) {
          await updateMappingAnime(db, mapping);
          logger.info(chalk.green(`Successfully updated mapping for ID: ${anime.id}`));
        }
      } catch (error) {
        logger.error(
          chalk.red(`Error updating mapping for ID ${anime.id}: ${(error as Error).message}`),
        );
      }
    }
  } catch (error) {
    logger.error(chalk.red(`Error in updateExistingMappings: ${(error as Error).message}`));
  }
}

const crawl = async () => {
  logger.info(chalk.blue("Starting crawler..."));

  const initialIds = await fetchIds();
  await processNewIds(initialIds);

  setInterval(
    async () => {
      logger.info(chalk.blue("Checking for new IDs..."));
      const ids = await fetchIds();
      await processNewIds(ids);
    },
    5 * 60 * 1000,
  ); // 5 minutes

  setInterval(
    async () => {
      logger.info(chalk.blue("Starting mapping updates..."));
      await updateExistingMappings();
    },
    60 * 60 * 1000,
  ); // 1 hour
};

process.on("uncaughtException", (error) => {
  logger.error(chalk.red(`Uncaught Exception: ${error.message}`));
});

process.on("unhandledRejection", (error) => {
  logger.error(chalk.red(`Unhandled Rejection: ${(error as Error).message}`));
});

crawl();
