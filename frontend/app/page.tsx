"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { auth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<"email" | "domain" | "ip">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check authentication
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
    } else if (!auth.hasCompletedOnboarding()) {
      router.push("/onboarding");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Get decrypted API keys using auth helper
      const apiKeys = auth.getApiKeys();

      const response = await axios.post(`${API_URL}/api/lookup`, {
        query: query.trim(),
        entity_type: entityType,
        depth: 1,
        api_keys: apiKeys,
      });

      const jobId = response.data.id;
      router.push(`/workspace/${jobId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start lookup");
    } finally {
      setLoading(false);
    }
  };

  const detectEntityType = (value: string) => {
    if (value.includes("@")) {
      setEntityType("email");
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
      setEntityType("ip");
    } else if (value.includes(".")) {
      setEntityType("domain");
    }
  };

  const handleLogout = () => {
    auth.logout();
    router.push("/login");
  };

  const user = auth.getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 animated-gradient relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="max-w-3xl w-full space-y-8 relative z-10">
        {/* Top Bar */}
        <div className="flex justify-between items-center glass rounded-xl p-4 shadow-lg">
          <div className="text-sm text-gray-300">
            Welcome, <span className="text-white font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.name}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/cases")}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg text-sm transition-all font-medium shadow-lg btn-3d"
            >
              📁 Cases
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="px-4 py-2 glass hover:bg-gray-700/50 rounded-lg text-sm transition-all btn-3d"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 glass hover:bg-gray-700/50 rounded-lg text-sm transition-all btn-3d"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-block mb-4 p-4 glass rounded-2xl glow float-animation">
            <div className="text-6xl">🔍</div>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
            OSINT Intelligence Graph Explorer
          </h1>
          <p className="text-gray-300 text-lg">
            Investigate emails, domains, and IPs with real-time OSINT enrichment
          </p>
        </div>

        {/* Search Form */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl card-3d glow-hover">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Entity Type Selector */}
            <div className="flex gap-2 p-1 glass rounded-xl">
              {(["email", "domain", "ip"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEntityType(type)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all btn-3d ${
                    entityType === type
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg glow"
                      : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  detectEntityType(e.target.value);
                }}
                placeholder={
                  entityType === "email"
                    ? "user@example.com"
                    : entityType === "domain"
                    ? "example.com"
                    : "192.168.1.1"
                }
                className="w-full px-6 py-5 glass border-2 border-gray-700/50 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 transition-all placeholder-gray-500 shadow-inner"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-2xl pointer-events-none">
                🔍
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full py-5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] btn-3d glow shadow-2xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Starting Investigation...
                </span>
              ) : (
                "Start Investigation"
              )}
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-5 glass rounded-xl card-3d smooth-transition hover:border-blue-500/50 shadow-lg">
            <div className="text-3xl mb-2">🔍</div>
            <div className="text-sm text-gray-200 font-medium">Multi-Source OSINT</div>
          </div>
          <div className="p-5 glass rounded-xl card-3d smooth-transition hover:border-purple-500/50 shadow-lg">
            <div className="text-3xl mb-2">🕸️</div>
            <div className="text-sm text-gray-200 font-medium">Graph Visualization</div>
          </div>
          <div className="p-5 glass rounded-xl card-3d smooth-transition hover:border-pink-500/50 shadow-lg">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-gray-200 font-medium">Real-Time Updates</div>
          </div>
        </div>
      </div>
    </div>
  );
}
