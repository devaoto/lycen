import { drizzle } from "drizzle-orm/bun-sqlite";

const db = drizzle(import.meta.env.DB_FILE_NAME || "lycen.sqlite");

export { db };
