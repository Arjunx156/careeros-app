import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Consistent envelope for every API route in the app. */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: string; fields?: Record<string, string> };

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status });
}

export function apiError(error: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json<ApiFailure>({ ok: false, error, fields }, { status });
}

/** Flatten a Zod error into per-field messages for inline form display. */
export function apiValidationError(error: ZodError) {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fields[key] ??= issue.message;
  }

  return apiError("Please check the highlighted fields.", 422, fields);
}

/**
 * Wrap a route handler so an unexpected throw becomes a 500 envelope instead
 * of an HTML error page the client cannot parse.
 */
export async function handleRoute(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) return apiValidationError(error);

    console.error("[api] unhandled error:", error);
    return apiError("Something went wrong. Please try again.", 500);
  }
}
