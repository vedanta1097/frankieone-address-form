import { useFormContext } from "react-hook-form";
import type { CountryConfig } from "shared";

interface Props {
  config: CountryConfig;
}

export default function DynamicFieldRenderer({ config }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<Record<string, string>>();

  return (
    <div className="space-y-4">
      {config.fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === "select" ? (
            <select
              {...register(field.name)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm bg-white shadow-sm outline-none transition
                ${
                  errors[field.name]
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                }`}
            >
              <option value="">Select {field.label}…</option>
              {field.options!.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              {...register(field.name)}
              placeholder={
                field.required
                  ? `Enter ${field.label.toLowerCase()}`
                  : "Optional"
              }
              className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm outline-none transition
                ${
                  errors[field.name]
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                }`}
            />
          )}

          {errors[field.name] && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <svg
                className="w-3 h-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-9a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors[field.name]?.message as string}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
