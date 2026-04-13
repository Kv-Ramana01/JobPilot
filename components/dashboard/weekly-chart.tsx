// components/dashboard/weekly-chart.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { subDays, format } from "date-fns";

interface Props {
  data: number[]; // 7 values, oldest first
}

export function WeeklyChart({ data }: Props) {
  const chartData = data.map((count, i) => ({
    day: format(subDays(new Date(), 6 - i), "EEE"),
    count,
    isToday: i === 6,
  }));

  const max = Math.max(...data, 1);

  return (
    <div className="rounded-xl border bg-white p-5 dark:bg-gray-900 dark:border-gray-800">
      <h3 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
        Applications this week
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              allowDecimals={false}
              domain={[0, max + 1]}
            />
            <Tooltip
              cursor={{ fill: "rgba(83,74,183,0.06)", radius: 6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm dark:bg-gray-800 dark:border-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {payload[0].value} applications
                    </span>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isToday ? "#534AB7" : "#CECBF6"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
