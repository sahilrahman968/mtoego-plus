"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AnalyticsNavItem {
  id: string;
  label: string;
}

// The admin shell scrolls inside <main>, not the document, so scroll-spy reads
// that container. Clicks scroll programmatically instead of jumping via the
// hash, which keeps the URL (and its period query) untouched.
const SCROLL_CONTAINER_ID = "admin-main";
const ACTIVE_OFFSET = 140;

export default function AnalyticsNav({ items }: { items: AnalyticsNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const frame = useRef<number | null>(null);

  const syncActive = useCallback(() => {
    let current = items[0]?.id ?? "";
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top - ACTIVE_OFFSET <= 0) {
        current = item.id;
      }
    }
    setActive(current);
  }, [items]);

  useEffect(() => {
    const scroller = document.getElementById(SCROLL_CONTAINER_ID) ?? window;

    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        syncActive();
      });
    };

    // Seed the initial state through the same frame-scheduled path.
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [syncActive]);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
    el.focus({ preventScroll: true });
    setActive(id);
  };

  return (
    <nav
      aria-label="Analytics sections"
      className="sticky top-0 z-20 -mx-4 mb-5 border-b border-admin-line bg-admin-canvas/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <ul className="flex gap-1 overflow-x-auto py-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  jumpTo(item.id);
                }}
                className={`inline-flex min-h-8 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus ${
                  isActive
                    ? "bg-admin-subtle text-admin-heading"
                    : "text-admin-muted hover:bg-admin-hover hover:text-admin-heading"
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
