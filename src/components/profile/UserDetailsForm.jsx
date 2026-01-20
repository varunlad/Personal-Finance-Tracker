
// src/components/profile/UserDetailsForm.jsx
export default function UserDetailsForm({ value, onChange }) {
  const update = (patch) => onChange({ ...value, ...patch })

  return (
    <form className="user-details-form" onSubmit={(e) => e.preventDefault()}>
      <div className="form-row">
        <label htmlFor="ud-name">Name</label>
        <input
          id="ud-name"
          type="text"
          value={value.name || ''}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      <div className="form-row">
        <label htmlFor="ud-email">Email</label>
        <input
          id="ud-email"
          type="email"
          value={value.email || ''}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
    </form>
  )
}
