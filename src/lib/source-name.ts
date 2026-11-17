/** Friendly names for sites people commonly save from. Anything else is derived from its domain. */
const KNOWN_SOURCES: [RegExp, string][] = [
  [/(^|\.)substack\.com$/, "Substack"],
  [/(^|\.)spotify\.com$/, "Spotify"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)vimeo\.com$/, "Vimeo"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)soundcloud\.com$/, "SoundCloud"],
  [/^podcasts\.apple\.com$/, "Apple Podcasts"],
  [/(^|\.)medium\.com$/, "Medium"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)twitter\.com$|(^|\.)x\.com$/, "X"],
  [/(^|\.)pinterest\.[a-z.]+$/, "Pinterest"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)notion\.(so|site)$/, "Notion"],
  [/(^|\.)wikipedia\.org$/, "Wikipedia"],
  [/(^|\.)twitch\.tv$/, "Twitch"],
  [/(^|\.)goodreads\.com$/, "Goodreads"],
  [/(^|\.)letterboxd\.com$/, "Letterboxd"],
  [/(^|\.)bsky\.app$/, "Bluesky"],
];

const PROVIDER_LABELS: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  instagram: "Instagram",
};

function hostnameOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const withScheme = /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The short app/site name shown in the top-left tag of every spark card —
 * "YouTube", "Substack", "Spotify", "Nytimes"… — instead of a raw link.
 * Returns null for notes, which have no source.
 */
export function sourceName(spark: {
  provider?: string | null;
  domain?: string | null;
  url?: string | null;
}): string | null {
  const fromProvider = spark.provider ? PROVIDER_LABELS[spark.provider] : undefined;
  if (fromProvider) return fromProvider;

  const host = hostFor(spark);
  if (!host) return null;

  for (const [pattern, label] of KNOWN_SOURCES) {
    if (pattern.test(host)) return label;
  }

  // Generic: the registrable name ("blog.example.co.uk" → "Example").
  const parts = host.split(".");
  let name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  if (parts.length >= 3 && ["co", "com", "org", "net", "ac", "gov"].includes(name)) {
    name = parts[parts.length - 3];
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function hostFor(spark: { domain?: string | null; url?: string | null }) {
  // `domain` is stored for every link; fall back to the URL itself if it's missing.
  // (A bare provider word like "youtube" is a domain-less label — treat it as no host.)
  const fromDomain = spark.domain?.includes(".") ? hostnameOf(spark.domain) : null;
  return fromDomain ?? hostnameOf(spark.url);
}
