/** A spark's saved notes: a "Notes:" label with the text on the line below. */
export function SparkNotes({
  notes,
  size = "card",
}: {
  notes: string | null | undefined;
  size?: "card" | "page";
}) {
  if (!notes?.trim()) return null;
  const isPage = size === "page";
  return (
    <div className={isPage ? "" : "mt-2"}>
      <p
        className={`text-heading font-semibold text-zinc-900 dark:text-zinc-50 ${
          isPage ? "text-sm" : "text-[0.7rem]"
        }`}
      >
        Notes:
      </p>
      <p
        className={`text-body whitespace-pre-wrap text-zinc-500 dark:text-zinc-400 ${
          isPage ? "mt-0.5 text-sm leading-6" : "text-[0.7rem]"
        }`}
      >
        {notes}
      </p>
    </div>
  );
}
