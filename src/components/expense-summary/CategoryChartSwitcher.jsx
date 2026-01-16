
import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { formatINR } from "../../utils/expenseUtils";

/**
 * Props:
 * - labels: string[] (category names shown on chart)
 * - values: number[] (amounts per category)
 * - colors: string[] (fallback palette; we override with category mapping when possible)
 * - currencySymbol: string
 * - defaultType: "donut" | "bar"
 * - themeMode: "dark" | "light"
 * - totalVal?: number (optional explicit total for footer metric in bar chart)
 */
export default function CategoryChartSwitcher({
  labels = [],
  values = [],
  // Fallback palette if a label isn't recognized as a known category
  colors = ["var(--primary)", "#00B894", "#E17055", "#0984E3", "#D63031"],
  currencySymbol = "₹",
  defaultType = "donut",
  themeMode = "dark",
  totalVal, // optional override for footer total in bar
}) {
  const [chartType, setChartType] = useState(
    defaultType === "bar" ? "bar" : "donut"
  );

  // Theme
  const isDark = String(themeMode).toLowerCase() === "dark";
  const textColor = "var(--text)";
  const borderColor = "var(--border)";

  // --- Category color map (authoritative) ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const CATEGORY_COLORS = {
    mutualFund: "#53A9EB",
    stock: "#588352FF",
    shopping: "#E955DCFF",
    grocery: "#54D184FF",
    other: "#E26E6F",
    rentBills: "#E98E52FF",
  };

  // Normalize external label strings to internal keys used in your app
  const normalizeCat = (c) => {
    const s = String(c || "other").toLowerCase();
    if (s.includes("mutual")) return "mutualFund";
    if (s.includes("stock")) return "stock";
    if (s.includes("shop")) return "shopping";
    if (s.includes("groc")) return "grocery";
    if (s.includes("rent") || s.includes("bill")) return "rentBills";
    return "other";
  };

  // Ensure numeric values
  const safeValues = useMemo(
    () => (Array.isArray(values) ? values.map((v) => Number(v) || 0) : []),
    [values]
  );
  const safeTotal = useMemo(
    () => safeValues.reduce((a, b) => a + b, 0),
    [safeValues]
  );

  // Map labels -> colors using the category dictionary; fallback to provided colors if unknown
   
  const mappedColors = useMemo(() => {
    // If there are more labels than fallback colors, reuse last fallback color to avoid undefined
    const fallback = (i) => colors[Math.min(i, colors.length - 1)] || "#999";
    return labels.map((label, idx) => {
      const key = normalizeCat(label);
      return CATEGORY_COLORS[key] || fallback(idx);
    });
  }, [labels, colors, CATEGORY_COLORS]);

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
      colors: mappedColors, // <- use our mapped colors
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
    [chartType, mappedColors, currencySymbol, isDark, textColor, borderColor]
  );

  const options = useMemo(() => {
    if (chartType === "bar") {
      return {
        ...base,
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 6,
            distributed: true, // <- color each bar from colors[]
          },
        },
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

  const footerTotal = typeof totalVal === "number" ? totalVal : safeTotal;

  return (
    <div className="chart-switcher" style={{ minHeight: 412 }}>
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
          <span className="metric-value">{formatINR(footerTotal, currencySymbol)}</span>
        </div>
      )}
    </div>
  );
}