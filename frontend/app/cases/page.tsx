"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CaseCardSkeleton } from "@/components/Skeletons";
import { auth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCase, setNewCase] = useState({
    title: "",
    description: "",
    priority: "medium",
    tags: ""
  });

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadCases();
  }, [router]);

  const loadCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cases`);
      setCases(response.data.cases || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load cases:", error);
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCase.title.trim()) {
      toast.error("Please enter a case title");
      return;
    }

    const toastId = toast.loading("Creating case...");

    try {
      await axios.post(`${API_URL}/api/cases`, {
        title: newCase.title,
        description: newCase.description,
        priority: newCase.priority,
        tags: newCase.tags.split(",").map(t => t.trim()).filter(t => t)
      });

      setNewCase({ title: "", description: "", priority: "medium", tags: "" });
      setShowCreateForm(false);
      await loadCases();
      toast.success("Case created successfully!", { id: toastId });
    } catch (error) {
      console.error("Failed to create case:", error);
      toast.error("Failed to create case. Please try again.", { id: toastId });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-red-400 bg-red-900/30";
      case "high": return "text-orange-400 bg-orange-900/30";
      case "medium": return "text-yellow-400 bg-yellow-900/30";
      case "low": return "text-green-400 bg-green-900/30";
      default: return "text-gray-400 bg-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "text-blue-400 bg-blue-900/30";
      case "in_progress": return "text-purple-400 bg-purple-900/30";
      case "closed": return "text-green-400 bg-green-900/30";
      case "archived": return "text-gray-400 bg-gray-800";
      default: return "text-gray-400 bg-gray-800";
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen animated-gradient p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 glass rounded-xl p-6 shadow-lg card-3d">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">Investigation Cases</h1>
            <p className="text-gray-300">Manage and track your OSINT investigations</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all font-semibold btn-3d shadow-lg glow"
            >
              + New Case
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-3 glass hover:bg-gray-700/50 rounded-lg transition-all btn-3d"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="glass-strong rounded-2xl p-8 mb-6 shadow-2xl card-3d glow-hover">
            <h2 className="text-2xl font-semibold text-white mb-6">Create New Case</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="e.g., Phishing Campaign Investigation"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Describe the investigation..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={newCase.priority}
                    onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newCase.tags}
                    onChange={(e) => setNewCase({ ...newCase, tags: e.target.value })}
                    placeholder="phishing, malware, apt"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateCase}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all font-semibold btn-3d shadow-lg"
                >
                  Create Case
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCase({ title: "", description: "", priority: "medium", tags: "" });
                  }}
                  className="px-6 py-3 glass hover:bg-gray-700/50 rounded-lg transition-all btn-3d"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cases Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <CaseCardSkeleton key={i} />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Cases Yet</h3>
            <p className="text-gray-400 mb-6">Create your first investigation case to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              Create First Case
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((case_) => (
              <div
                key={case_.id}
                onClick={() => router.push(`/cases/${case_.id}`)}
                className="glass rounded-2xl p-6 hover:border-blue-500/50 transition-all cursor-pointer group card-3d shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {case_.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(case_.priority)}`}>
                    {case_.priority}
                  </span>
                </div>

                {case_.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{case_.description}</p>
                )}

                <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                  <span>📊 {case_.entity_count} entities</span>
                  <span>🔍 {case_.job_count} jobs</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusColor(case_.status)}`}>
                    {case_.status.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(case_.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {case_.tags && case_.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {case_.tags.slice(0, 3).map((tag: string, idx: number) => (
                      <span key={idx} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
