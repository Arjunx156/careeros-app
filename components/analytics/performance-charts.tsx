"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SegmentStat, TimePoint } from "@/lib/analytics/performance";

/**
 * Charts styled to the design brief: brand palette, very light grid, no heavy
 * fills. Segments without enough data are drawn muted rather than hidden, so
 * "we don't know yet" stays visible instead of looking like zero.
 */

const BRAND = "#4f46e5";
const MUTED = "#d1d5db";
const AXIS = "#9ca3af";
const GRID = "#f3f4f6";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 24px rgb(0 0 0 / 0.12)",
  fontSize: 13,
};

export function SegmentChart({ data }: { data: SegmentStat[] }) {
  const plotted = data.map((row) => ({
    ...row,
    // Unrated segments still get a bar, so the row is never blank.
    displayValue: row.interviewRate ?? 100,
    caption:
      row.interviewRate === null
        ? `too few (${row.applications})`
        : `${row.interviews}/${row.applications}`,
  }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-body text-ink-secondary">
        Nothing to compare yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart data={plotted} layout="vertical" margin={{ left: 8, right: 72 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis
          type="number"
          domain={[0, 100]}
          unit="%"
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, _name, item) => {
            const row = item?.payload as SegmentStat | undefined;
            if (!row) return ["", "Interview rate"];

            return [
              row.interviewRate === null
                ? "Not enough data"
                : `${value}% · ${row.interviews}/${row.applications}`,
              "Interview rate",
            ];
          }}
        />
        {/*
          A null rate would draw nothing, leaving a blank row that reads as 0%.
          Plotting a full-width muted bar labelled "too few" makes "we don't
          know yet" visibly different from "this never converts".
        */}
        <Bar dataKey="displayValue" radius={[0, 4, 4, 0]} barSize={18}>
          <LabelList
            dataKey="caption"
            position="right"
            style={{ fill: AXIS, fontSize: 11 }}
          />
          {data.map((row) => (
            <Cell
              key={row.label}
              fill={row.interviewRate === null ? MUTED : BRAND}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TimeChart({ data }: { data: TimePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis
          dataKey="month"
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="applications"
          stroke={BRAND}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Applications"
        />
        <Line
          type="monotone"
          dataKey="interviews"
          stroke="#059669"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Interviews"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
