import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { COUNTRIES, buildSchema } from "shared";
import { saveAddress } from "../api";
import CountrySelector from "./CountrySelector";
import AutocompleteInput from "./AutocompleteInput";
import DynamicFieldRenderer from "./DynamicFieldRenderer";

type Mode = "autocomplete" | "manual";

// ManualForm is a separate component so the key prop forces full remount
// (and therefore re-initialises useForm) when the country changes.
interface ManualFormProps {
  countryCode: string;
  defaultValues: Record<string, string>;
  onBack: () => void;
  onSuccess: () => void;
}

function ManualForm({
  countryCode,
  defaultValues,
  onBack,
  onSuccess,
}: ManualFormProps) {
  const config = COUNTRIES[countryCode];
  const schema = buildSchema(countryCode);
  const queryClient = useQueryClient();

  const emptyValues = Object.fromEntries(
    config.fields.map((f) => [f.name, ""]),
  );
  const methods = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyValues, ...defaultValues },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    setError,
  } = methods;

  const mutation = useMutation({
    mutationFn: saveAddress,
    onSuccess: () => {
      // Invalidate saved addresses list so it refetches automatically
      void queryClient.invalidateQueries({ queryKey: ["addresses"] });
      onSuccess();
    },
    onError: (err: Error & { errors?: Record<string, string> }) => {
      if (err.errors) {
        for (const [field, message] of Object.entries(err.errors)) {
          setError(field as string, { message });
        }
      }
    },
  });

  function onSubmit(fields: Record<string, string>) {
    mutation.mutate({ country_code: countryCode, fields });
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <DynamicFieldRenderer config={config} />

        {mutation.isError && !Object.keys(methods.formState.errors).length && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Something went wrong. Please try again.
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Search
          </button>

          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            {mutation.isPending && (
              <svg
                className="w-4 h-4 animate-spin"
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
            )}
            Save Address
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Main AddressForm shell — manages country selection and mode
// ─────────────────────────────────────────────────────────────
export default function AddressForm() {
  const [countryCode, setCountryCode] = useState("USA");
  const [mode, setMode] = useState<Mode>("autocomplete");
  const [prefilledFields, setPrefilledFields] = useState<
    Record<string, string>
  >({});
  const [successKey, setSuccessKey] = useState(0); // bump to show success banner
  const [showSuccess, setShowSuccess] = useState(false);

  function handleCountryChange(code: string) {
    setCountryCode(code);
    setMode("autocomplete");
    setPrefilledFields({});
  }

  function handlePlaceSelected(fields: Record<string, string>) {
    setPrefilledFields(fields);
    setMode("manual");
  }

  function handleSuccess() {
    setMode("autocomplete");
    setPrefilledFields({});
    setSuccessKey((k) => k + 1);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3500);
  }

  const country = COUNTRIES[countryCode];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Enter Address</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Select a country then search or manually enter an address.
        </p>
      </div>

      {showSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Address saved successfully!
        </div>
      )}

      <CountrySelector value={countryCode} onChange={handleCountryChange} />

      <div className="border-t border-gray-100 pt-4 space-y-4">
        {mode === "autocomplete" ? (
          <>
            <AutocompleteInput
              countryCode={countryCode}
              onPlaceSelected={handlePlaceSelected}
            />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="w-full text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg py-2.5 transition flex items-center justify-center gap-2"
            >
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
                  d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Manually Edit — {country.flag} {country.name}
            </button>
          </>
        ) : (
          // key forces ManualForm to remount on country change, re-initialising useForm
          <ManualForm
            key={`${countryCode}-${successKey}`}
            countryCode={countryCode}
            defaultValues={prefilledFields}
            onBack={() => {
              setMode("autocomplete");
              setPrefilledFields({});
            }}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}
