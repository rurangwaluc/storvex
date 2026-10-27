"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./SearchableCountryPicker.css";

function countryFlag(code) {
  const normalized = String(code || "").trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) return "🌐";

  return String.fromCodePoint(
    ...[...normalized].map(
      (character) => 127397 + character.charCodeAt(0)
    )
  );
}

export default function SearchableCountryPicker({
  markets,
  value,
  onChange,
  disabled = false,
  loading = false,
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const listId = `svx-country-${useId().replace(/:/g, "")}`;
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = markets.find((market) => market.countryCode === value) || null;

  useEffect(() => {
    setQuery(selected?.countryName || "");
    setSearching(false);
    if (inputRef.current) inputRef.current.setCustomValidity("");
  }, [selected?.countryCode, selected?.countryName]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const results = useMemo(() => {
    if (!searching) return markets;
    const term = query.trim().toLocaleLowerCase();
    if (!term) return markets;
    return markets.filter((market) =>
      market.countryName.toLocaleLowerCase().includes(term) ||
      market.countryCode.toLocaleLowerCase().includes(term)
    );
  }, [markets, query, searching]);

  useEffect(() => {
    if (!open) return;
    resultsRef.current?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, results]);

  function selectMarket(market) {
    onChange(market.countryCode);
    setQuery(market.countryName);
    setSearching(false);
    setActiveIndex(0);
    setOpen(false);
    if (inputRef.current) inputRef.current.setCustomValidity("");
  }

  function handleQueryChange(event) {
    setQuery(event.target.value);
    setSearching(true);
    setActiveIndex(0);
    setOpen(true);
    // A typed name is not a country selection. Prevent submitting a stale
    // previously selected country until an option is explicitly chosen.
    event.target.setCustomValidity("Select a country from the matching results.");
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      setQuery(selected?.countryName || "");
      setSearching(false);
      setOpen(false);
      event.currentTarget.setCustomValidity("");
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(event.key === "ArrowDown" ? 0 : Math.max(results.length - 1, 0));
      } else if (results.length) {
        setActiveIndex((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % results.length
            : (index - 1 + results.length) % results.length
        );
      }
      return;
    }
    if (event.key === "Enter" && open && results.length) {
      event.preventDefault();
      selectMarket(results[Math.min(activeIndex, results.length - 1)]);
    }
  }

  function openList() {
    if (disabled) return;
    setSearching(false);
    setActiveIndex(0);
    setOpen(true);
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  const optionId = (index) => `${listId}-option-${index}`;

  return (
    <div ref={wrapperRef} className={`svx-country-picker${open ? " is-open" : ""}`}>
      <div className="svx-country-picker__control">
        <span
          className="svx-country-picker__flag"
          aria-hidden="true"
        >
          {selected && !searching
            ? countryFlag(selected.countryCode)
            : "🔎"}
        </span>
        <input
          ref={inputRef}
          className="svx-country-picker__input"
          type="text"
          role="combobox"
          aria-label="Country"
          aria-autocomplete="list"
          aria-expanded={open && !disabled}
          aria-controls={listId}
          aria-activedescendant={open && results.length ? optionId(Math.min(activeIndex, results.length - 1)) : undefined}
          autoComplete="off"
          spellCheck={false}
          required
          disabled={disabled}
          placeholder={loading ? "Loading countries..." : "Search for a country"}
          value={query}
          onFocus={(event) => {
            setOpen(true);
            setSearching(false);
            setActiveIndex(0);
            event.currentTarget.select();
          }}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="svx-country-picker__toggle"
          aria-label="Show countries"
          aria-expanded={open && !disabled}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => open ? setOpen(false) : openList()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {open && !disabled ? (
        <div ref={resultsRef} id={listId} className="svx-country-picker__results" role="listbox" aria-label="Matching countries">
          {results.length ? results.map((market, index) => (
            <button
              key={market.countryCode}
              type="button"
              role="option"
              id={optionId(index)}
              aria-selected={market.countryCode === value}
              data-highlighted={activeIndex === index ? "true" : undefined}
              className={`svx-country-picker__option${activeIndex === index ? " is-highlighted" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectMarket(market)}
            >
              <span
                className="svx-country-picker__flag"
                aria-hidden="true"
              >
                {countryFlag(market.countryCode)}
              </span>
              <span className="svx-country-picker__country-name">
                {market.countryName}
              </span>
              {market.onboardingEnabled !== true ? <span className="svx-country-picker__pending">Coming soon</span> : null}
              {market.countryCode === value ? <span className="svx-country-picker__selected" aria-label="Selected">✓</span> : null}
            </button>
          )) : (
            <div className="svx-country-picker__empty">No matching countries</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
