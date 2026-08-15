"use client";

import { GraphCanvas } from "@/components/GraphCanvas";
import { SearchInput } from "@/components/SearchInput";
import { useSearchStream } from "@/hooks/useSearchStream";

export default function Home() {
  const stream = useSearchStream();

  return (
    <main className="page">
      <header>
        <div>
          <h1>Scout</h1>
          <p className="kicker">six agents, one graph</p>
        </div>
        <p className="tagline">
          not a list of blue links — a graph that grows while you watch.
        </p>
      </header>

      <div className="controls">
        <SearchInput onSubmitQuery={stream.search} />
        <p className="stream-status">
          {stream.status === "streaming"
            ? "agents resolving"
            : stream.status === "done"
              ? "query snapshot ready"
              : stream.status === "error"
                ? stream.errorMessage
                : "enter a query to begin"}
        </p>
      </div>

      <GraphCanvas
        query={stream.query}
        center={stream.center}
        branches={stream.branches}
        status={stream.status}
      />

      <p className="foot-note">
        <span>live stream from /api/search · layout toggle lands in phase 8</span>
        <span>branch nodes fade in as each agent resolves</span>
      </p>
    </main>
  );
}
