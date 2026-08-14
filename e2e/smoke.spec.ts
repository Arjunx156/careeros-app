import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

/**
 * The password comes from .env.local so the suite runs against a real gate
 * rather than a bypass. If the gate were stubbed for tests, the tests could not
 * catch it falling open — which is the single most important thing to verify.
 */
function appPassword(): string {
  const match = fs
    .readFileSync(".env.local", "utf8")
    .match(/^APP_PASSWORD=(.*)$/m);
  if (!match?.[1]) throw new Error("APP_PASSWORD not found in .env.local");
  return match[1].trim();
}

async function unlock(page: Page) {
  await page.goto("/unlock");
  await page.fill("#password", appPassword());
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}

/**
 * On a phone the sidebar lives behind a hamburger, so its links and the Lock
 * button are not reachable until the drawer is open. Opening it when the
 * trigger is visible keeps one test body correct on both viewports.
 */
async function openNavIfCollapsed(page: Page) {
  const trigger = page.getByRole("button", { name: /open navigation/i });
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await expect(page.getByRole("button", { name: /close navigation/i })).toBeVisible();
  }
}

const GATED_ROUTES = [
  "/dashboard",
  "/resume-library",
  "/job-analyzer",
  "/applications",
  "/jobs",
  "/contacts",
  "/follow-ups",
  "/analytics",
  "/copilot",
  "/settings",
];

test.describe("the gate", () => {
  test("the password field has a real label, not just a placeholder", async ({
    page,
  }) => {
    // Must run unauthenticated — /unlock redirects to /dashboard once unlocked.
    await page.goto("/unlock");
    await expect(page.getByLabel("Password")).toBeVisible();
  });


  test("sends an unauthenticated visitor to unlock, remembering where they were going", async ({
    page,
  }) => {
    await page.goto("/applications");
    await expect(page).toHaveURL(/\/unlock\?next=%2Fapplications/);
  });

  test("rejects the wrong password without letting anything through", async ({
    page,
  }) => {
    await page.goto("/unlock");
    await page.fill("#password", "definitely-not-the-password");
    await page.click('button[type="submit"]');

    // Scoped by id: Next renders its own role="alert" route announcer, so a
    // bare getByRole("alert") matches two elements.
    await expect(page.locator("#unlock-error")).toContainText(/incorrect/i);
    await expect(page).toHaveURL(/\/unlock/);
  });

  test("APIs answer 401 rather than serving an HTML page a fetch cannot parse", async ({
    request,
  }) => {
    for (const path of ["/api/resumes", "/api/applications", "/api/contacts"]) {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
      expect(await response.json()).toMatchObject({ error: "Locked" });
    }
  });

  test("locking again re-closes every route", async ({ page }) => {
    await unlock(page);
    await openNavIfCollapsed(page);
    await page.getByRole("button", { name: /^lock/i }).click();
    await page.waitForURL("**/unlock");

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/unlock/);
  });
});

test.describe("every page renders", () => {
  test.beforeEach(async ({ page }) => {
    await unlock(page);
  });

  for (const route of GATED_ROUTES) {
    test(`${route} loads without an error boundary`, async ({ page }) => {
      const failures: string[] = [];
      page.on("pageerror", (error) => failures.push(error.message));

      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);

      // A crashed server component renders the error boundary instead.
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(failures).toEqual([]);
    });
  }
});

test.describe("empty states", () => {
  test.beforeEach(async ({ page }) => {
    await unlock(page);
  });

  test("a fresh library explains what to do rather than showing a blank page", async ({
    page,
  }) => {
    await page.goto("/resume-library");
    const hasResumes = (await page.locator("a[href^='/resume-library/']").count()) > 0;
    test.skip(hasResumes, "library already has resumes");

    await expect(page.getByText(/no resumes yet/i)).toBeVisible();
  });

  test("analytics refuses to draw conclusions from too little data", async ({
    page,
  }) => {
    await page.goto("/analytics");
    const isEmpty = await page.getByText(/not enough data/i).isVisible().catch(() => false);
    test.skip(!isEmpty, "enough data exists to render charts");

    await expect(page.getByText(/track at least 5/i)).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("every sidebar link reaches a real page", async ({ page }) => {
    await unlock(page);

    for (const route of GATED_ROUTES) {
      // The drawer closes on navigation, so it is reopened for each hop.
      await openNavIfCollapsed(page);

      const link = page.locator(`nav a[href="${route}"]`).first();
      if ((await link.count()) === 0) continue;

      await link.click();
      await page.waitForURL(`**${route}`);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });
});

test.describe("accessibility basics", () => {
  test.beforeEach(async ({ page }) => {
    await unlock(page);
  });

  test("every page has exactly one h1", async ({ page }) => {
    for (const route of ["/dashboard", "/applications", "/contacts", "/analytics"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
    }
  });

  test("icon-only controls carry accessible names", async ({ page }) => {
    await page.goto("/dashboard");

    const iconButtons = page.locator("button:not(:has-text(''))");
    const count = await iconButtons.count();

    for (let index = 0; index < count; index++) {
      const button = iconButtons.nth(index);
      const text = (await button.textContent())?.trim() ?? "";
      if (text.length > 0) continue;

      const label =
        (await button.getAttribute("aria-label")) ??
        (await button.getAttribute("title"));
      expect(label, "an icon-only button has no accessible name").toBeTruthy();
    }
  });
});

test.describe("responsive", () => {
  test("the mobile drawer opens and navigates", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await unlock(page);

    await openNavIfCollapsed(page);

    await page.locator('nav a[href="/applications"]').first().click();
    await page.waitForURL("**/applications");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await unlock(page);

    for (const route of [
      "/dashboard",
      "/contacts",
      "/analytics",
      "/settings",
      "/applications",
      "/jobs",
      "/resume-library",
    ]) {
      await page.goto(route);
      // Measured immediately, before layout settles — the loading skeleton is
      // real UI and must not push the page sideways either.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // The kanban and tables scroll inside their own container; the page
      // itself must never scroll sideways.
      expect(overflow, `${route} overflows horizontally`).toBeLessThanOrEqual(1);
    }
  });
});
