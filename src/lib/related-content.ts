import { assertPublicHttpUrl, decodeHtmlEntities, fetchWithTimeout, readBounded } from "@/lib/link-metadata";
import { rankRelatedCandidates } from "@/lib/related-content-scoring";
import { prisma } from "@/lib/prisma";
import { LOCAL_USER_ID } from "@/lib/constants";
import type { Spark } from "@/generated/prisma/client";

export interface RelatedYoutubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

export interface RelatedFeedItem {
  url: string;
  title: string;
  description?: string;
  sourceLabel: string;
  publishedAt?: string;
}

export interface RelatedSpotifyTrack {
  trackId: string;
  title: string;
  artistNames: string;
  albumImageUrl?: string;
}

export interface RelatedSpotifyEpisode {
  episodeId: string;
  title: string;
  showName: string;
  imageUrl?: string;
}

export type RelatedContentResult =
  | { kind: "youtube"; videos: RelatedYoutubeVideo[] }
  | { kind: "feed"; items: RelatedFeedItem[] }
  | { kind: "spotify"; tracks: RelatedSpotifyTrack[] }
  | { kind: "spotify-episode"; episodes: RelatedSpotifyEpisode[] }
  | { kind: "search-link"; url: string; label: string }
  | { kind: "none" };

const MAX_RESULTS = 6;
const USER_AGENT = "CuriosityEngine/0.1 (+local capture)";
const FEED_PATHS = ["/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml", "/index.xml"];

/** Extracts a YouTube video id from any of the URL shapes oEmbed capture can produce. */
export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www|m|music)\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com") {
      const vParam = parsed.searchParams.get("v");
      if (vParam) return vParam;
      const match = parsed.pathname.match(/\/(?:embed|shorts)\/([^/]+)/);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

function buildSearchLink(domain: string, query: string): { url: string; label: string } {
  const q = encodeURIComponent(query);
  if (domain.includes("substack.com")) {
    return { url: `https://substack.com/search/${q}`, label: "Search Substack for more like this" };
  }
  if (domain === "youtube" || domain.includes("youtube.com")) {
    return {
      url: `https://www.youtube.com/results?search_query=${q}`,
      label: "Search YouTube for more like this",
    };
  }
  return { url: `https://www.google.com/search?q=${q}`, label: "Search the web for more like this" };
}

// YouTube's Data API has had no official "related videos" endpoint since search.list's
// relatedToVideoId parameter was deprecated in August 2023 — there is no legitimate,
// ToS-compliant way to reproduce YouTube's own internal "watch next" ranking (that ranking
// depends on per-viewer history/session signals no public API exposes). This keyword search,
// enriched with the origin video's own creator-authored tags/category (see
// fetchYoutubeVideoMetadata below) when available, is the best legitimate approximation —
// not a substitute for YouTube's personalized recommendations.
async function fetchYoutubeVideoMetadata(
  videoId: string,
): Promise<{ tags: string[]; categoryId?: string; channelId?: string } | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${key}`;
    const res = await fetchWithTimeout(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: { snippet?: { tags?: string[]; categoryId?: string; channelId?: string } }[];
    };
    const snippet = data.items?.[0]?.snippet;
    if (!snippet) return null;
    return { tags: snippet.tags ?? [], categoryId: snippet.categoryId, channelId: snippet.channelId };
  } catch {
    return null;
  }
}

interface RawYoutubeCandidate {
  videoId: string;
  title: string;
  description?: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt?: string;
}

async function searchYoutubeVideos(
  query: string | undefined,
  options: { channelId?: string; categoryId?: string; order?: "date" | "relevance" },
): Promise<RawYoutubeCandidate[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  try {
    const queryParam = query ? `&q=${encodeURIComponent(query)}` : "";
    const channelParam = options.channelId ? `&channelId=${encodeURIComponent(options.channelId)}` : "";
    const categoryParam = options.categoryId ? `&videoCategoryId=${encodeURIComponent(options.categoryId)}` : "";
    const orderParam = options.order ? `&order=${options.order}` : "";
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&safeSearch=moderate${queryParam}${channelParam}${categoryParam}${orderParam}&key=${key}`;
    const res = await fetchWithTimeout(url, { cache: "no-store" });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      items?: {
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          description?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        };
      }[];
    };

    const candidates: RawYoutubeCandidate[] = [];
    for (const item of data.items ?? []) {
      const videoId = item.id?.videoId;
      const title = item.snippet?.title;
      const channelTitle = item.snippet?.channelTitle;
      const thumbnailUrl = item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url;
      if (!videoId || !title || !channelTitle || !thumbnailUrl) continue;
      candidates.push({
        videoId,
        title,
        description: item.snippet?.description,
        channelTitle,
        thumbnailUrl,
        publishedAt: item.snippet?.publishedAt,
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

async function fetchYoutubeRelated(
  origin: { title: string; description?: string },
  excludeVideoId: string | null,
  metadata: { tags: string[]; categoryId?: string; channelId?: string } | null,
): Promise<RelatedYoutubeVideo[] | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  // Stage 1: the origin video's own channel — same-creator content is consistently the most
  // aligned "more like this" signal. Deliberately no `q` here: searching the channel *and*
  // matching the exact origin title as query text over-narrows to near-duplicates of the
  // origin video itself (verified live — a title like "...// EP 93" only matched that one
  // video within the channel). Instead, pull the channel's own recent uploads and let the
  // reranking step below (semantic similarity) pick the most topically aligned ones. Stage 2
  // (today's tags/category-enriched title search) only runs to fill remaining slots, so an
  // active channel skips it entirely.
  const sameChannel = metadata?.channelId
    ? await searchYoutubeVideos(undefined, { channelId: metadata.channelId, order: "date" })
    : [];

  const seen = new Set(sameChannel.map((c) => c.videoId));
  const candidates = sameChannel.filter((c) => c.videoId !== excludeVideoId);

  if (candidates.length < MAX_RESULTS) {
    const tags = metadata?.tags ?? [];
    const query = [origin.title, ...tags.slice(0, 3)].join(" ");
    const general = await searchYoutubeVideos(query, { categoryId: metadata?.categoryId });
    for (const candidate of general) {
      if (candidate.videoId === excludeVideoId || seen.has(candidate.videoId)) continue;
      seen.add(candidate.videoId);
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) return null;

  const ranked = await rankRelatedCandidates(origin, candidates, MAX_RESULTS);
  return ranked.map(({ videoId, title, channelTitle, thumbnailUrl }) => ({
    videoId,
    title,
    channelTitle,
    thumbnailUrl,
  }));
}

// --- Spotify same-artist discovery -------------------------------------------------------
// Spotify's recommendation/related-artist/top-tracks endpoints were restricted for new apps
// in Nov 2024 and tightened further in Feb 2026 — there is no official similarity/
// recommendation endpoint left to call. The one reliable signal still available is a plain
// artist-scoped search (search.list's equivalent: GET /search?q=artist:"...") for the origin
// track's own artist, which we then rank with the same local scorer used everywhere else.

interface RawSpotifyCandidate {
  trackId: string;
  title: string;
  description: string; // artist name(s), used both for display and reranking
  albumImageUrl?: string;
}

let spotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyToken && spotifyToken.expiresAt > Date.now()) return spotifyToken.token;

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetchWithTimeout("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    spotifyToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 30_000,
    };
    return spotifyToken.token;
  } catch {
    return null;
  }
}

/** Extracts a Spotify track/episode id from open.spotify.com/{track|episode}/, /intl-xx/, or /embed/ URLs. */
export function extractSpotifyId(url: string): { type: "track" | "episode"; id: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.replace(/^www\./, "").includes("spotify.com")) return null;
    const match = parsed.pathname.match(/\/(track|episode)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return { type: match[1] as "track" | "episode", id: match[2] };
  } catch {
    return null;
  }
}

async function fetchSpotifyTrack(
  trackId: string,
  token: string,
): Promise<{ name: string; artistName: string } | null> {
  try {
    const res = await fetchWithTimeout(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { name?: string; artists?: { name?: string }[] };
    const artistName = data.artists?.[0]?.name;
    if (!data.name || !artistName) return null;
    return { name: data.name, artistName };
  } catch {
    return null;
  }
}

async function searchSpotifySameArtist(
  artistName: string,
  token: string,
): Promise<RawSpotifyCandidate[]> {
  try {
    const query = `artist:"${artistName}"`;
    const url = `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      tracks?: {
        items?: {
          id?: string;
          name?: string;
          artists?: { name?: string }[];
          album?: { images?: { url?: string }[] };
        }[];
      };
    };

    const candidates: RawSpotifyCandidate[] = [];
    for (const item of data.tracks?.items ?? []) {
      const trackId = item.id;
      const title = item.name;
      const artistNames = item.artists?.map((a) => a.name).filter(Boolean).join(", ");
      if (!trackId || !title || !artistNames) continue;
      candidates.push({
        trackId,
        title,
        description: artistNames,
        albumImageUrl: item.album?.images?.[0]?.url,
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

async function fetchSpotifyRelated(
  trackId: string,
  origin: { title: string; description?: string },
): Promise<RelatedSpotifyTrack[] | null> {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  const track = await fetchSpotifyTrack(trackId, token);
  if (!track) return null;

  const candidates = (await searchSpotifySameArtist(track.artistName, token)).filter(
    (c) => c.trackId !== trackId,
  );
  if (candidates.length === 0) return null;

  const ranked = await rankRelatedCandidates(
    { title: origin.title, description: origin.description ?? track.artistName },
    candidates,
    MAX_RESULTS,
  );
  return ranked.map(({ trackId: id, title, description, albumImageUrl }) => ({
    trackId: id,
    title,
    artistNames: description,
    albumImageUrl,
  }));
}

// Podcast episodes are a different Spotify object from tracks — no "artist," so the
// same-artist search above doesn't apply. The equivalent signal here is the episode's own
// show: GET /shows/{id}/episodes returns the show's other episodes (title, description,
// release date), the direct analog of the "same-channel"/"same-blog" pattern used elsewhere.

interface RawSpotifyEpisodeCandidate {
  episodeId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  publishedAt?: string;
}

async function fetchSpotifyEpisode(
  episodeId: string,
  token: string,
): Promise<{ name: string; showId: string; showName: string } | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.spotify.com/v1/episodes/${encodeURIComponent(episodeId)}?market=US`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { name?: string; show?: { id?: string; name?: string } };
    if (!data.name || !data.show?.id || !data.show?.name) return null;
    return { name: data.name, showId: data.show.id, showName: data.show.name };
  } catch {
    return null;
  }
}

async function searchSpotifyShowEpisodes(
  showId: string,
  token: string,
): Promise<RawSpotifyEpisodeCandidate[]> {
  try {
    const url = `https://api.spotify.com/v1/shows/${encodeURIComponent(showId)}/episodes?limit=10&market=US`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      // Spotify's show/episodes endpoint can include literal `null` entries for episodes
      // that aren't available (confirmed live) — items must be treated as nullable.
      items?: ({
        id?: string;
        name?: string;
        description?: string;
        release_date?: string;
        images?: { url?: string }[];
      } | null)[];
    };

    const candidates: RawSpotifyEpisodeCandidate[] = [];
    for (const item of data.items ?? []) {
      if (!item) continue;
      const episodeId = item.id;
      const title = item.name;
      if (!episodeId || !title) continue;
      candidates.push({
        episodeId,
        title,
        description: item.description,
        imageUrl: item.images?.[0]?.url,
        publishedAt: item.release_date,
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

async function fetchSpotifyEpisodeRelated(
  episodeId: string,
  origin: { title: string; description?: string },
): Promise<RelatedSpotifyEpisode[] | null> {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  const episode = await fetchSpotifyEpisode(episodeId, token);
  if (!episode) return null;

  const candidates = (await searchSpotifyShowEpisodes(episode.showId, token)).filter(
    (c) => c.episodeId !== episodeId,
  );
  if (candidates.length === 0) return null;

  const ranked = await rankRelatedCandidates(
    { title: origin.title, description: origin.description ?? episode.showName },
    candidates,
    MAX_RESULTS,
  );
  return ranked.map(({ episodeId: id, title, imageUrl }) => ({
    episodeId: id,
    title,
    showName: episode.showName,
    imageUrl,
  }));
}

/** Parses "{Artist} · {Title} · Song · {Year}" (Spotify's own OG description shape, already
 *  captured at save-time by the generic OG scraper) to build a real artist-scoped search link. */
function buildSpotifyFallbackLink(description: string | null | undefined): { url: string; label: string } | null {
  const artist = description?.split("·")[0]?.trim();
  if (!artist) return null;
  return {
    url: `https://open.spotify.com/search/${encodeURIComponent(artist)}`,
    label: `Search Spotify for more from ${artist}`,
  };
}

// --- RSS/Atom same-source discovery -----------------------------------------------------
// Free, keyless "more from this source": look for a feed advertised on the spark's page
// (or at a well-known path), parse it with hand-rolled regex (RSS/Atom's item/entry shape
// is regular enough not to need an XML dependency), then rank entries against the spark's
// own title/description with the local TF-cosine scorer in related-content-scoring.ts.

interface RawFeedEntry {
  title: string;
  link: string;
  description?: string;
  publishedAt?: string;
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim();
}

function stripCdata(value: string): string {
  const match = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return match ? match[1] : value;
}

function cleanFeedText(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const text = decodeHtmlEntities(stripCdata(raw))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 300) : undefined;
}

function extractAtomLink(block: string): string | undefined {
  const linkTags = block.match(/<link\b[^>]*\/?>/gi) ?? [];
  for (const tag of linkTags) {
    if (/rel=["']alternate["']/i.test(tag) || !/rel=/i.test(tag)) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch?.[1]) return hrefMatch[1];
    }
  }
  return undefined;
}

function parseFeedItems(xml: string): RawFeedEntry[] {
  const isAtom = /<feed\b/i.test(xml) && !/<rss\b/i.test(xml);
  const entryTag = isAtom ? "entry" : "item";
  const entryRegex = new RegExp(`<${entryTag}\\b[\\s\\S]*?<\\/${entryTag}>`, "gi");
  const blocks = xml.match(entryRegex) ?? [];

  const entries: RawFeedEntry[] = [];
  for (const block of blocks) {
    const rawTitle = extractTag(block, "title");
    const rawLink = isAtom ? extractAtomLink(block) : extractTag(block, "link");
    if (!rawTitle || !rawLink) continue;
    const title = cleanFeedText(rawTitle);
    if (!title) continue;
    entries.push({
      title,
      link: stripCdata(rawLink).trim(),
      description: cleanFeedText(extractTag(block, isAtom ? "summary" : "description")),
      publishedAt: extractTag(block, isAtom ? "updated" : "pubDate") ?? extractTag(block, "published"),
    });
  }
  return entries;
}

function extractFeedHref(html: string): string | undefined {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    if (!/rel=["']alternate["']/i.test(tag)) continue;
    if (!/type=["']application\/(rss|atom)\+xml["']/i.test(tag)) continue;
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (hrefMatch?.[1]) return decodeHtmlEntities(hrefMatch[1]);
  }
  return undefined;
}

async function tryFetchFeed(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const text = await readBounded(res);
    return /<(rss|feed)\b/i.test(text) ? text : null;
  } catch {
    return null;
  }
}

interface FeedFetchResult {
  xml: string;
  /** The spark's page URL after following redirects — e.g. Substack's share-link format
   *  (open.substack.com/pub/{name}/p/{slug}) resolves to the canonical {name}.substack.com
   *  URL. Callers use this (not the originally-saved URL) to recognize the spark's own
   *  article among the feed entries, which are always given in canonical form. */
  resolvedPageUrl: URL;
}

async function fetchFeedXml(pageUrl: URL): Promise<FeedFetchResult | null> {
  // Resolve relative hrefs and well-known feed paths against the *redirect-resolved* host
  // (res.url), not the original pageUrl — share links like Substack's `open.substack.com/pub/
  // {name}/p/{slug}` 302-redirect to the real `{name}.substack.com` host, and a feed href of
  // "/feed" needs to resolve against that real host, not the share-link host.
  let resolvedPageUrl = pageUrl;
  try {
    const res = await fetchWithTimeout(pageUrl.toString(), {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      try {
        resolvedPageUrl = new URL(res.url);
      } catch {
        // keep the original pageUrl
      }
      const html = await readBounded(res);
      const href = extractFeedHref(html);
      if (href) {
        try {
          const resolved = assertPublicHttpUrl(new URL(href, resolvedPageUrl).toString());
          const xml = await tryFetchFeed(resolved.toString());
          if (xml) return { xml, resolvedPageUrl };
        } catch {
          // fall through to path probing
        }
      }
    }
  } catch {
    // fall through to path probing
  }

  const probeUrls = FEED_PATHS.map((path) => `${resolvedPageUrl.protocol}//${resolvedPageUrl.host}${path}`);
  const results = await Promise.allSettled(probeUrls.map(tryFetchFeed));
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) return { xml: result.value, resolvedPageUrl };
  }
  return null;
}

// Query strings on article/post URLs are essentially always tracking/attribution noise
// (utm_*, Substack's "r" and "triedRedirect", fbclid, etc.) rather than part of the content's
// identity — without dropping them, a spark saved from a shared link (which almost always
// carries some) would never match its own canonical feed entry, and would show up as a
// "related" suggestion for itself.
function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

async function fetchRelatedFeedItems(spark: {
  url: string;
  title: string;
  description?: string | null;
  domain?: string | null;
}): Promise<RelatedFeedItem[] | null> {
  let pageUrl: URL;
  try {
    pageUrl = assertPublicHttpUrl(spark.url);
  } catch {
    return null;
  }

  const feedResult = await fetchFeedXml(pageUrl);
  if (!feedResult) return null;
  const { xml, resolvedPageUrl } = feedResult;

  const entries = parseFeedItems(xml);
  if (entries.length === 0) return null;

  const sourceLabel = spark.domain ?? resolvedPageUrl.hostname.replace(/^www\./, "");
  // Compare against the redirect-resolved URL, not the raw saved spark.url — a spark saved
  // from a share-link (e.g. Substack's open.substack.com format) never literally matches its
  // own canonical feed entry otherwise, and would show up as a suggestion for itself.
  const normalizedSparkUrl = normalizeUrl(resolvedPageUrl.toString());
  const existingUrls = new Set(
    (
      await prisma.spark.findMany({
        where: { userId: LOCAL_USER_ID, url: { not: null } },
        select: { url: true },
      })
    ).map((row) => normalizeUrl(row.url!)),
  );

  const candidates: RelatedFeedItem[] = [];
  for (const entry of entries) {
    let resolvedUrl: URL;
    try {
      resolvedUrl = assertPublicHttpUrl(new URL(entry.link, resolvedPageUrl).toString());
    } catch {
      continue;
    }
    const normalized = normalizeUrl(resolvedUrl.toString());
    if (normalized === normalizedSparkUrl || existingUrls.has(normalized)) continue;
    candidates.push({
      url: resolvedUrl.toString(),
      title: entry.title,
      description: entry.description,
      sourceLabel,
      publishedAt: entry.publishedAt,
    });
  }
  if (candidates.length === 0) return null;

  return rankRelatedCandidates(
    { title: spark.title, description: spark.description ?? undefined },
    candidates,
    MAX_RESULTS,
  );
}

export async function getRelatedContent(
  spark: Pick<Spark, "type" | "url" | "title" | "description" | "provider" | "domain">,
): Promise<RelatedContentResult> {
  if ((spark.type !== "url" && spark.type !== "embed") || !spark.title?.trim() || !spark.url) {
    return { kind: "none" };
  }

  if (spark.provider === "youtube") {
    const excludeId = spark.url ? extractYoutubeVideoId(spark.url) : null;
    const metadata = excludeId ? await fetchYoutubeVideoMetadata(excludeId) : null;
    const videos = await fetchYoutubeRelated(
      { title: spark.title, description: spark.description ?? undefined },
      excludeId,
      metadata,
    );
    if (videos && videos.length > 0) return { kind: "youtube", videos };
    return { kind: "search-link", ...buildSearchLink("youtube", spark.title) };
  }

  if (spark.domain?.includes("spotify.com")) {
    const spotifyId = extractSpotifyId(spark.url);
    const origin = { title: spark.title, description: spark.description ?? undefined };

    if (spotifyId?.type === "track") {
      const tracks = await fetchSpotifyRelated(spotifyId.id, origin);
      if (tracks && tracks.length > 0) return { kind: "spotify", tracks };
    } else if (spotifyId?.type === "episode") {
      const episodes = await fetchSpotifyEpisodeRelated(spotifyId.id, origin);
      if (episodes && episodes.length > 0) return { kind: "spotify-episode", episodes };
    }

    const fallback = buildSpotifyFallbackLink(spark.description);
    return { kind: "search-link", ...(fallback ?? buildSearchLink(spark.domain, spark.title)) };
  }

  if (spark.url) {
    const items = await fetchRelatedFeedItems({
      url: spark.url,
      title: spark.title,
      description: spark.description,
      domain: spark.domain,
    });
    if (items && items.length > 0) return { kind: "feed", items };
  }

  if (spark.domain) return { kind: "search-link", ...buildSearchLink(spark.domain, spark.title) };
  return { kind: "none" };
}
