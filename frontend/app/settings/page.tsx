"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, ApiKeys } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }
    // Load existing API keys
    setApiKeys(auth.getApiKeys());
  }, [router]);

  const handleSave = () => {
    auth.saveApiKeys(apiKeys);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = () => {
    auth.logout();
    router.push("/login");
  };

  const user = auth.getCurrentUser();

  return (
    <div className="min-h-screen animated-gradient p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto py-12 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 glass rounded-xl p-6 shadow-lg card-3d">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Settings</h1>
            <p className="text-gray-300">Manage your API keys and preferences</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-3 glass hover:bg-gray-700/50 rounded-lg transition-all btn-3d"
          >
            ← Back to Home
          </button>
        </div>

        {/* User Info */}
        <div className="glass-strong rounded-2xl p-6 mb-6 shadow-lg card-3d">
          <h2 className="text-2xl font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="text-white">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Member since:</span>
              <span className="text-white">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* API Keys */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl card-3d glow-hover">
          <h2 className="text-2xl font-semibold text-white mb-4">API Keys</h2>
          <p className="text-gray-400 mb-6">
            Your API keys are encrypted and stored only in your browser. We never see them.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hunter.io API Key
                <span className="text-gray-500 ml-2">(Email verification & domain search)</span>
              </label>
              <input
                type="password"
                value={apiKeys.hunter || ""}
                onChange={(e) => setApiKeys({ ...apiKeys, hunter: e.target.value })}
                placeholder="Enter your Hunter.io API key"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <a
                href="https://hunter.io/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                Get free API key →
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Shodan API Key
                <span className="text-gray-500 ml-2">(IP intelligence & port scanning)</span>
              </label>
              <input
                type="password"
                value={apiKeys.shodan || ""}
                onChange={(e) => setApiKeys({ ...apiKeys, shodan: e.target.value })}
                placeholder="Enter your Shodan API key"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <a
                href="https://account.shodan.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                Get free API key →
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                VirusTotal API Key
                <span className="text-gray-500 ml-2">(Malware detection & reputation)</span>
              </label>
              <input
                type="password"
                value={apiKeys.virustotal || ""}
                onChange={(e) => setApiKeys({ ...apiKeys, virustotal: e.target.value })}
                placeholder="Enter your VirusTotal API key"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <a
                href="https://www.virustotal.com/gui/my-apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                Get free API key →
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URLScan.io API Key
                <span className="text-gray-500 ml-2">(Website analysis & screenshots)</span>
              </label>
              <input
                type="password"
                value={apiKeys.urlscan || ""}
                onChange={(e) => setApiKeys({ ...apiKeys, urlscan: e.target.value })}
                placeholder="Enter your URLScan.io API key"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <a
                href="https://urlscan.io/user/profile/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                Get free API key →
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AlienVault OTX API Key
                <span className="text-gray-500 ml-2">(Threat intelligence)</span>
              </label>
              <input
                type="password"
                value={apiKeys.alienvault || ""}
                onChange={(e) => setApiKeys({ ...apiKeys, alienvault: e.target.value })}
                placeholder="Enter your AlienVault OTX API key"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <a
                href="https://otx.alienvault.com/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                Get free API key →
              </a>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSave}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all btn-3d shadow-lg glow"
            >
              {saved ? "✓ Saved!" : "Save API Keys"}
            </button>
          </div>

          <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              💡 <strong>Note:</strong> DNS, WHOIS, and GeoIP work without any API keys. 
              Add keys to unlock advanced features like port scanning, malware detection, and threat intelligence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
