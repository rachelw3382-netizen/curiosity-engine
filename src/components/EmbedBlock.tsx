/**
 * Renders a user-pasted embed snippet (Spotify/YouTube/SoundCloud iframe embed
 * codes, etc.) as-is. Local single-user tool — same trust model as InstagramEmbed:
 * the only person who can plant markup here is the user, in their own instance.
 */
export function EmbedBlock({
  html,
  width,
  height,
}: {
  html: string;
  width?: number | null;
  height?: number | null;
}) {
  if (width && height) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
        style={{ aspectRatio: `${width} / ${height}` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className="w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 [&_iframe]:block [&_iframe]:w-full [&_iframe]:border-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
