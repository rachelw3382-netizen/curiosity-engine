import { sourceName } from "@/lib/source-name";
import type { Spark } from "@/generated/prisma/client";

const tagClass =
  "rounded-full bg-black/60 px-2 py-0.5 text-[0.6rem] font-medium text-white backdrop-blur";

/**
 * The small top-left tab naming where a spark came from ("YouTube", "Substack", "Spotify"…).
 * `overlay` pins it over the corner of the card's image; otherwise it sits inline at the top left.
 */
export function SourceTag({
  spark,
  overlay = false,
  className = "",
}: {
  spark: Pick<Spark, "provider" | "domain" | "url">;
  overlay?: boolean;
  className?: string;
}) {
  const name = sourceName(spark);
  if (!name) return null;
  return (
    <span
      className={`${tagClass} ${overlay ? "absolute left-2 top-2" : "inline-block"} ${className}`}
    >
      {name}
    </span>
  );
}
