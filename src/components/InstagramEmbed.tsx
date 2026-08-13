"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const EMBED_SCRIPT_SRC = "https://www.instagram.com/embed.js";

export function InstagramEmbed({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function process() {
      window.instgrm?.Embeds.process();
    }

    if (window.instgrm) {
      process();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${EMBED_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", process, { once: true });
      return () => existing.removeEventListener("load", process);
    }

    const script = document.createElement("script");
    script.src = EMBED_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", process, { once: true });
    document.body.appendChild(script);
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="flex justify-center overflow-hidden rounded-2xl"
      // Pasted directly by the user from Instagram's own "Embed" feature — see CaptureForm.
      // This is a local single-user tool; the risk profile here is the user pasting into
      // their own instance, not a multi-tenant XSS surface.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
