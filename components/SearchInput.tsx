"use client";

import { FormEvent, useState } from "react";

type Props = {
  disabled?: boolean;
  defaultQuery?: string;
  onSubmitQuery: (query: string) => void;
};

export function SearchInput({
  disabled,
  defaultQuery = "is fusion power actually close?",
  onSubmitQuery,
}: Props) {
  const [value, setValue] = useState(defaultQuery);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    onSubmitQuery(query);
  }

  return (
    <form className="search-row" onSubmit={handleSubmit}>
      <div className="search-field">
        <label htmlFor="q">Query</label>
        <input
          id="q"
          type="text"
          value={value}
          spellCheck={false}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <button className="go-btn" type="submit" disabled={disabled}>
        Search
      </button>
    </form>
  );
}
