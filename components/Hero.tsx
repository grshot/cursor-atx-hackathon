"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SearchInput } from "@/components/SearchInput";

type Props = {
  onSearch: (query: string) => void;
};

const QUESTION_POOL = [
  "is fusion power actually close?",
  "who is winning the humanoid robot race?",
  "what happened to lab-grown meat?",
  "are we running out of helium?",
  "is the four-day work week actually working?",
  "what's the state of vertical farming?",
  "did room-temperature superconductors go anywhere?",
  "is nuclear power making a comeback?",
  "who is actually using quantum computers?",
  "what happened to the metaverse?",
  "are psychedelics becoming real medicine?",
  "is desalination finally getting cheap?",
  "what's blocking high-speed rail in the US?",
  "are ocean cleanup projects working?",
  "is geothermal energy having a moment?",
  "what happened to supersonic passenger flight?",
  "are brain-computer interfaces safe yet?",
  "is carbon capture a real solution or a stall tactic?",
  "who is leading the space station race after the ISS?",
  "are self-driving trucks actually shipping freight?",
  "what's the latest on malaria vaccines?",
  "is the chip war reshaping global supply chains?",
  "are heat pumps winning over gas furnaces?",
  "what happened to NFTs?",
  "is anyone solving the microplastics problem?",
  "are GLP-1 drugs changing the food industry?",
  "what's the real state of AI in drug discovery?",
  "is commercial fusion investment paying off?",
  "are sodium-ion batteries ready to compete with lithium?",
  "what happened to hyperloop?",
] as const;

const FALLBACK = QUESTION_POOL.slice(0, 3) as readonly string[];

function pickThree(): string[] {
  const pool = [...QUESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function Hero({ onSearch }: Props) {
  // Random picks happen after mount (inside a rAF, keeping hydration clean) —
  // the fallback trio is only ever visible for a frame, under the chips'
  // entrance-animation delay.
  const [examples, setExamples] = useState<readonly string[]>(FALLBACK);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setExamples(pickThree()));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="hero">
      <div className="hero-inner">
        <Image
          className="hero-logo"
          src="/scout-logo.png"
          alt="Scout — a fox with a magnifying glass"
          width={108}
          height={108}
          priority
        />
        <h1 className="wordmark">scout</h1>
        <p className="hero-tag">
          ask a question. send out the scouts.
        </p>
        <SearchInput variant="hero" onSubmitQuery={onSearch} />
        <div className="hero-chips">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              className="chip"
              onClick={() => onSearch(example)}
            >
              {example}
            </button>
          ))}
        </div>
        <p className="hero-foot">
          web × x × academic · live-streamed as agents resolve
        </p>
      </div>
    </section>
  );
}
