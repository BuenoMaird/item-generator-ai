import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { CachedItemData } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export const CACHE_DIR = path.join(ROOT, "cache", "items");
export const IMAGES_DIR = path.join(ROOT, "public", "images");

export async function ensureDirs(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

export async function getCachedItem(key: string): Promise<CachedItemData | null> {
  const filePath = path.join(CACHE_DIR, `${sanitizeKey(key)}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as CachedItemData;
  } catch {
    return null;
  }
}

export async function saveItem(key: string, data: CachedItemData): Promise<void> {
  const filePath = path.join(CACHE_DIR, `${sanitizeKey(key)}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function imageFilePath(filename: string): string {
  return path.join(IMAGES_DIR, filename);
}

function sanitizeKey(key: string): string {
  // Replace any characters that are invalid in filenames
  return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}
