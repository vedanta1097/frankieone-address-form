import AddressForm from "./components/AddressForm";
import SavedAddresses from "./components/SavedAddresses";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <img
            src="/logo.webp"
            alt="FrankieOne"
            className="h-7 w-auto flex-shrink-0 sm:h-8"
          />
          <h1 className="text-sm font-medium text-gray-500 leading-snug sm:text-base sm:font-semibold sm:text-gray-900">
            Customer Onboarding — Address Collection
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <AddressForm />
          <SavedAddresses />
        </div>
      </main>
    </div>
  );
}
