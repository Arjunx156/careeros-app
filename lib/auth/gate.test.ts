import { describe, expect, test } from "vitest";
import {
  SESSION_MAX_AGE,
  createGateToken,
  safeEqual,
  verifyGateToken,
} from "@/lib/auth/gate";

const SECRET = "test-secret-value-do-not-use-in-production";

describe("safeEqual", () => {
  test("returns true for identical strings", async () => {
    await expect(safeEqual("hunter2", "hunter2")).resolves.toBe(true);
  });

  test("returns false for different strings of equal length", async () => {
    await expect(safeEqual("hunter2", "hunter3")).resolves.toBe(false);
  });

  test("returns false for strings of different length", async () => {
    await expect(safeEqual("short", "considerably-longer")).resolves.toBe(false);
  });

  test("returns true for two empty strings", async () => {
    await expect(safeEqual("", "")).resolves.toBe(true);
  });
});

describe("verifyGateToken", () => {
  test("accepts a freshly minted token", async () => {
    const token = await createGateToken(SECRET);
    await expect(verifyGateToken(token, SECRET)).resolves.toBe(true);
  });

  test("rejects a token signed with a different secret", async () => {
    const token = await createGateToken(SECRET);
    await expect(verifyGateToken(token, "some-other-secret")).resolves.toBe(
      false,
    );
  });

  test("rejects a tampered signature", async () => {
    const token = await createGateToken(SECRET);
    const forged = `${token.slice(0, token.lastIndexOf("."))}.forgedsignature`;
    await expect(verifyGateToken(forged, SECRET)).resolves.toBe(false);
  });

  test("rejects an extended expiry that was not re-signed", async () => {
    const token = await createGateToken(SECRET);
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const farFuture = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
    await expect(
      verifyGateToken(`${farFuture}.${signature}`, SECRET),
    ).resolves.toBe(false);
  });

  test("rejects an expired token even when correctly signed", async () => {
    // Sign a payload that is already in the past, the way a stale cookie looks.
    const past = Date.now() - 1000;
    const valid = await createGateToken(SECRET);
    const signature = valid.slice(valid.lastIndexOf(".") + 1);
    await expect(verifyGateToken(`${past}.${signature}`, SECRET)).resolves.toBe(
      false,
    );
  });

  test.each([
    ["undefined", undefined],
    ["empty string", ""],
    ["no separator", "abcdef"],
    ["leading separator only", ".signature"],
    ["non-numeric payload", "notanumber.signature"],
  ])("rejects malformed token: %s", async (_label, token) => {
    await expect(verifyGateToken(token, SECRET)).resolves.toBe(false);
  });

  test("issues a token whose expiry matches the session length", async () => {
    const before = Date.now();
    const token = await createGateToken(SECRET);
    const expiresAt = Number(token.slice(0, token.lastIndexOf(".")));

    expect(expiresAt).toBeGreaterThanOrEqual(before + SESSION_MAX_AGE * 1000);
    expect(expiresAt).toBeLessThanOrEqual(
      Date.now() + SESSION_MAX_AGE * 1000 + 1000,
    );
  });
});
