
// src/components/expense-analysis/SummaryCards.jsx
import CategoryCard from "./CategoryCard"

export default function SummaryCards({ fmtAmount, monthTotal, catPct, monthByCategory }) {
  return (
    <div className="ea-cards">
      <div className="ea-card">
        <div className="muted">Total Expense</div>
        <div className="ea-amount-lg">{fmtAmount(monthTotal)}</div>
      </div>

      <CategoryCard title="Mutual Fund" percent={catPct.mutualFund}
        amount={fmtAmount(monthByCategory.mutualFund)} barClass="mf"
        info="Investments into mutual fund schemes (SIP/lump sum)." />

      <CategoryCard title="Stock Invested" percent={catPct.stock}
        amount={fmtAmount(monthByCategory.stock)} barClass="stock"
        info="Direct equity shares or ETFs purchased." />

      <CategoryCard title="Shopping" percent={catPct.shopping}
        amount={fmtAmount(monthByCategory.shopping)} barClass="shopping"
        info="General retail purchases (clothes, electronics, etc.)." />

      <CategoryCard title="Grocery" percent={catPct.grocery}
        amount={fmtAmount(monthByCategory.grocery)} barClass="grocery"
        info="Daily essentials and food items (vegetables, staples, etc.)." />

      <CategoryCard title="Rent/Bills" percent={catPct.rentBills}
        amount={fmtAmount(monthByCategory.rentBills)} barClass="rentBills"
        info="Recurring rent and household bills (electricity, gas, water, internet)." />

      <CategoryCard title="Other" percent={catPct.other}
        amount={fmtAmount(monthByCategory.other)} barClass="other"
        info="Miscellaneous expenses not categorized above." />
    </div>
  )
}
