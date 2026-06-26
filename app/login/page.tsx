"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    router.push("/crm");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f12] via-[#09090b] to-[#09090b] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#111113] border border-[#27272a] mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d4a843"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Gulf Life CRM
          </h1>
          <p className="text-[#71717a] text-sm mt-1">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-[#111113] border border-[#27272a] rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-white placeholder:text-[#3f3f46] text-sm focus:outline-none focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-lg text-white placeholder:text-[#3f3f46] text-sm focus:outline-none focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#d4a843] hover:bg-[#e8c06a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg text-sm transition-colors mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#3f3f46] mt-6">
          Gulf Life Concierge · Internal CRM
        </p>
      </div>
    </div>
  );
}
