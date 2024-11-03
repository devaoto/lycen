import mongoose from "mongoose";
import startCrawlProcess from "./crawl";

if (!process.env.DATABASE_URI)
  throw new Error("Couldn't start crawling as database error is not provided.");

await mongoose.connect(process.env.DATABASE_URI as string);

await startCrawlProcess();
