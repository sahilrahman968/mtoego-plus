"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface ShowcaseTab {
  id: string;
  label: string;
  /** Thumbnail shown inside the tab chip. Falls back to the first letter. */
  imageUrl?: string;
  /** Target of the "Show All" button. The button is hidden when absent. */
  href?: string;
}

interface TabbedShowcaseProps {
  tabs: ShowcaseTab[];
  renderPanel: (tab: ShowcaseTab) => ReactNode;
  /** Controls the active tab from the parent. Omit to let the component own it. */
  activeTabId?: string;
  defaultTabId?: string;
  onTabChange?: (tab: ShowcaseTab) => void;
  showAllLabel?: (tab: ShowcaseTab) => string;
  tablistLabel?: string;
}

export default function TabbedShowcase({
  tabs,
  renderPanel,
  activeTabId,
  defaultTabId,
  onTabChange,
  showAllLabel = (tab) => `Show All ${tab.label}`,
  tablistLabel = "Categories",
}: TabbedShowcaseProps) {
  const instanceId = useId();
  const [uncontrolledId, setUncontrolledId] = useState(defaultTabId);

  const selectedId = activeTabId ?? uncontrolledId;
  const activeTab = tabs.find((tab) => tab.id === selectedId) ?? tabs[0];

  if (!activeTab) return null;

  const handleSelect = (tab: ShowcaseTab) => {
    if (activeTabId === undefined) setUncontrolledId(tab.id);
    onTabChange?.(tab);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={tablistLabel}
        className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:flex-wrap"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${instanceId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${instanceId}-panel`}
              onClick={() => handleSelect(tab)}
              className={`relative flex shrink-0 snap-start items-center gap-2 border px-2 py-1.5 transition-colors ${
                isActive
                  ? "border-primary/70 bg-primary/10 text-foreground"
                  : "border-border/70 bg-black/30 text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="relative h-7 w-7 shrink-0 overflow-hidden bg-black/60">
                {tab.imageUrl ? (
                  <Image
                    src={tab.imageUrl}
                    alt=""
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-black text-xs font-bold text-primary/70">
                    {tab.label.charAt(0)}
                  </span>
                )}
              </span>
              <span className="eyebrow-xs whitespace-nowrap">{tab.label}</span>
              {isActive && (
                <span className="absolute -inset-x-px -bottom-px h-px bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${instanceId}-panel`}
        aria-labelledby={`${instanceId}-tab-${activeTab.id}`}
        className="mt-6"
      >
        {renderPanel(activeTab)}
      </div>

      {activeTab.href && (
        <div className="mt-8 flex justify-center">
          <Link
            href={activeTab.href}
            className="btn-text inline-flex items-center gap-2 border border-border/80 bg-black/40 px-6 py-3.5 text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-white"
          >
            {showAllLabel(activeTab)}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
