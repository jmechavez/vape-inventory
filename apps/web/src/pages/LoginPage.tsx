import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const API_URL = import.meta.env.VITE_API_URL;

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Vape Inventory</title>
        <meta name="description" content="Login to your inventory management system" />
      </Helmet>

      <div className="min-h-dvh bg-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg animate-scale-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg overflow-hidden">
              <img
                src="/logo.png"
                alt="Vape Inventory"
                className="h-16 w-16 object-contain"
              />
            </div>
            <h1 className="mt-4 text-3xl font-black text-zinc-950">Vape Inventory</h1>
            <p className="text-lg text-zinc-500">Management System</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-lg text-red-700 mb-4 animate-fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-500">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-14 rounded-xl bg-black text-white font-bold text-xl transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-lg text-zinc-400">
            Default: <span className="font-mono font-bold text-zinc-600">admin / admin123</span>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-200 text-center">
            <p className="text-sm text-zinc-400">
              © {new Date().getFullYear()} Vape Inventory. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
