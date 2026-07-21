import { z } from "zod";

const DOCS_BASE = "https://docs.horizen.io";

export const searchInputSchema = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(10).default(5),
});

export async function handleSearchDocs(input: { query: string; limit: number }) {
  const searchUrl = `${DOCS_BASE}/search?q=${encodeURIComponent(input.query)}`;

  let html: string;
  try {
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "horizen-mcp/0.1.0 (docs reference server)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return {
        error: `Docs search returned HTTP ${res.status}`,
        searchUrl,
        suggestion: "Browse directly at https://docs.horizen.io",
      };
    }
    html = await res.text();
  } catch (err) {
    return {
      error: "Could not reach docs.horizen.io",
      detail: err instanceof Error ? err.message : String(err),
      suggestion: "Browse directly at https://docs.horizen.io",
    };
  }

  const results = parseDocusaurusSearchResults(html, input.limit);

  return {
    query: input.query,
    source: DOCS_BASE,
    results,
    totalReturned: results.length,
    note: results.length === 0
      ? "No results found. Try broader terms or browse https://docs.horizen.io directly."
      : undefined,
  };
}

function parseDocusaurusSearchResults(
  html: string,
  limit: number
): Array<{ title: string; url: string; excerpt: string }> {
  const results: Array<{ title: string; url: string; excerpt: string }> = [];

  // Match search result items from Docusaurus search page HTML
  const itemPattern = /<article[^>]*class="[^"]*search[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const titlePattern = /<[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i;
  const linkPattern = /href="([^"]+)"/i;
  const textPattern = /<p[^>]*>([\s\S]*?)<\/p>/i;

  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(html)) !== null && results.length < limit) {
    const block = match[1];
    const titleMatch = titlePattern.exec(block);
    const linkMatch = linkPattern.exec(block);
    const textMatch = textPattern.exec(block);

    if (titleMatch && linkMatch) {
      const title = stripTags(titleMatch[1]).trim();
      const href = linkMatch[1];
      const url = href.startsWith("http") ? href : `${DOCS_BASE}${href}`;
      const excerpt = textMatch ? stripTags(textMatch[1]).trim().slice(0, 200) : "";

      if (title) {
        results.push({ title, url, excerpt });
      }
    }
  }

  return results;
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
}
