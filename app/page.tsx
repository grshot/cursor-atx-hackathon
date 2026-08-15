"use client";

import { useState } from "react";
import { Aurora } from "@/components/Aurora";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Constellation } from "@/components/Constellation";
import { Hero } from "@/components/Hero";
import { TopBar } from "@/components/TopBar";
import { useScoutSession } from "@/hooks/useScoutSession";
import type { GraphLayout } from "@/lib/constellation";

export default function Home() {
  const session = useScoutSession();
  const [layout, setLayout] = useState<GraphLayout>("source");
  const started = session.searches.length > 0;

  return (
    <main className={started ? "app mode-canvas" : "app mode-landing"}>
      <Aurora dim={started} />
      <ThemeToggle />
      {started ? (
        <>
          <TopBar
            searches={session.searches}
            layout={layout}
            onLayoutChange={setLayout}
            onSearch={session.search}
          />
          <Constellation searches={session.searches} layout={layout} />
        </>
      ) : (
        <Hero onSearch={session.search} />
      )}
    </main>
  );
}
