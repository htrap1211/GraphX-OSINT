"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !name) {
      setError("Please fill in all fields");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    // Simple login (no backend validation)
    auth.login(email, name);
    
    // Redirect to onboarding or home
    if (!auth.hasCompletedOnboarding()) {
      router.push("/onboarding");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="inline-block mb-4 p-4 glass rounded-2xl glow">
            <div className="text-5xl">🔍</div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            OSINT Intelligence
          </h1>
          <h2 className="text-2xl font-semibold text-white mb-2 drop-shadow">Graph Explorer</h2>
          <p className="text-gray-300">
            Professional OSINT investigation platform
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl card-3d glow-hover">
          <h3 className="text-xl font-semibold text-white mb-6">Get Started</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all transform hover:scale-[1.02] btn-3d glow shadow-lg"
            >
              Continue
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center">
              🔒 No account creation required. Your data stays in your browser.
              <br />
              We don't store any personal information on our servers.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="glass rounded-xl p-4 card-3d smooth-transition hover:border-blue-500/50">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-xs text-gray-300 font-medium">10+ OSINT Sources</div>
          </div>
          <div className="glass rounded-xl p-4 card-3d smooth-transition hover:border-purple-500/50">
            <div className="text-2xl mb-2">🕸️</div>
            <div className="text-xs text-gray-300 font-medium">Graph Visualization</div>
          </div>
          <div className="glass rounded-xl p-4 card-3d smooth-transition hover:border-pink-500/50">
            <div className="text-2xl mb-2">🔐</div>
            <div className="text-xs text-gray-300 font-medium">Your API Keys</div>
          </div>
        </div>
      </div>
    </div>
  );
}
