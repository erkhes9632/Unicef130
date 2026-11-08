"use client";

// Last-resort error page (replaces the root layout, so no providers or fonts are available).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="mn">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          textAlign: "center",
          padding: 16,
        }}
      >
        <div>
          <h1>Уучлаарай, алдаа гарлаа</h1>
          <p>Sorry, something went wrong.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              border: 0,
              background: "#1cabe2",
              color: "#0b1220",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Дахин оролдох / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
