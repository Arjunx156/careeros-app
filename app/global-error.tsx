"use client";

/**
 * Last-resort boundary, for a failure in the root layout itself.
 *
 * Replaces the whole document, so it cannot rely on any app styling or
 * component — everything here is inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
          background: "#f9fafb",
          color: "#111827",
        }}
      >
        <main style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>CareerOS could not start</h1>
          <p style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.6 }}>
            Something failed at the top level. Your data is not affected.
          </p>
          {error.digest ? (
            <p style={{ color: "#9ca3af", fontSize: 12, fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              height: 40,
              padding: "0 16px",
              borderRadius: 8,
              border: 0,
              background: "#4f46e5",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
