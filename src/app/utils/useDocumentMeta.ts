import { useEffect } from "react";

// Per-page <title> + description for SPA routes, no dependency (React 18 doesn't
// hoist <title>/<meta> natively — that's React 19). Social crawlers (WhatsApp,
// Facebook) don't run JS, so these client-set tags only help Google, which does
// render JS; the static defaults in index.html are what drive link previews.
// ponytail: per-cafe social preview images would need SSR/prerender — out of scope.

const DEFAULT_TITLE = "GameSpot — Book Gaming Cafes & PCs by the Hour";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useDocumentMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title || DEFAULT_TITLE;
    setMeta("property", "og:title", title || DEFAULT_TITLE);
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }
  }, [title, description]);
}
