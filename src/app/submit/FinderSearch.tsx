"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  slug: string;
  name: string;
}

/**
 * Association search with a type-ahead dropdown. Progressive enhancement:
 * it's a plain GET form, so pressing Enter (or JS being unavailable) still
 * hits /submit?q=... and renders the server-side results list.
 */
export default function FinderSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced fetch as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/hoa-search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        setSuggestions(data.results);
        setOpen(true);
        setHighlighted(-1);
      } catch {
        // aborted or network hiccup — keep whatever we had
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(s: Suggestion) {
    setOpen(false);
    router.push(`/submit/${s.slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      choose(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoFocus
          autoComplete="off"
          placeholder="Association name"
          aria-label="Association name"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
          aria-controls="hoa-suggestions"
          className="input"
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id="hoa-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.slug} role="option" aria-selected={i === highlighted}>
              <button
                type="button"
                onClick={() => choose(s)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                  i === highlighted ? "bg-surface" : "bg-white"
                }`}
              >
                <span className="font-medium text-ink">{s.name}</span>
                <span aria-hidden className="text-brand-700">
                  &rarr;
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
