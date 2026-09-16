"use client";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export function IncomeExpenseBarChart({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  return (
    <Bar
      data={{
        labels: ["รายรับเดือนนี้", "รายจ่ายเดือนนี้"],
        datasets: [
          {
            data: [income, expense],
            backgroundColor: ["#34D399", "#FB7185"],
            borderRadius: 10,
            maxBarThickness: 64,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#F1F5F9" } },
          x: { grid: { display: false } },
        },
      }}
    />
  );
}
