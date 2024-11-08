import { logger, UPDATE_INTERVAL, updateReleasingAnime } from "./crawl";

setInterval(async() => {
    logger.info("Starting scheduled update for releasing anime...");
    await updateReleasingAnime();
}, UPDATE_INTERVAL);