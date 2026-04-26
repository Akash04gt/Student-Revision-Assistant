import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedContent {
  title: string;
  url: string;
  text: string;
  sourceType: "github" | "webpage";
}

export async function scrapeUrl(url: string): Promise<ScrapedContent[]> {
  const isGithub = url.includes("github.com");

  if (isGithub) {
    return scrapeGithub(url);
  } else {
    return [await scrapeWebpage(url)];
  }
}

async function scrapeWebpage(url: string): Promise<ScrapedContent> {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const $ = cheerio.load(html);

    // Remove scripts, styles, etc.
    $("script, style, nav, footer, iframe, noscript").remove();

    const title = $("title").text() || "Untitled Page";
    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    return {
      title,
      url,
      text,
      sourceType: "webpage",
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw new Error("Failed to scrape the provided URL.");
  }
}

async function scrapeGithub(url: string): Promise<ScrapedContent[]> {
  const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!repoMatch) throw new Error("Invalid GitHub URL");

  const [_, user, repo] = repoMatch;
  const branches = ["main", "master", "develop"];
  const filesToTry = [
    "README.md", "README.MD", "readme.md",
    "package.json", "requirements.txt", "go.mod", "Cargo.toml",
    "src/index.ts", "src/main.ts", "src/App.tsx", "src/index.js", "src/App.js",
    "index.js", "main.py", "app.py",
    "src/server.ts", "server.ts",
    "docs/README.md", "docs/index.md"
  ];
  
  const results: ScrapedContent[] = [];
  const triedUrls = new Set<string>();

  for (const branch of branches) {
    const baseUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}`;
    for (const file of filesToTry) {
      const fileUrl = `${baseUrl}/${file}`;
      if (triedUrls.has(fileUrl)) continue;
      triedUrls.add(fileUrl);

      try {
        const { data: text } = await axios.get(fileUrl, { timeout: 3000 });
        if (typeof text === "string" && text.length > 50) {
          results.push({
            title: `${branch}/${file}`,
            url: fileUrl,
            text,
            sourceType: "github",
          });
          // If we found a branch that works, we can stick with it for other files or just keep going
        }
      } catch (e) {
        // Skip errors
      }
    }
    // Optimization: if we found some files in one branch, maybe stop searching other branches?
    // Let's keep it simple for now and try all if results are low.
    if (results.length > 3) break;
  }

  if (results.length === 0) {
    // Fallback: scrape the main page but try to find the README content specifically
    const landingPage = await scrapeWebpage(url);
    results.push(landingPage);
  }

  return results;
}
