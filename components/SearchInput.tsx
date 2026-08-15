"use client";

import { FormEvent, useState } from "react";

type Props = {
  variant: "hero" | "bar";
  onSubmitQuery: (query: string) => void;
};

export function SearchInput({ variant, onSubmitQuery }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    onSubmitQuery(query);
    setValue("");
  }

  return (
    <form className={`search-pill ${variant}`} onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        spellCheck={false}
        autoFocus={variant === "hero"}
        placeholder={
          variant === "hero"
            ? "what do you want scouted?"
            : "search again to grow the map…"
        }
        aria-label="Search query"
        onChange={(event) => setValue(event.target.value)}
      />
      <button className="pill-go" type="submit" aria-label="Search">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3.5 10h12M11 5.5 16.5 10 11 14.5" />
        </svg>
      </button>
    </form>
  );
}
