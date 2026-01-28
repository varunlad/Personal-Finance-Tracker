import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { formatINR } from "../../utils/expenseUtils";

/**
 * Props:
 * - labels: string[]
 * - values: number[]
 * - colors: string[]
 * - currencySymbol: string
 * - defaultType: "donut" | "bar"
 * - themeMode: "dark" | "light"
 * - totalVal?: number
 */
export default function CategoryChartSwitcher({
  labels = [],
  values = [],
  colors = ["var(--primary)", "#00B894", "#E17055", "#0984E3", "#D63031"],
  currencySymbol = "₹",
  defaultType = "donut",
  themeMode = "dark",
  totalVal,
}) {
  const [chartType, setChartType] = useState(defaultType === "bar" ? "bar" : "donut");

  // Orientation toggle for Bar
  const [barHorizontal, setBarHorizontal] = useState(true);

  // Theme
  const isDark = String(themeMode).toLowerCase() === "dark";
  const textColor = "var(--text)";
  const borderColor = "var(--border)";

  // --- Category color map ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const CATEGORY_COLORS = {
    creditCard: "#6366F1",
    emi: "#F59E0B",
    mutualFund: "#53A9EB",
    stock: "#588352FF",
    shopping: "#E955DCFF",
    grocery: "#54D184FF",
    other: "#E26E6F",
    rentBills: "#E98E52FF",
  };

  // Normalize external label strings to internal keys used in your app
  const normalizeCat = (c) => {
    const raw = String(c || "other").trim();
    if (raw === "Credit Card") return "creditCard";
    if (raw === "EMIs") return "emi";
    const s = raw.toLowerCase();
    if (s.includes("mutual")) return "mutualFund";
    if (s.includes("stock")) return "stock";
    if (s.includes("shop")) return "shopping";
    if (s.includes("groc")) return "grocery";
    if (s.includes("rent") || s.includes("bill")) return "rentBills";
    if (s === "other") return "other";
    return "other";
  };

  // Ensure numeric values
  const safeValues = useMemo(
    () => (Array.isArray(values) ? values.map((v) => Number(v) || 0) : []),
    [values]
  );
  const safeTotal = useMemo(() => safeValues.reduce((a, b) => a + b, 0), [safeValues]);

  // Map labels -> colors using the category dictionary; fallback to provided colors if unknown
  const mappedColors = useMemo(() => {
    const fallback = (i) => colors[Math.min(i, colors.length - 1)] || "#999";
    return labels.map((label, idx) => {
      const key = normalizeCat(label);
      return CATEGORY_COLORS[key] || fallback(idx);
    });
  }, [labels, colors, CATEGORY_COLORS]);

  // --- SERIES per type ---
  // IMPORTANT: For BAR we provide data as { x: <category>, y: <value> }
  const seriesForType = useMemo(() => {
    if (chartType === "bar") {
      const barData = labels.map((lbl, i) => ({
        x: lbl,
        y: safeValues[i] || 0,
      }));
      return [{ name: "Amount", data: barData }];
    }
    // donut expects an array of numbers
    return safeValues;
  }, [chartType, labels, safeValues]);

  const base = useMemo(
    () => ({
      chart: {
        type: chartType,
        background: "transparent",
        toolbar: { show: false },
        animations: { enabled: true },
        foreColor: textColor,
      },
      colors: mappedColors,
      legend: {
        // hide legend for bar charts to avoid odd numeric legends with distributed bars
        show: chartType !== "bar",
        position: "bottom",
        labels: { colors: textColor },
      },
      grid: { borderColor: borderColor, strokeDashArray: 4 },
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
      // With data objects {x, y}, Apex chooses correct axes automatically.
      // We only need to:
      //  - set horizontal flag
      //  - format the numeric axis ticks (X for horizontal, Y for vertical)
      const numLabelsStyle = { colors: Array(5).fill(textColor) };

      const xNumeric = {
        min: 0,
        axisBorder: { color: borderColor },
        axisTicks: { color: borderColor },
        labels: {
          style: numLabelsStyle,
          formatter: (val) =>
            `${currencySymbol}${(Number(val) || 0).toLocaleString("en-IN")}`,
        },
      };
      const yNumeric = {
        min: 0,
        labels: {
          style: numLabelsStyle,
          formatter: (val) =>
            `${currencySymbol}${(Number(val) || 0).toLocaleString("en-IN")}`,
        },
      };

      return {
        ...base,
        plotOptions: {
          bar: {
            horizontal: barHorizontal,
            borderRadius: 10,
            borderRadiusApplication: "end",
            distributed: true,
          },
        },
        dataLabels: { enabled: false },
        // Numeric axis formatter depends on orientation:
        xaxis: barHorizontal ? xNumeric : {},
        yaxis: barHorizontal ? {} : yNumeric,
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
    barHorizontal,
  ]);

  const footerTotal = typeof totalVal === "number" ? totalVal : safeTotal;

  return (
    <div className="chart-switcher" style={{ minHeight: 412 }}>
      {/* Type switch */}
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

      {/* Orientation toggle: only for Bar */}
      {chartType === "bar" && (
        <div
          className="segmented"
          style={{ marginTop: 8, display: "inline-flex", gap: 8 }}
          role="group"
          aria-label="Bar orientation"
        >
          <button
            className={`seg ${barHorizontal ? "active" : ""}`}
            onClick={() => setBarHorizontal(true)}
            aria-pressed={barHorizontal}
            title="Horizontal bars"
          >
            Horizontal
          </button>
          <button
            className={`seg ${!barHorizontal ? "active" : ""}`}
            onClick={() => setBarHorizontal(false)}
            aria-pressed={!barHorizontal}
            title="Vertical bars"
          >
            Vertical
          </button>
        </div>
      )}

      <div className="themed-surface" style={{ marginTop: 12 }}>
        {/* key => clean re-mount so Apex updates axis types correctly
            (especially when flipping orientation) */}
        <Chart
          key={`type-${chartType}-orient-${barHorizontal ? "h" : "v"}`}
          options={options}
          series={seriesForType}
          type={chartType}
          height={360}
        />
      </div>

      {chartType === "bar" && (
        <div className="metric">
          Total:&nbsp;
          <span className="metric-value">
            {formatINR(footerTotal, currencySymbol)}
          </span>
        </div>
      )}
    </div>
  );
}
