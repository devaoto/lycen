import fs from "node:fs/promises";
import { sleep } from "bun";
import chalk from "chalk";
import winston from "winston";
import { insertAnime } from "./database";
import lycen from "./helpers/request";
import { generateMappings } from "./mappings/generate";

const lastIDFile = "last_id.json";
const finishedStatus = ["Series Completed", "Discontinued"];
const CHECK_INTERVAL = 1800000;
const DELAY = 5000;

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
    const mappings = await generateMappings(Number(id));

    if (!(mappings?.id && mappings.title)) {
      logger.info(
        chalk.red(
          `Skipping anime with ID ${id} (${currentIndex + 1}/${total}): missing necessary data.`,
        ),
      );
      return;
    }

    if (!finishedStatus.includes(mappings.status)) {
      logger.info(
        chalk.yellow(
          `Skipping anime with ID ${id} (${currentIndex + 1}/${total}): status is not FINISHED or CANCELLED.`,
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

const crawl = async () => {
  const lastID = await loadLastID();
  const ids = await getIds();

  const startIndex = lastID ? ids.indexOf(lastID) + 1 : 0;
  const total = ids.length;

  for (let i = startIndex; i < total; i++) {
    const id = ids[i];
    await processAnime(id, i, total + 1);
    await saveLastID(id);
    await sleep(DELAY);
  }

  logger.info("Crawling completed, waiting for next cycle...");
};

const startCrawlProcess = async () => {
  await crawl();
  setInterval(async () => {
    logger.info("Checking for new IDs to process...");
    await crawl();
  }, CHECK_INTERVAL);
};

export default startCrawlProcess;
