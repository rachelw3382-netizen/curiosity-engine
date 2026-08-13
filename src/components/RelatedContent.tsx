"use client";

import { useState, useTransition } from "react";
import { createSpark } from "@/lib/actions";
import type {
  RelatedContentResult,
  RelatedFeedItem,
  RelatedSpotifyEpisode,
  RelatedSpotifyTrack,
  RelatedYoutubeVideo,
} from "@/lib/related-content";

function SaveButton({ status, onSave }: { status: "idle" | "pending" | "saved"; onSave: () => void }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={status !== "idle"}
      className="mt-1 w-fit rounded-full border border-amber-300 bg-amber-50/60 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100/60 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
    >
      {status === "saved" ? "Saved" : status === "pending" ? "Saving…" : "+ Save"}
    </button>
  );
}

function VideoCard({ video }: { video: RelatedYoutubeVideo }) {
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  const [, startTransition] = useTransition();
  const watchUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

  function handleSave() {
    setStatus("pending");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", "url");
      formData.set("url", watchUrl);
      await createSpark({ error: null }, formData);
      setStatus("saved");
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08]">
      <a href={watchUrl} target="_blank" rel="noreferrer" className="block bg-zinc-100 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnailUrl} alt="" className="w-full" />
      </a>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-heading line-clamp-2 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          {video.title}
        </h3>
        <p className="text-body text-[0.7rem] text-zinc-500 dark:text-zinc-400">{video.channelTitle}</p>
        <SaveButton status={status} onSave={handleSave} />
      </div>
    </div>
  );
}

function FeedItemCard({ item }: { item: RelatedFeedItem }) {
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  const [, startTransition] = useTransition();

  function handleSave() {
    setStatus("pending");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", "url");
      formData.set("url", item.url);
      await createSpark({ error: null }, formData);
      setStatus("saved");
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08]">
      <a href={item.url} target="_blank" rel="noreferrer" className="flex flex-1 flex-col gap-1">
        <h3 className="text-heading line-clamp-2 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          {item.title}
        </h3>
        <p className="text-body text-[0.7rem] text-zinc-500 dark:text-zinc-400">{item.sourceLabel}</p>
      </a>
      <SaveButton status={status} onSave={handleSave} />
    </div>
  );
}

function SpotifyTrackCard({ track }: { track: RelatedSpotifyTrack }) {
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  const [, startTransition] = useTransition();
  const trackUrl = `https://open.spotify.com/track/${track.trackId}`;

  function handleSave() {
    setStatus("pending");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", "url");
      formData.set("url", trackUrl);
      await createSpark({ error: null }, formData);
      setStatus("saved");
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08]">
      <a href={trackUrl} target="_blank" rel="noreferrer" className="block bg-zinc-100 dark:bg-zinc-900">
        {track.albumImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.albumImageUrl} alt="" className="w-full" />
        ) : null}
      </a>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-heading line-clamp-2 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          {track.title}
        </h3>
        <p className="text-body text-[0.7rem] text-zinc-500 dark:text-zinc-400">{track.artistNames}</p>
        <SaveButton status={status} onSave={handleSave} />
      </div>
    </div>
  );
}

function SpotifyEpisodeCard({ episode }: { episode: RelatedSpotifyEpisode }) {
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  const [, startTransition] = useTransition();
  const episodeUrl = `https://open.spotify.com/episode/${episode.episodeId}`;

  function handleSave() {
    setStatus("pending");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", "url");
      formData.set("url", episodeUrl);
      await createSpark({ error: null }, formData);
      setStatus("saved");
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[.04] dark:bg-white/[.04] dark:ring-white/[.08]">
      <a href={episodeUrl} target="_blank" rel="noreferrer" className="block bg-zinc-100 dark:bg-zinc-900">
        {episode.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={episode.imageUrl} alt="" className="w-full" />
        ) : null}
      </a>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-heading line-clamp-2 text-xs font-semibold text-zinc-900 dark:text-zinc-50">
          {episode.title}
        </h3>
        <p className="text-body text-[0.7rem] text-zinc-500 dark:text-zinc-400">{episode.showName}</p>
        <SaveButton status={status} onSave={handleSave} />
      </div>
    </div>
  );
}

export function RelatedContent({ content }: { content: RelatedContentResult }) {
  if (content.kind === "none") return null;

  return (
    <section className="flex flex-col gap-3 border-t border-black/[.06] pt-8 dark:border-white/[.08]">
      <h2 className="text-heading text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        More like this
      </h2>

      {content.kind === "search-link" ? (
        <a
          href={content.url}
          target="_blank"
          rel="noreferrer"
          className="text-body w-fit text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {content.label} &rarr;
        </a>
      ) : content.kind === "feed" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {content.items.map((item) => (
            <FeedItemCard key={item.url} item={item} />
          ))}
        </div>
      ) : content.kind === "spotify" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {content.tracks.map((track) => (
            <SpotifyTrackCard key={track.trackId} track={track} />
          ))}
        </div>
      ) : content.kind === "spotify-episode" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {content.episodes.map((episode) => (
            <SpotifyEpisodeCard key={episode.episodeId} episode={episode} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {content.videos.map((video) => (
            <VideoCard key={video.videoId} video={video} />
          ))}
        </div>
      )}
    </section>
  );
}
