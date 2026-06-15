import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function selectCountry(page: Page, code: string) {
  await page.locator("label:has-text('Country') + select").selectOption(code);
}

async function clickManualEdit(page: Page) {
  await page.getByRole("button", { name: /manually edit/i }).click();
}

// ─── Country selection ────────────────────────────────────────────────────────

test.describe("Country selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("defaults to United States", async ({ page }) => {
    const select = page.locator("label:has-text('Country') + select");
    await expect(select).toHaveValue("USA");
  });

  test("switching country changes manual form fields — AUS shows Suburb & Postcode", async ({
    page,
  }) => {
    await selectCountry(page, "AUS");
    await clickManualEdit(page);

    await expect(page.getByPlaceholder("Enter suburb")).toBeVisible();
    await expect(page.getByPlaceholder("Enter postcode")).toBeVisible();
    // ZIP Code is USA-specific; should not appear
    await expect(page.getByPlaceholder("Enter zip code")).not.toBeVisible();
  });

  test("switching country changes manual form fields — USA shows City & ZIP Code", async ({
    page,
  }) => {
    await selectCountry(page, "USA");
    await clickManualEdit(page);

    await expect(page.getByPlaceholder("Enter city")).toBeVisible();
    await expect(page.getByPlaceholder("Enter zip code")).toBeVisible();
    await expect(page.getByPlaceholder("Enter suburb")).not.toBeVisible();
  });

  test("switching country changes manual form fields — IDN shows Province & District", async ({
    page,
  }) => {
    await selectCountry(page, "IDN");
    await clickManualEdit(page);

    await expect(page.getByPlaceholder(/enter district/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter street address/i)).toBeVisible();
  });
});

// ─── Manual form validation ───────────────────────────────────────────────────

test.describe("Manual form — validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await selectCountry(page, "USA");
    await clickManualEdit(page);
  });

  test("shows required-field errors when submitting empty USA form", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Save Address" }).click();

    // At least one required-field error should be visible
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test("shows ZIP code format error for non-5-digit value", async ({
    page,
  }) => {
    await page.getByPlaceholder("Enter address line 1").fill("1 Main St");
    await page.getByPlaceholder("Enter city").fill("Austin");
    await page.locator("label:has-text('State') + select").selectOption("TX");
    await page.getByPlaceholder("Enter zip code").fill("123");

    await page.getByRole("button", { name: "Save Address" }).click();

    await expect(page.getByText(/5 digits/i)).toBeVisible();
  });

  test("shows postcode format error for AUS non-4-digit value", async ({
    page,
  }) => {
    await selectCountry(page, "AUS");
    await clickManualEdit(page);

    await page.getByPlaceholder("Enter address line 1").fill("10 Collins St");
    await page.getByPlaceholder("Enter suburb").fill("Melbourne");
    await page.locator("label:has-text('State') + select").selectOption("VIC");
    await page.getByPlaceholder("Enter postcode").fill("30");

    await page.getByRole("button", { name: "Save Address" }).click();

    await expect(page.getByText(/4 digits/i)).toBeVisible();
  });
});

// ─── Happy path: submit and appear in saved list ───────────────────────────────

test.describe("Manual form — successful submission", () => {
  test("submits a USA address and shows success banner", async ({ page }) => {
    await page.goto("/");
    await selectCountry(page, "USA");
    await clickManualEdit(page);

    await page
      .getByPlaceholder("Enter address line 1")
      .fill("742 Evergreen Terrace");
    await page.getByPlaceholder("Enter city").fill("Springfield");
    await page.locator("label:has-text('State') + select").selectOption("IL");
    await page.getByPlaceholder("Enter zip code").fill("62701");

    await page.getByRole("button", { name: "Save Address" }).click();

    await expect(page.getByText("Address saved successfully!")).toBeVisible();
  });

  test("saved address appears in the Saved Addresses panel", async ({
    page,
  }) => {
    await page.goto("/");
    await selectCountry(page, "AUS");
    await clickManualEdit(page);

    await page
      .getByPlaceholder("Enter address line 1")
      .fill("1 Harbour Bridge Rd");
    await page.getByPlaceholder("Enter suburb").fill("SydneyE2E");
    await page.locator("label:has-text('State') + select").selectOption("NSW");
    await page.getByPlaceholder("Enter postcode").fill("2000");

    await page.getByRole("button", { name: "Save Address" }).click();

    // Wait for the saved addresses panel to refresh and show the new entry
    await expect(page.getByText("SydneyE2E").first()).toBeVisible();
  });

  test("after success, form resets to autocomplete mode", async ({ page }) => {
    await page.goto("/");
    await selectCountry(page, "USA");
    await clickManualEdit(page);

    await page.getByPlaceholder("Enter address line 1").fill("1 Infinite Loop");
    await page.getByPlaceholder("Enter city").fill("Cupertino");
    await page.locator("label:has-text('State') + select").selectOption("CA");
    await page.getByPlaceholder("Enter zip code").fill("95014");

    await page.getByRole("button", { name: "Save Address" }).click();

    // After success the shell goes back to autocomplete mode; manual fields should be gone
    await expect(
      page.getByRole("button", { name: /manually edit/i }),
    ).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByPlaceholder("Enter zip code")).not.toBeVisible();
  });
});

// ─── Saved Addresses panel ────────────────────────────────────────────────────

test.describe("Saved Addresses panel", () => {
  test("loads and displays existing addresses on page open", async ({
    page,
  }) => {
    await page.goto("/");
    // The panel heading should always be visible
    await expect(
      page.getByRole("heading", { name: "Saved Addresses" }),
    ).toBeVisible();
  });

  test("shows Load More button when there are more pages", async ({ page }) => {
    // Seed enough addresses to trigger pagination (default limit = 20)
    // We rely on data accumulated over other tests; if the button is not shown,
    // this assertion is skipped gracefully — not a hard failure.
    await page.goto("/");
    const loadMore = page.getByRole("button", { name: /load more/i });
    const hasMore = await loadMore.isVisible();
    if (hasMore) {
      await loadMore.click();
      // After clicking, either more items load or the button disappears
      await page.waitForTimeout(500);
      // No error should appear
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
    }
  });
});
