import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDirs, getCachedItem, saveItem } from "./cacheService.js";
import { generateDescription, generateAndSaveImage } from "./openaiService.js";
import { pickRandomCategory, getRandomItem, CATEGORY_LABELS } from "./itemService.js";
import { renderPage, renderLoadingPage, renderErrorPage } from "./template.js";
import type { RenderedItem } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const app = express();

// Read PORT from the environment — required for Railway/Vercel
const port = parseInt(process.env["PORT"] ?? "3000", 10);

// In-memory store for background generation jobs
type JobState =
  | { status: "pending" }
  | { status: "done"; html: string }
  | { status: "error"; error: string };

const jobs = new Map<string, JobState>();
const REQUEST_ID_RE = /^[a-zA-Z0-9_-]{1,200}$/;

app.use(express.json());
app.use(express.static(path.join(ROOT, "public")));

app.get("/", async (_req, res) => {
  try {
    const category = pickRandomCategory();
    const item = await getRandomItem(category);
    const categoryLabel = CATEGORY_LABELS[category];

    const cached = await getCachedItem(item.key);

    if (cached) {
      // Cache hit — respond immediately
      console.log(`[cache hit]  ${item.name}`);
      const renderedItem: RenderedItem = {
        item,
        generatedDescription: cached.generatedDescription,
        imageFilename: cached.imageFilename,
        categoryLabel,
      };
      res.send(renderPage(renderedItem));
      return;
    }

    // Cache miss — start background job and return loading page immediately
    console.log(`[cache miss] Generating content for: ${item.name}`);
    const requestId = `${item.key.replace(/[^a-zA-Z0-9_-]/g, "_")}-${Date.now()}`;
    jobs.set(requestId, { status: "pending" });

    // Auto-clean the job entry after 10 minutes
    setTimeout(() => jobs.delete(requestId), 10 * 60 * 1000);

    res.send(renderLoadingPage(item.name, requestId));

    // Run AI generation in the background (do not await)
    void (async () => {
      try {
        const generatedDescription = await generateDescription(item);
        const imageFilename = `${item.key.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
        await generateAndSaveImage(item, imageFilename);

        const newCached = { generatedDescription, imageFilename };
        await saveItem(item.key, newCached);
        console.log(`[cache save] ${item.name} → ${imageFilename}`);

        const renderedItem: RenderedItem = { item, ...newCached, categoryLabel };
        jobs.set(requestId, { status: "done", html: renderPage(renderedItem) });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const cause = err instanceof Error && err.cause ? `\n  cause: ${err.cause}` : "";
        const stack = err instanceof Error && err.stack ? `\n${err.stack}` : "";
        console.error(`[job error] ${item.name}: ${error}${cause}${stack}`);
        jobs.set(requestId, { status: "error", error });
      }
    })();
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unknown error occurred.";
    console.error("[error]", message);
    res.status(500).send(renderErrorPage(message));
  }
});

// Polling endpoint used by the loading page
app.get("/api/status/:requestId", (req, res) => {
  const { requestId } = req.params;

  if (!requestId || !REQUEST_ID_RE.test(requestId)) {
    res.status(400).json({ error: "Invalid request ID" });
    return;
  }

  const job = jobs.get(requestId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.status === "done") {
    jobs.delete(requestId);
    res.json({ ready: true, html: job.html });
  } else if (job.status === "error") {
    jobs.delete(requestId);
    res.json({ ready: false, error: job.error });
  } else {
    res.json({ ready: false });
  }
});

// Bind to 0.0.0.0 so the platform can route traffic to the container
await ensureDirs();
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});
