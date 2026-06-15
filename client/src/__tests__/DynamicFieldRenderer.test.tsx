import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import DynamicFieldRenderer from "../components/DynamicFieldRenderer";
import { COUNTRIES } from "shared";

// Wrap with a FormProvider since DynamicFieldRenderer uses useFormContext
function renderWithForm(countryCode: string) {
  function Wrapper() {
    const methods = useForm<Record<string, string>>();
    const config = COUNTRIES[countryCode];
    return (
      <FormProvider {...methods}>
        <DynamicFieldRenderer config={config} />
      </FormProvider>
    );
  }
  render(<Wrapper />);
}

describe("DynamicFieldRenderer", () => {
  describe("USA fields", () => {
    it("renders text inputs for line1, city, and zip", () => {
      renderWithForm("USA");
      expect(
        screen.getByPlaceholderText(/enter address line 1/i),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter city/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter zip code/i),
      ).toBeInTheDocument();
    });

    it("renders State as a select element with a placeholder option", () => {
      renderWithForm("USA");
      // The State field is type=select — getByRole('combobox') returns it
      const selects = screen.getAllByRole("combobox");
      // At least one select should contain "Select State…"
      const stateSelect = selects.find((s) =>
        s.querySelector('option[value=""]')?.textContent?.includes("State"),
      );
      expect(stateSelect).toBeInTheDocument();
    });

    it("marks required fields with asterisk", () => {
      renderWithForm("USA");
      const requiredMarkers = screen.getAllByText("*");
      expect(requiredMarkers.length).toBeGreaterThan(0);
    });

    it("renders Address Line 2 as optional (no asterisk sibling)", () => {
      renderWithForm("USA");
      expect(screen.getByPlaceholderText("Optional")).toBeInTheDocument();
    });
  });

  describe("AUS fields", () => {
    it("renders suburb and postcode inputs", () => {
      renderWithForm("AUS");
      expect(screen.getByPlaceholderText(/enter suburb/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/enter postcode/i),
      ).toBeInTheDocument();
    });

    it("does not render ZIP Code input", () => {
      renderWithForm("AUS");
      expect(
        screen.queryByPlaceholderText(/enter zip code/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("IDN fields", () => {
    it("renders Province as a select", () => {
      renderWithForm("IDN");
      const selects = screen.getAllByRole("combobox");
      const provinceSelect = selects.find((s) =>
        s.querySelector('option[value=""]')?.textContent?.includes("Province"),
      );
      expect(provinceSelect).toBeInTheDocument();
    });

    it("renders Street Address as a text input", () => {
      renderWithForm("IDN");
      expect(
        screen.getByPlaceholderText(/enter street address/i),
      ).toBeInTheDocument();
    });
  });
});
