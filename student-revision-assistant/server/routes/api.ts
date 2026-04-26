import express from "express";
import { scrapeUrl } from "../services/scraper.ts";

const router = express.Router();

router.post("/ingest", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const content = await scrapeUrl(url);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
