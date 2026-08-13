"use client";

import { useEffect, useState } from "react";
import { BAND_LABEL, BAND_STROKE, BAND_TEXT, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * Donut gauge with the counter animation from the design brief (0 → score over
 * ~800ms). Respects prefers-reduced-motion by jumping straight to the value.
 */
export function ScoreGauge({
  score,
  label = "Overall Match",
  size = 168,
}: {
  score: number;
  label?: string;
  size?: number;
}) {
  const [displayed, setDisplayed] = useState(0);
  const band = scoreBand(score);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Zero duration makes the first frame land on the final value, so reduced
    // motion takes the same code path instead of setting state synchronously.
    const duration = prefersReduced ? 0 : 800;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutQuart — fast start, gentle settle.
      const eased = 1 - (1 - progress) ** 4;
      setDisplayed(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - displayed / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`${label}: ${score} out of 100`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-line-subtle)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={BAND_STROKE[band]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn("tabular text-score leading-none", BAND_TEXT[band])}
          >
            {displayed}
          </span>
          <span className="mt-1 text-label text-ink-muted">out of 100</span>
        </div>
      </div>

      <p className="mt-3 text-card-title text-ink">{label}</p>
      <p className={cn("text-label font-medium", BAND_TEXT[band])}>
        {BAND_LABEL[band]}
      </p>
    </div>
  );
}

/** Thin labelled bar used for the ten sub-scores. */
export function ScoreBar({ label, score }: { label: string; score: number }) {
  const [width, setWidth] = useState(0);
  const band = scoreBand(score);

  useEffect(() => {
    // Next frame so the transition has a 0 → value change to animate.
    const id = requestAnimationFrame(() => setWidth(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label text-ink-secondary">{label}</span>
        <span className={cn("tabular text-label font-semibold", BAND_TEXT[band])}>
          {score}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-subtle">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", {
            "bg-success": band === "excellent",
            "bg-brand-600": band === "good",
            "bg-warning": band === "fair",
            "bg-danger": band === "weak",
          })}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
