"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export function CategoryDoughnutChart({
  data,
}: {
  data: { name: string; color: string | null; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="h-48 w-full flex items-center justify-center text-xs text-slate-400">
        ยังไม่มีรายจ่ายในเดือนนี้
      </div>
    );
  }

  return (
    <Doughnut
      data={{
        labels: data.map((d) => d.name),
        datasets: [
          {
            data: data.map((d) => d.total),
            backgroundColor: data.map((d) => d.color ?? "#CBD5E1"),
            borderWidth: 0,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: "70%",
      }}
    />
  );
}
