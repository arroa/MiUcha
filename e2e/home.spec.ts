import { expect, test } from "@playwright/test";

test("la home responde", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByText("MiHucha")).toBeVisible();
});
