import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAutocompleteSuggestions, fetchPlaceDetails } from "../api";
import type { PlacePrediction } from "shared";

interface Props {
  countryCode: string;
  onPlaceSelected: (fields: Record<string, string>) => void;
}

export default function AutocompleteInput({
  countryCode,
  onPlaceSelected,
}: Props) {
  const [input, setInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 350);
    return () => clearTimeout(timer);
  }, [input]);

  // Fetch suggestions via TanStack Query (cached per input+country combination)
  const { data: suggestions = [] } = useQuery<PlacePrediction[]>({
    queryKey: ["places", "autocomplete", debouncedInput, countryCode],
    queryFn: () => fetchAutocompleteSuggestions(debouncedInput, countryCode),
    enabled: debouncedInput.length > 2,
    staleTime: 1000 * 30, // cache suggestions for 30s
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSelect(prediction: PlacePrediction) {
    setInput(prediction.description);
    setIsOpen(false);
    setLoadingDetails(true);
    try {
      const result = await fetchPlaceDetails(prediction.place_id, countryCode);
      onPlaceSelected(result.fields);
    } finally {
      setLoadingDetails(false);
    }
  }

  const showDropdown = isOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search Address
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="Start typing an address…"
          disabled={loadingDetails}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition disabled:bg-gray-50"
        />
        {loadingDetails && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="w-4 h-4 animate-spin text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </span>
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 text-gray-700 transition"
              >
                <span className="text-gray-400 mr-2">📍</span>
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!suggestions.length && debouncedInput.length > 2 && (
        <p className="mt-1.5 text-xs text-gray-400">
          No suggestions — check your Google Places API key, or use
          &quot;Manually Edit&quot; below.
        </p>
      )}
    </div>
  );
}
