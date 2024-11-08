import fs from "node:fs/promises";
import { sleep } from "bun";
import chalk from "chalk";
import winston from "winston";
import { insertAnime, deleteAnime, Anime } from "./database";
import lycen from "./helpers/request";
import { generateMappings } from "./mappings/generate";

const lastIDFile = "last_id.json";
const INITIAL_DELAY = 1000;
const UPDATE_INTERVAL = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

const releasingStatus = ["Currently Airing", "Coming Soon", "On Break", "Unknown"];

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) =>
      chalk.blue(`[${timestamp}] ${chalk.yellow(level)}: ${message}`),
    ),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "crawler.log" }),
    new winston.transports.File({ filename: "crawler-error.log", level: "error" }),
  ],
});

const loadLastID = async () => {
  try {
    const data = await fs.readFile(lastIDFile, "utf8");
    return JSON.parse(data).lastID || null;
  } catch (_error) {
    logger.warn("No last ID file found. Starting from scratch.");
    return null;
  }
};

const saveLastID = async (lastID: string) => {
  try {
    await fs.writeFile(lastIDFile, JSON.stringify({ lastID }), "utf8");
  } catch (error) {
    logger.error("Failed to save last ID:", error);
  }
};

const getIds = async () => {
  try {
    const res = await lycen.get<string>(
      "https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt",
    );
    const ids = res.data.split("\n").filter((id) => id.trim() !== "");
    logger.info(`Fetched ${ids.length + 1} IDs`);
    return ids;
  } catch (error) {
    logger.error("Failed to fetch IDs:", error);
    return [];
  }
};

const processAnime = async (id: string, currentIndex: number, total: number) => {
  try {
    logger.info(chalk.cyan(`Processing anime ${id} (${currentIndex + 1}/${total})`));
    const has = await Anime.findOne({ id });

    if (has) {
      logger.info(
        chalk.yellow(`Skipping anime with ID ${id} (${currentIndex + 1}/${total}): already exists.`),
      );
      return;
    }
    
    const mappings = await generateMappings(Number(id));

    if (!(mappings?.id && mappings.title)) {
      logger.info(
        chalk.red(
          `Skipping anime with ID ${id} (${currentIndex + 1}/${total}): missing necessary data.`,
        ),
      );
      return;
    }

    await insertAnime(mappings);
    logger.info(
      chalk.green(
        `Successfully inserted ${mappings.title.userPreferred} ID: ${id} (${currentIndex + 1}/${total}).`,
      ),
    );
  } catch (error) {
    logger.error(`Error processing anime ID ${id} (${currentIndex + 1}/${total}):`, error);
  }
};

const updateReleasingAnime = async () => {
  try {
    logger.info("Starting update for releasing anime...");
    
    const releasingAnime = await Anime.find({ status: { $in: releasingStatus } });
    logger.info(`Found ${releasingAnime.length} releasing anime to update`);

    for (const anime of releasingAnime) {
      try {
        const updatedMappings = await generateMappings(Number(anime.id));

        if (updatedMappings?.id && updatedMappings.title) {
          await deleteAnime(anime.id);
          await insertAnime(updatedMappings);
          logger.info(
            chalk.green(
              `Updated releasing anime: ${updatedMappings.title.userPreferred} ID: ${anime.id} Status: ${updatedMappings.status}`,
            ),
          );
        }

        await sleep(INITIAL_DELAY);
      } catch (error) {
        logger.error(`Error updating anime ID ${anime.id}:`, error);
      }
    }
    
    logger.info("Completed updating releasing anime");
  } catch (error) {
    logger.error("Error in updateReleasingAnime:", error);
  }
};

const initialCrawl = async () => {
  const lastID = await loadLastID();
  const ids = await getIds();

  const startIndex = lastID ? ids.indexOf(lastID) + 1 : 0;
  const total = ids.length;

  for (let i = startIndex; i < total; i++) {
    const id = ids[i];
    await processAnime(id, i, total + 1);
    await saveLastID(id);
    await sleep(INITIAL_DELAY);
  }

  logger.info("Initial crawling completed");
};

const startCrawlProcess = async () => {
  await initialCrawl();

  await updateReleasingAnime();
  
  setInterval(async () => {
    logger.info("Starting scheduled update for releasing anime...");
    await updateReleasingAnime();
  }, UPDATE_INTERVAL);
};

export default startCrawlProcess;