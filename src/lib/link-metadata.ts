export interface LinkMetadata {
  title: string;
  description?: string;
  mediaType: "text" | "link" | "video" | "image";
  provider?: "youtube" | "tiktok" | "vimeo" | "web";
  thumbnailUrl?: string;
  embedHtml?: string;
  domain: string;
  width?: number;
  height?: number;
  note?: string; // surfaced to the user when auto-preview isn't possible
}

const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 2_000_000; // 2MB cap on fetched HTML

export class UnsafeUrlError extends Error {}

/**
 * Blocks localhost/private-network/link-local targets so link capture can't be used for SSRF.
 * Best-effort for hostnames (no DNS rebinding protection) — adequate for a local single-user app.
 */
export function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https links are supported.");
  }
  const host = url.hostname.toLowerCase();
  const privatePatterns = [
    /^localhost$/,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^169\.254\./,
    /^::1$/,
    /^\[::1\]$/,
  ];
  if (privatePatterns.some((pattern) => pattern.test(host))) {
    throw new UnsafeUrlError("Links to private or internal addresses aren't allowed.");
  }
  return url;
}

export async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function readBounded(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  const decoder = new TextDecoder();
  let result = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    result += decoder.decode(value, { stream: true });
    if (bytes > MAX_BYTES) break;
  }
  return result;
}

function extractMetaTag(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return undefined;
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/**
 * Resolves a short-link redirect (e.g. vm.tiktok.com) to its final URL. TikTok's oEmbed
 * endpoint rejects short-links outright, so callers that only have a short-link need this
 * before they can look up metadata. Falls back to the original URL if the request fails.
 */
async function resolveRedirect(url: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" });
    return res.url || url;
  } catch {
    return url;
  }
}

async function fetchOEmbed(
  endpoint: string,
  provider: "youtube" | "tiktok" | "vimeo",
): Promise<LinkMetadata | null> {
  try {
    const res = await fetchWithTimeout(endpoint);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      html?: string;
      width?: number;
      height?: number;
    };
    return {
      title: data.title ?? provider,
      description: data.author_name ? `by ${data.author_name}` : undefined,
      mediaType: "video",
      provider,
      thumbnailUrl: data.thumbnail_url,
      embedHtml: data.html,
      domain: provider,
      width: data.width,
      height: data.height,
    };
  } catch {
    return null;
  }
}

async function fetchOpenGraph(url: URL): Promise<LinkMetadata> {
  const domain = url.hostname.replace(/^www\./, "");
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { "User-Agent": "CuriosityEngine/0.1 (+local capture)" },
    });
    if (!res.ok) {
      return { title: url.toString(), mediaType: "link", domain, note: "Couldn't fetch a preview for this link." };
    }
    const html = await readBounded(res);
    const title =
      extractMetaTag(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) ?? url.toString();
    const description = extractMetaTag(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);
    const thumbnailUrl = extractMetaTag(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ]);
    return {
      title,
      description,
      mediaType: thumbnailUrl ? "image" : "link",
      provider: "web",
      thumbnailUrl,
      domain,
    };
  } catch {
    return { title: url.toString(), mediaType: "link", domain, note: "Couldn't fetch a preview for this link." };
  }
}

export async function fetchLinkMetadata(raw: string): Promise<LinkMetadata> {
  const url = assertPublicHttpUrl(raw);
  const host = url.hostname.toLowerCase();

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    const result = await fetchOEmbed(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`,
      "youtube",
    );
    if (result) return result;
  }

  if (host.includes("tiktok.com")) {
    let tiktokUrl = url;
    // Short share-links (vm.tiktok.com / vt.tiktok.com — what the TikTok app's Share
    // button actually gives you) are rejected outright by TikTok's oEmbed endpoint;
    // resolve to the canonical form first.
    if (host === "vm.tiktok.com" || host === "vt.tiktok.com") {
      const resolved = await resolveRedirect(url.toString());
      try {
        tiktokUrl = assertPublicHttpUrl(resolved);
      } catch {
        tiktokUrl = url;
      }
    }
    const result = await fetchOEmbed(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl.toString())}`,
      "tiktok",
    );
    if (result) return result;
  }

  if (host.includes("vimeo.com")) {
    const result = await fetchOEmbed(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url.toString())}`,
      "vimeo",
    );
    if (result) return result;
  }

  if (host.includes("instagram.com")) {
    // Instagram retired public/unauthenticated oEmbed access — auto-preview needs a
    // Meta developer app + access token, which is out of scope for local capture.
    return {
      title: url.toString(),
      mediaType: "link",
      provider: "web",
      domain: "instagram.com",
      note: "Instagram links can't be auto-previewed (Instagram requires developer credentials for that). Add a title manually.",
    };
  }

  return fetchOpenGraph(url);
}
