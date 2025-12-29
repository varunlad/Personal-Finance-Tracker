// src/components/expense-analysis/Info.jsx
export default function Info({ text }) {
  return (
    <span className="ea-info" tabIndex={0} aria-label={text}>
      🛈
      <span className="ea-tooltip" role="tooltip">
        {text}
      </span>
    </span>
  );
}
