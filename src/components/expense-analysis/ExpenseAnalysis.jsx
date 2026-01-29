// src/components/expense-analysis/ExpenseAnalysis.jsx
import { useMemo, useState, useEffect } from "react";
import "./ExpenseAnalysis.css";

import HeaderControls from "./HeaderControls.jsx";
import SummaryCards from "./SummaryCards.jsx";
import DayTable from "./DayTable.jsx";
import EditorModal from "./EditorModal.jsx";

import { upsertDayExpenses } from "../../api/expenses";
import { onRequestOpenEditor } from "../features/editor-bus.js";

export default function ExpenseAnalysis({
  dayGroups = [],
  currency = "RS",
  year,              // ✅ controlled
  month,             // ✅ controlled
  onChangeYM,        // ✅ (y, m) => void
  onUpdateDayGroups,
  token,
}) {
  const pad2 = (n) => String(n).padStart(2, "0");

  const fmtAmount = (n) =>
    currency === "INR" || currency === "RS"
      ? "₹ " + new Intl.NumberFormat("en-IN").format(n)
      : new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n);

  const parseYMD = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return { y, m, d };
  };
  const toYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

  const toKeyFromRaw = (raw) => {
    const s = String(raw || "").trim();
    if (s === "Credit Card") return "creditCard";
    if (s === "EMIs") return "emi";
    const l = s.toLowerCase();
    if (l.includes("mutual")) return "mutualFund";
    if (l.includes("stock")) return "stock";
    if (l.includes("shop")) return "shopping";
    if (l.includes("groc")) return "grocery";
    if (l.includes("rent") || l.includes("bill")) return "rentBills";
    if (l === "other") return "other";
    return "other";
  };

  const toBackendLabel = (key) => {
    if (key === "creditCard") return "Credit Card";
    if (key === "emi") return "EMIs";
    return key;
  };

  const CATEGORY_OPTIONS = [
    { value: "creditCard", label: "Credit Card" },
    { value: "emi", label: "EMIs" },
    { value: "mutualFund", label: "Mutual Fund" },
    { value: "stock", label: "Stocks" },
    { value: "shopping", label: "Shopping" },
    { value: "grocery", label: "Grocery" },
    { value: "rentBills", label: "Rent/Bills" },
    { value: "other", label: "Other" },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emptyCats = {
    creditCard: 0,
    emi: 0,
    mutualFund: 0,
    stock: 0,
    shopping: 0,
    grocery: 0,
    rentBills: 0,
    other: 0,
  };

  const now = new Date();
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  const cmpYM = (a, b) => (a.y === b.y ? a.m - b.m : a.y - b.y);
  const canEditDay = (yr, mo, day) => {
    const sel = { y: yr, m: mo };
    const tYM = { y: today.y, m: today.m };
    const diff = cmpYM(sel, tYM);
    if (diff > 0) return false;
    if (diff < 0) return true;
    return day <= today.d;
  };

  // Flatten for header lists
  const flatAll = useMemo(() => {
    const out = [];
    for (const g of dayGroups) {
      for (const it of g.items || []) {
        out.push({
          id: it.id,
          date: g.date,
          amount: Number(it.amount) || 0,
          category: toKeyFromRaw(it.category),
          note: typeof it.note === "string" ? it.note : "",
        });
      }
    }
    return out;
  }, [dayGroups]);

  // Groups for current YM
  const groupsForMonth = useMemo(
    () =>
      dayGroups.filter((g) => {
        const { y, m } = parseYMD(g.date);
        return y === year && m === month;
      }),
    [dayGroups, year, month]
  );

  const monthTotal = useMemo(() => {
    let t = 0;
    for (const g of groupsForMonth) {
      if (typeof g.total === "number") t += g.total;
      else t += (g.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
    }
    return t;
  }, [groupsForMonth]);

  const monthByCategory = useMemo(() => {
    const cat = { ...emptyCats };
    for (const g of groupsForMonth) {
      for (const it of g.items || []) {
        const key = toKeyFromRaw(it.category);
        cat[key] += Number(it.amount) || 0;
      }
    }
    return cat;
  }, [emptyCats, groupsForMonth]);

  const totalsByDayInMonth = useMemo(() => {
    const map = new Map();
    for (const g of groupsForMonth) {
      const { d } = parseYMD(g.date);
      const total =
        typeof g.total === "number"
          ? g.total
          : (g.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);

      if (!map.has(d)) map.set(d, { total: 0, categories: { ...emptyCats } });
      const rec = map.get(d);
      rec.total += total;
      for (const it of g.items || []) {
        const c = toKeyFromRaw(it.category);
        rec.categories[c] += Number(it.amount) || 0;
      }
    }
    return map;
  }, [emptyCats, groupsForMonth]);

  // ------------ Editor state ------------
  const [editingDay, setEditingDay] = useState(null);
  const [editRows, setEditRows] = useState([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function openEditor(dayNum) {
    if (!canEditDay(year, month, dayNum)) return;
    const dateStr = toYMD(year, month, dayNum);
    const group = dayGroups.find((g) => g.date === dateStr);

    const buckets = new Map();
    if (group && Array.isArray(group.items)) {
      for (const it of group.items) {
        const key = toKeyFromRaw(it.category);
        const amt = Number(it.amount) || 0;
        const note = typeof it.note === "string" ? it.note.trim() : "";
        if (amt <= 0) continue;
        if (!buckets.has(key)) buckets.set(key, { total: 0, note: "" });
        const b = buckets.get(key);
        b.total += amt;
        if (!b.note && note) b.note = note;
      }
    }

    const rows = Array.from(buckets.entries()).map(([key, { total, note }]) => ({
      id: cryptoRandomId(),
      expenseId: null,
      amount: total,
      category: key,
      note: note || "",
      isNew: false,
    }));

    setEditingDay(dayNum);
    setEditRows(rows);
    setPendingDeleteIds(new Set());
    setSaveError("");
    setSaving(false);
  }

  function closeEditor() {
    setEditingDay(null);
    setEditRows([]);
    setPendingDeleteIds(new Set());
    setSaveError("");
    setSaving(false);
  }

  function addRow() {
    if (editingDay && !canEditDay(year, month, editingDay)) return;
    setEditRows((rows) => [
      ...rows,
      { id: cryptoRandomId(), expenseId: null, amount: 0, category: "other", note: "", isNew: true },
    ]);
  }
  function updateRow(id, patch) {
    setEditRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function toggleDelete(id) {
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildCoalescedItemsFromEditor(rows, deletesSet) {
    const nonDeleted = rows.filter((r) => !deletesSet.has(r.id));
    const buckets = new Map();

    for (const r of nonDeleted) {
      const key = r.category;
      const amt = Number(r.amount) || 0;
      const note = typeof r.note === "string" ? r.note.trim().slice(0, 200) : "";
      if (amt <= 0) continue;
      if (!buckets.has(key)) buckets.set(key, { total: 0, note: "" });
      const b = buckets.get(key);
      b.total += amt;
      if (!b.note && note) b.note = note;
    }

    const items = [];
    for (const [key, info] of buckets) {
      const payload = { amount: info.total, category: toBackendLabel(key) };
      if (info.note) payload.note = info.note;
      items.push(payload);
    }
    return items;
  }

  function saveChanges() {
    if (saving) return;
    if (editingDay === null) return;

    (async () => {
      if (!token) {
        setSaveError("You are not logged in.");
        return;
      }
      if (!onUpdateDayGroups) {
        console.warn("onUpdateDayGroups is not provided. Changes will not persist.");
        closeEditor();
        return;
      }

      setSaving(true);
      setSaveError("");
      const dateStr = toYMD(year, month, editingDay);

      try {
        const items = buildCoalescedItemsFromEditor(editRows, pendingDeleteIds);
        const upsertResp = await upsertDayExpenses({ date: dateStr, items, token });
        const updatedMonthGroups = upsertResp?.month ?? [];
        onUpdateDayGroups(updatedMonthGroups);
        closeEditor();
      } catch (e) {
        console.error("Save failed:", e);
        setSaveError(e?.message || "Failed to save changes");
      } finally {
        setSaving(false);
      }
    })();
  }

  // 🔽 If something else requests opening the editor for a date in a different month,
  //     ask the parent to switch YM (so calendar + dropdown stay in sync), then open.
  useEffect(() => {
    const unsubscribe = onRequestOpenEditor((date) => {
      if (!(date instanceof Date) || isNaN(date)) return;

      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      const d = date.getDate();

      const switchMonth = y !== year || m !== month;

      if (switchMonth) {
        onChangeYM?.(y, m);
        // Defer editor opening to the next microtask so props update first
        setTimeout(() => openEditor(d), 0);
      } else {
        openEditor(d);
      }
    });

    return unsubscribe;
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (saveError) console.warn("ExpenseAnalysis saveError:", saveError);
  }, [saveError]);

  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  const monthDays = daysInMonth(year, month);
  const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

  const catPct = {
    creditCard: pct(monthByCategory.creditCard, monthTotal),
    emi: pct(monthByCategory.emi, monthTotal),
    mutualFund: pct(monthByCategory.mutualFund, monthTotal),
    stock: pct(monthByCategory.stock, monthTotal),
    shopping: pct(monthByCategory.shopping, monthTotal),
    grocery: pct(monthByCategory.grocery, monthTotal),
    rentBills: pct(monthByCategory.rentBills, monthTotal),
    other: pct(monthByCategory.other, monthTotal),
  };

  return (
    <section className="card">
      <HeaderControls
        year={year}
        month={month}
        expenses={flatAll}
        parseYMD={parseYMD}
        onChangeYM={onChangeYM}  // ✅ controlled change
      />

      <div className="ea-subtitle">
        {monthName} {year}
      </div>

      <SummaryCards
        fmtAmount={fmtAmount}
        monthTotal={monthTotal}
        catPct={catPct}
        monthByCategory={monthByCategory}
      />

      <DayTable
        year={year}
        month={month}
        monthDays={monthDays}
        totalsByDayInMonth={totalsByDayInMonth}
        emptyCats={emptyCats}
        fmtAmount={fmtAmount}
        pad2={pad2}
        canEditDay={canEditDay}
        onOpenEditor={openEditor}
      />

      <EditorModal
        editingDay={editingDay}
        categoryOptions={CATEGORY_OPTIONS}
        editRows={editRows}
        pendingDeleteIds={pendingDeleteIds}
        addRow={addRow}
        updateRow={updateRow}
        toggleDelete={toggleDelete}
        saveChanges={saving ? undefined : saveChanges}
        closeEditor={closeEditor}
        year={year}
        month={month}
        canEditDay={canEditDay}
      />
    </section>
  );
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2);
}
