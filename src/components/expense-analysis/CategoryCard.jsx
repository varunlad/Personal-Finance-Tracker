
// src/components/expense-analysis/CategoryCard.jsx
import Info from "./Info"

export default function CategoryCard({ title, percent, amount, barClass, info }) {
  return (
    <div className="ea-card">
      <div className="ea-card-row">
        <strong>{title}</strong>
        <span className="ea-percent">{percent}%</span>
        <Info text={info} />
      </div>
      <div className="ea-amount">{amount}</div>
      <div className="ea-bar">
        <div className={`ea-bar-fill ${barClass}`} style={{ width: percent + "%" }} />
      </div>
    </div>
  )
}
