"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, ApiKeys } from "@/lib/auth";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Save API keys and complete onboarding
      auth.saveApiKeys(apiKeys);
      auth.completeOnboarding();
      router.push("/");
    }
  };

  const handleSkip = () => {
    auth.completeOnboarding();
    router.push("/");
  };

  return (
    <div className="min-h-screen animated-gradient p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto py-12 relative z-10">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Step {step} of {totalSteps}</span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Skip for now →
            </button>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="glass-strong rounded-2xl p-8 space-y-6 shadow-2xl card-3d glow-hover">
            <div className="text-center">
              <div className="inline-block mb-4 p-4 glass rounded-2xl glow float-animation">
                <div className="text-6xl">👋</div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                Welcome to OSINT Intelligence Graph Explorer!
              </h1>
              <p className="text-gray-300 text-lg">
                A professional platform for security investigations and threat intelligence
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="glass rounded-xl p-6 text-center card-3d smooth-transition hover:border-blue-500/50">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-semibold text-white mb-2">Multi-Source OSINT</h3>
                <p className="text-sm text-gray-300">
                  Aggregate data from 10+ intelligence sources
                </p>
              </div>
              <div className="glass rounded-xl p-6 text-center card-3d smooth-transition hover:border-purple-500/50">
                <div className="text-4xl mb-3">🕸️</div>
                <h3 className="font-semibold text-white mb-2">Graph Visualization</h3>
                <p className="text-sm text-gray-300">
                  See relationships in interactive graphs
                </p>
              </div>
              <div className="glass rounded-xl p-6 text-center card-3d smooth-transition hover:border-pink-500/50">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-semibold text-white mb-2">Real-Time Analysis</h3>
                <p className="text-sm text-gray-300">
                  Watch investigations unfold live
                </p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-lg font-bold text-lg transition-all btn-3d shadow-lg glow"
            >
              Let's Get Started
            </button>
          </div>
        )}

        {/* Step 2: How It Works */}
        {step === 2 && (
          <div className="glass-strong rounded-2xl p-8 space-y-6 shadow-2xl card-3d glow-hover">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">How It Works</h2>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Enter a Target</h3>
                  <p className="text-gray-400">
                    Search for an email, domain, or IP address you want to investigate
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Automatic Enrichment</h3>
                  <p className="text-gray-400">
                    We query multiple OSINT sources: DNS, WHOIS, Shodan, VirusTotal, and more
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Graph Visualization</h3>
                  <p className="text-gray-400">
                    See all relationships mapped in an interactive graph with risk scoring
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Deep Analysis</h3>
                  <p className="text-gray-400">
                    Click any node to see detailed information, export data, and add notes
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all btn-3d shadow-lg glow"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Privacy & Security */}
        {step === 3 && (
          <div className="glass-strong rounded-2xl p-8 space-y-6 shadow-2xl card-3d glow-hover">
            <div className="text-center mb-6">
              <div className="inline-block mb-4 p-4 glass rounded-2xl glow float-animation">
                <div className="text-5xl">🔐</div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-2">Your Privacy Matters</h2>
              <p className="text-gray-300">
                We take security seriously. Here's how we protect you:
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 flex gap-4">
                <div className="text-2xl">🔒</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">No Account Database</h3>
                  <p className="text-sm text-gray-400">
                    We don't store your personal information on our servers. Everything stays in your browser.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 flex gap-4">
                <div className="text-2xl">🔑</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Your API Keys</h3>
                  <p className="text-sm text-gray-400">
                    You provide your own API keys. They're encrypted and stored only in your browser's local storage.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 flex gap-4">
                <div className="text-2xl">🌐</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Client-Side Processing</h3>
                  <p className="text-sm text-gray-400">
                    Your searches are processed directly with OSINT providers. We never see your queries.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 flex gap-4">
                <div className="text-2xl">🗑️</div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Easy to Clear</h3>
                  <p className="text-sm text-gray-400">
                    Clear your browser data anytime to remove all traces. No server-side cleanup needed.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all btn-3d shadow-lg glow"
            >
              I Understand
            </button>
          </div>
        )}

        {/* Step 4: API Keys Setup */}
        {step === 4 && (
          <div className="glass-strong rounded-2xl p-8 space-y-6 shadow-2xl card-3d glow-hover">
            <div className="text-center mb-6">
              <div className="inline-block mb-4 p-4 glass rounded-2xl glow float-animation">
                <div className="text-5xl">🔑</div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">Configure Your API Keys</h2>
              <p className="text-gray-300">
                Add your own API keys to unlock full OSINT capabilities
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hunter.io API Key (Email verification)
                </label>
                <input
                  type="password"
                  value={apiKeys.hunter || ""}
                  onChange={(e) => setApiKeys({ ...apiKeys, hunter: e.target.value })}
                  placeholder="Optional - Get free key at hunter.io"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shodan API Key (IP intelligence)
                </label>
                <input
                  type="password"
                  value={apiKeys.shodan || ""}
                  onChange={(e) => setApiKeys({ ...apiKeys, shodan: e.target.value })}
                  placeholder="Optional - Get free key at shodan.io"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  VirusTotal API Key (Malware detection)
                </label>
                <input
                  type="password"
                  value={apiKeys.virustotal || ""}
                  onChange={(e) => setApiKeys({ ...apiKeys, virustotal: e.target.value })}
                  placeholder="Optional - Get free key at virustotal.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URLScan.io API Key (Website analysis)
                </label>
                <input
                  type="password"
                  value={apiKeys.urlscan || ""}
                  onChange={(e) => setApiKeys({ ...apiKeys, urlscan: e.target.value })}
                  placeholder="Optional - Get free key at urlscan.io"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AlienVault OTX API Key (Threat intelligence)
                </label>
                <input
                  type="password"
                  value={apiKeys.alienvault || ""}
                  onChange={(e) => setApiKeys({ ...apiKeys, alienvault: e.target.value })}
                  placeholder="Optional - Get free key at otx.alienvault.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                💡 <strong>Tip:</strong> You can skip this for now and add keys later in Settings. 
                DNS, WHOIS, and GeoIP work without any API keys!
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all btn-3d shadow-lg glow"
            >
              {Object.keys(apiKeys).length > 0 ? "Save & Start Investigating" : "Skip & Start Investigating"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
