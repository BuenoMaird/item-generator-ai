import type { Open5eItem, Open5eListResponse } from "./types.js";

const BASE_URL = "https://api.open5e.com/v2/magicitems/";

const CATEGORIES = ["weapon", "armor", "wondrous-item", "scroll"] as const;

/** Wraps fetch so network-level errors include the URL and underlying cause. */
async function fetchOrThrow(url: string): Promise<Response> {
  try {
    return await fetch(url);
  } catch (err) {
    const cause = err instanceof Error ? (err.cause ?? err.message) : String(err);
    throw new Error(`Network error fetching ${url}: ${cause}`);
  }
}

export type CategoryKey = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  weapon: "Weapon",
  armor: "Armor",
  "wondrous-item": "Magical Item",
  scroll: "Magical Scroll",
};

export function pickRandomCategory(): CategoryKey {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]!;
}

export async function getRandomItem(category: CategoryKey): Promise<Open5eItem> {
  // Step 1: fetch count for this category
  const countUrl = `${BASE_URL}?category=${category}&limit=1`;
  const countRes = await fetchOrThrow(countUrl);
  if (!countRes.ok) {
    throw new Error(`Open5e count fetch failed (HTTP ${countRes.status}) for category "${category}"`);
  }
  const countData = (await countRes.json()) as Open5eListResponse;
  const total = countData.count;
  if (total === 0) {
    throw new Error(`No items found for category: ${category}`);
  }

  // Step 2: fetch a random item using page offset
  const page = Math.floor(Math.random() * total) + 1;
  const itemUrl = `${BASE_URL}?category=${category}&limit=1&page=${page}`;
  const itemRes = await fetchOrThrow(itemUrl);
  if (!itemRes.ok) {
    throw new Error(`Open5e item fetch failed (HTTP ${itemRes.status}) for category "${category}" page ${page}`);
  }
  const itemData = (await itemRes.json()) as Open5eListResponse;
  const item = itemData.results[0];
  if (!item) {
    throw new Error(`No item returned for category: ${category}, page: ${page}`);
  }
  return item;
}
