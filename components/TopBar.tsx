"use client";

import Image from "next/image";
import { SearchInput } from "@/components/SearchInput";
import type { SearchRecord } from "@/hooks/useScoutSession";
import type { GraphLayout } from "@/lib/constellation";

type Props = {
  searches: SearchRecord[];
  layout: GraphLayout;
  onLayoutChange: (layout: GraphLayout) => void;
  onSearch: (query: string) => void;
  onHome: () => void;
};

export function TopBar({ searches, layout, onLayoutChange, onSearch, onHome }: Props) {
  const streaming = searches.some((s) => s.status === "streaming");
  const status = streaming
    ? "scouts out — agents resolving"
    : `${searches.length} ${searches.length === 1 ? "search" : "searches"} on the map`;

  return (
    <header className="topbar">
      <button
        type="button"
        className="brand"
        onClick={onHome}
        aria-label="Back to the Scout homepage"
      >
        <Image src="/scout-logo.png" alt="Scout" width={34} height={34} />
        <span className="brand-name">scout</span>
      </button>
      <SearchInput variant="bar" onSubmitQuery={onSearch} />
      <div className="layout-toggle" role="group" aria-label="Graph grouping">
        <button
          type="button"
          className={layout === "source" ? "active" : ""}
          onClick={() => onLayoutChange("source")}
        >
          by source
        </button>
        <button
          type="button"
          className={layout === "angle" ? "active" : ""}
          onClick={() => onLayoutChange("angle")}
        >
          by angle
        </button>
      </div>
      <p className={`topbar-status${streaming ? " live" : ""}`}>{status}</p>
    </header>
  );
}
