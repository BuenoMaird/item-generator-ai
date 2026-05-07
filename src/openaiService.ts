import OpenAI from "openai";
import fs from "fs/promises";
import type { Open5eItem } from "./types.js";
import { imageFilePath } from "./cacheService.js";
import { CATEGORY_LABELS, type CategoryKey } from "./itemService.js";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      throw new Error("OPENAI_API_KEY is not set in .env");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export async function generateDescription(item: Open5eItem): Promise<string> {
  const client = getClient();
  const categoryLabel = CATEGORY_LABELS[item.category.key as CategoryKey] ?? item.category.name;

  const prompt = `You are a Dungeons & Dragons 5e loremaster writing vivid item descriptions for a magical item compendium.

Write a rich, atmospheric 2-3 paragraph description for this magical item:
- Name: ${item.name}
- Category: ${categoryLabel}
- Rarity: ${item.rarity.name}
- Official description: ${item.desc}

The description should:
1. Open with an evocative flavour text paragraph that sets the scene or history of the item
2. Describe the item's appearance in detail (materials, colours, magical properties visible to the eye)
3. Briefly explain its power or purpose in the world

Write in a fantasy tone, third person. Do not include stat blocks or game mechanics. 2-3 paragraphs, no headers.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 400,
    temperature: 0.85,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("GPT returned empty description");
  }
  return text;
}

export async function generateAndSaveImage(
  item: Open5eItem,
  imageFilename: string,
): Promise<void> {
  const client = getClient();
  const categoryLabel = CATEGORY_LABELS[item.category.key as CategoryKey] ?? item.category.name;
  const rarityAdjectives: Record<string, string> = {
    common: "simple yet mystical",
    uncommon: "well-crafted and glowing with subtle magic",
    rare: "ornate and radiating magical energy",
    "very-rare": "masterwork, shimmering with powerful enchantments",
    legendary: "awe-inspiring, legendary, radiating immense arcane power",
  };
  const rarityDesc = rarityAdjectives[item.rarity.key] ?? "magical";

  const imagePrompt = `A detailed fantasy RPG item illustration on a dark stone background. The item is "${item.name}", a ${rarityDesc} ${categoryLabel.toLowerCase()} from Dungeons & Dragons. Rendered in the style of classic D&D 5e sourcebook art: detailed, painterly, dramatic lighting. The item is centred against a dark vignette background with subtle magical runes or glowing effects. High detail, professional fantasy concept art.`;

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "url",
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("DALL-E returned no image URL");
  }

  // Download and save the image to disk
  let imageRes: Response;
  try {
    imageRes = await fetch(imageUrl);
  } catch (err) {
    const cause = err instanceof Error ? (err.cause ?? err.message) : String(err);
    throw new Error(`Network error downloading DALL-E image: ${cause}`);
  }
  if (!imageRes.ok) {
    throw new Error(`Failed to download DALL-E image (HTTP ${imageRes.status})`);
  }
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  await fs.writeFile(imageFilePath(imageFilename), buffer);
}
