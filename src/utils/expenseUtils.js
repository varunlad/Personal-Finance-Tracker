
// src/utils/expenseUtils.js
export function parseYMD(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function filterByCustomRange(dayGroups, startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return dayGroups.filter(group => {
    const date = parseYMD(group.date);
    return date >= start && date <= end;
  });
}

export function categoryTotalsMap(dayGroups) {
  const totals = new Map();
  dayGroups.forEach(group => {
    group.items.forEach(item => {
      const amt = Number(item.amount) || 0;
      totals.set(item.category, (totals.get(item.category) || 0) + amt);
    });
  });
  return totals;
}

export function formatINR(amount, symbol = '₹') {
  return `${symbol}${(Number(amount) || 0).toLocaleString('en-IN')}`;
}
