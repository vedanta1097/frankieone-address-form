import { useQuery } from "@tanstack/react-query";
import { COUNTRIES } from "shared";
import { fetchAddresses } from "../api";
import type { AddressRecord } from "shared";

function AddressCard({ address }: { address: AddressRecord }) {
  const country = COUNTRIES[address.country_code];
  const fields = address.fields;

  // Build a human-readable summary from the fields
  const parts = Object.values(fields).filter((v) => v && v.trim().length > 0);
  const summary = parts.join(", ");

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-200 bg-white transition">
      <span className="text-2xl leading-none mt-0.5 flex-shrink-0">
        {country?.flag ?? "🌍"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {address.country_code}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-700" title={summary}>
          {summary || "—"}
        </p>
      </div>
    </div>
  );
}

export default function SavedAddresses() {
  const {
    data: addresses = [],
    isLoading,
    isError,
  } = useQuery<AddressRecord[]>({
    queryKey: ["addresses"],
    queryFn: () => fetchAddresses(),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Saved Addresses
        </h2>
        {addresses.length > 0 && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {addresses.length}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <svg
            className="w-5 h-5 animate-spin mr-2"
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
          Loading…
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          Failed to load addresses. Is the server running?
        </p>
      )}

      {!isLoading && !isError && addresses.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <svg
            className="w-10 h-10 mx-auto mb-3 opacity-40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
            />
          </svg>
          <p className="text-sm">No addresses saved yet.</p>
          <p className="text-xs mt-1">Submit the form to get started.</p>
        </div>
      )}

      {!isLoading && !isError && addresses.length > 0 && (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {addresses.map((addr) => (
            <AddressCard key={addr.id} address={addr} />
          ))}
        </div>
      )}
    </div>
  );
}
