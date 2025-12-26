
# Personal Finance Tracker Frontend

A modern, theme-aware React app to track daily expenses. Built with a clean component structure, in-memory auth (Login/Signup), and date-based grouping of expenses. Ready to be connected to a Node + MongoDB backend later.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)


## ✨ Features

- **Theme Toggle**: Light/Dark mode using CSS variables and Context.
- **Auth (UI only)**: In-memory **Login** and **Signup** pages with basic validation.
- **Protected Content**: `ProtectedContainer` gates the app until the user signs in.
- **Daily Expenses**: Add expenses and view them **grouped by date**, with per-day totals.
- **Modular Structure**: App shell orchestrates layout; all UI lives in separate components.

> Note: No persistence yet—data resets on reload. You can later wire APIs via Node + MongoDB.

---

## 📁 Project Structure

```
src/
  components/
    auth/
      AuthGate.jsx
      LoginPage.jsx
      SignupPage.jsx
    charts/
      ChartPanel.jsx
    common/
      ErrorBoundary.jsx
      ProtectedContainer.jsx
      SuspenseFallback.jsx
    daily/
      AddExpenseForm.jsx
      DaySection.jsx
      DailyExpensesPage.jsx
      ExpenseItem.jsx
    filters/
      FiltersPanel.jsx
    layout/
      AppContainer.jsx
      AppHeader.jsx
    summary/
      SummaryCards.jsx
    transactions/
      TransactionForm.jsx
      TransactionList.jsx
  context/
    AuthProvider.jsx
    ThemeProvider.jsx
    auth-context.js
    theme-context.js
  hooks/
    useDailyExpenses.js
  styles/
    index.css
    theme.css
  App.jsx
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Install & Run
```bash
# 1) Create and enter a Vite React app (if not already)
npm create vite@latest personal-finance-tracker -- --template react
cd personal-finance-tracker

# 2) Copy the src/ and styles from this repo into your project
#    (replace existing files where applicable)

# 3) Install dependencies (base React only for now)
npm install

# 4) Start the dev server
npm run dev
```

> If you later add charts, install: `npm install react-chartjs-2 chart.js`.

---

## 🧩 Key Concepts & Files

### Theme
- **Context**: `ThemeProvider.jsx`, `theme-context.js`
- **CSS Variables**: `theme.css` overrides applied via `theme-light` / `theme-dark` classes.
- **Body Sync**: `App.jsx` sets `document.body.className = theme-*` for global background/text.

### Auth (UI)
- **Context**: `AuthProvider.jsx`, `auth-context.js`
- **Pages**: `LoginPage.jsx`, `SignupPage.jsx`
- **Gate**: `AuthGate.jsx` toggles between login and signup when not authenticated.
- **Protection**: `ProtectedContainer.jsx` shows app content only when `user` exists.

### Daily Expenses
- **Hook**: `useDailyExpenses.js` (in-memory state, date grouping)
- **Components**: `DailyExpensesPage.jsx`, `DaySection.jsx`, `ExpenseItem.jsx`, `AddExpenseForm.jsx`
- **Date Key**: Normalized to `YYYY-MM-DD` for grouping.

---

## 🔌 Wiring to Node + MongoDB (later)

When you create your APIs, consider these endpoints:

- `POST /api/auth/signup` → create user
- `POST /api/auth/login` → authenticate, return token
- `POST /api/expenses` → add an expense `{ date, category, amount, note }`
- `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD` → list expenses in range
- `DELETE /api/expenses/:id` → delete

Client-side integration plan:
1. Replace mock `login`/`signup` in `AuthProvider.jsx` with real API calls.
2. Persist session (`localStorage` or cookies/JWT) and rehydrate `user` on app start.
3. Replace `useDailyExpenses` in-memory state with data fetched from your API.

---

## 🧪 Testing Ideas
- Unit test hooks (`useDailyExpenses`) for grouping and totals.
- Component tests for `LoginPage` and `SignupPage` validation states.
- Integration tests for `ProtectedContainer` (renders gate vs. content).

---

## 🧱 UI/UX Enhancements (optional)
- Smooth theme transitions (`transition: background 0.3s ease, color 0.3s ease;`).
- Date range filters (week/month) and CSV export.
- Calendar view with per-day totals.
- Toast notifications for add/delete actions.

---

## 📝 Scripts
Common scripts (Vite):
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 🛡️ License
MIT

---

## 🙌 Credits
Designed and implemented by Varun Lad. Built with React 18 + Vite.
