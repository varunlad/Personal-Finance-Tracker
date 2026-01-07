import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { formatINR } from "../../utils/expenseUtils";

/**
 * Props:
 * - labels: string[] (category names)
 * - values: number[] (amounts per category)
 * - colors: string[] (palette)
 * - currencySymbol: string
 * - defaultType: "donut" | "bar"
 * - themeMode: "dark" | "light"
 */
export default function CategoryChartSwitcher({
  totalVal = totalVal,
  labels = [],
  values = [],
  colors = ["var(--primary)", "#00B894", "#E17055", "#0984E3", "#D63031"],
  currencySymbol = "₹",
  defaultType = "donut", // default to donut since pie is removed
  themeMode = "dark",
}) {
  const [chartType, setChartType] = useState(
    defaultType === "bar" ? "bar" : "donut"
  );

  // Theme
  const isDark = String(themeMode).toLowerCase() === "dark";
  const textColor = "var(--text)";
  const borderColor = "var(--border)";

  // Ensure numeric values
  const safeValues = useMemo(
    () => (Array.isArray(values) ? values.map((v) => Number(v) || 0) : []),
    [values]
  );
  const safeTotal = useMemo(
    () => safeValues.reduce((a, b) => a + b, 0),
    [safeValues]
  );

  // Series per type
  const seriesForType = useMemo(() => {
    if (chartType === "bar") {
      return [{ name: "Amount", data: safeValues }];
    }
    // donut
    return safeValues;
  }, [chartType, safeValues]);

  const base = useMemo(
    () => ({
      chart: {
        type: chartType,
        background: "transparent",
        toolbar: { show: false },
        animations: { enabled: true },
        foreColor: textColor,
      },
      colors,
      legend: {
        position: "bottom",
        labels: { colors: textColor },
      },
      grid: {
        borderColor: borderColor,
        strokeDashArray: 4,
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: {
          formatter: (val) =>
            `${currencySymbol}${(Number(val) || 0).toLocaleString("en-IN")}`,
        },
      },
      theme: { mode: isDark ? "dark" : "light" },
      stroke: { show: true, width: 1, colors: [borderColor] },
    }),
    [chartType, colors, currencySymbol, isDark, textColor, borderColor]
  );

  const options = useMemo(() => {
    if (chartType === "bar") {
      return {
        ...base,
        plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
        dataLabels: { enabled: false },
        // In horizontal bar:
        // xaxis -> VALUES (currency formatting)
        // yaxis -> CATEGORIES (plain text)
        xaxis: {
          min: 0,
          axisBorder: { color: borderColor },
          axisTicks: { color: borderColor },
          labels: {
            style: { colors: Array(5).fill(textColor) },
            formatter: (val) =>
              `${currencySymbol}${(Number(val) || 0).toLocaleString("en-IN")}`,
          },
        },
        yaxis: {
          categories: labels,
          labels: {
            style: { colors: Array(labels.length).fill(textColor) },
            // no formatter here; categories are strings
          },
        },
      };
    }

    // DONUT
    return {
      ...base,
      labels,
      dataLabels: {
        enabled: true,
        formatter: (_val, opts) => {
          const idx = opts.seriesIndex;
          const amount = safeValues[idx] || 0;
          if (!safeTotal) return `${labels[idx]}: 0%`;
          const pct = Math.round((amount / safeTotal) * 100);
          return `${labels[idx]}: ${pct}%`;
        },
        style: { colors: [textColor] },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "60%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total",
                formatter: () =>
                  `${currencySymbol}${(Number(safeTotal) || 0).toLocaleString(
                    "en-IN"
                  )}`,
              },
            },
          },
        },
      },
    };
  }, [
    chartType,
    base,
    labels,
    textColor,
    borderColor,
    currencySymbol,
    safeValues,
    safeTotal,
  ]);

  return (
    <div className="chart-switcher">
      <div className="segmented">
        <button
          className={chartType === "donut" ? "seg active" : "seg"}
          onClick={() => setChartType("donut")}
        >
          Donut
        </button>
        <button
          className={chartType === "bar" ? "seg active" : "seg"}
          onClick={() => setChartType("bar")}
        >
          Bar
        </button>
      </div>

      <div className="themed-surface" style={{ marginTop: 12 }}>
        <Chart
          options={options}
          series={seriesForType}
          type={chartType}
          height={360}
        />
      </div>
      {chartType === "bar" && (
        <div className="metric">
          Total:&nbsp;
          <span className="metric-value">{formatINR(totalVal, "₹")}</span>
        </div>
      )}
    </div>
  );
}
