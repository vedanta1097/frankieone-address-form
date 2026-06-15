import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CountrySelector from "../components/CountrySelector";
import { COUNTRIES } from "shared";

describe("CountrySelector", () => {
  it("renders a select with all countries", () => {
    render(<CountrySelector value="USA" onChange={() => {}} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    for (const { name } of Object.values(COUNTRIES)) {
      expect(screen.getByText(new RegExp(name))).toBeInTheDocument();
    }
  });

  it("displays the currently selected country", () => {
    render(<CountrySelector value="AUS" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("AUS");
  });

  it("calls onChange with the new country code when changed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<CountrySelector value="USA" onChange={onChange} />);
    const select = screen.getByRole("combobox");

    await user.selectOptions(select, "IDN");
    expect(onChange).toHaveBeenCalledWith("IDN");
  });
});
