import { COUNTRIES } from "shared";

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export default function CountrySelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Country
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
      >
        {Object.values(COUNTRIES).map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
