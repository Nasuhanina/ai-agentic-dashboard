import { useState } from "react";
import { login } from "../api";
import type { Session } from "../types";

const DEMO_ACCOUNTS = [
  { label: "Admin", username: "admin", password: "admin123" },
  { label: "Customer", username: "customer", password: "customer123" },
];

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      onLogin(await login(username.trim(), password));
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M4 20l5-11 5 7 3-4 3 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-ink-900">Customer Insights</h1>
            <p className="text-xs text-ink-500">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="username"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="password"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5">
          <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-ink-400">
            Demo accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => {
                  setUsername(account.username);
                  setPassword(account.password);
                  setError(null);
                }}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-left transition hover:bg-ink-50"
              >
                <span className="block text-xs font-semibold text-ink-700">{account.label}</span>
                <span className="block text-[11px] text-ink-400">{account.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
