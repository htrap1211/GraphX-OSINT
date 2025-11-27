"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EntityCardSkeleton, StatsSkeleton } from "@/components/Skeletons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;
  
  const [caseData, setCaseData] = useState<any>(null);
  const [entities, setEntities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [entityType, setEntityType] = useState("email");
  const [entityValue, setEntityValue] = useState("");

  useEffect(() => {
    loadCase();
    loadEntities();
    loadStats();
  }, [caseId]);

  const loadCase = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cases/${caseId}`);
      setCaseData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load case:", error);
      setLoading(false);
    }
  };

  const loadEntities = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cases/${caseId}/entities`);
      console.log("Loaded entities:", response.data.entities);
      setEntities(response.data.entities || []);
    } catch (error) {
      console.error("Failed to load entities:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cases/${caseId}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      await axios.patch(`${API_URL}/api/cases/${caseId}`, { status });
      await loadCase();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const addEntity = async () => {
    if (!entityValue.trim()) return;
    
    const toastId = toast.loading("Adding entity...");
    
    try {
      await axios.post(`${API_URL}/api/cases/${caseId}/entities`, {
        entity_id: entityValue.trim(),
        entity_type: entityType
      });
      
      setEntityValue("");
      setShowAddEntity(false);
      await loadEntities();
      await loadCase();
      await loadStats();
      toast.success("Entity added successfully!", { id: toastId });
    } catch (error) {
      console.error("Failed to add entity:", error);
      toast.error("Failed to add entity. Make sure it exists in the graph.", { id: toastId });
    }
  };

  const removeEntity = async (entityId: string, entityName: string) => {
    if (!confirm(`Remove "${entityName}" from this case?`)) return;
    
    const toastId = toast.loading("Removing entity...");
    
    try {
      await axios.delete(`${API_URL}/api/cases/${caseId}/entities/${entityId}`);
      await loadEntities();
      await loadCase();
      await loadStats();
      toast.success("Entity removed from case", { id: toastId });
    } catch (error) {
      console.error("Failed to remove entity:", error);
      toast.error("Failed to remove entity. Please try again.", { id: toastId });
    }
  };

  const deleteCase = async () => {
    if (!confirm(`Are you sure you want to delete this case: "${caseData.title}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    const toastId = toast.loading("Deleting case...");
    
    try {
      await axios.delete(`${API_URL}/api/cases/${caseId}`);
      toast.success("Case deleted successfully", { id: toastId });
      router.push("/cases");
    } catch (error) {
      console.error("Failed to delete case:", error);
      toast.error("Failed to delete case. Please try again.", { id: toastId });
    }
  };

  const generateReport = async () => {
    const toastId = toast.loading("Generating PDF report...");
    
    try {
      const response = await axios.get(`${API_URL}/api/cases/${caseId}/report`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `case-${caseData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF report generated successfully!", { id: toastId });
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate PDF report. Please try again.", { id: toastId });
    }
  };

  const exportCase = () => {
    const exportData = {
      case: caseData,
      entities: entities,
      exported_at: new Date().toISOString(),
      export_version: "1.0"
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `case-${caseData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-10 w-64 bg-gray-800 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-96 bg-gray-800 rounded animate-pulse"></div>
            </div>
            <StatsSkeleton />
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="h-6 w-48 bg-gray-800 rounded animate-pulse mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <EntityCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Case Not Found</h2>
          <button
            onClick={() => router.push("/cases")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{caseData.title}</h1>
              <span className={`text-xs px-3 py-1 rounded font-medium ${
                caseData.priority === 'critical' ? 'bg-red-900/30 text-red-400' :
                caseData.priority === 'high' ? 'bg-orange-900/30 text-orange-400' :
                caseData.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                'bg-green-900/30 text-green-400'
              }`}>
                {caseData.priority}
              </span>
            </div>
            {caseData.description && (
              <p className="text-gray-400">{caseData.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              title="Generate PDF Report"
            >
              📄 Report
            </button>
            <button
              onClick={exportCase}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              title="Export Case Data"
            >
              📥 Export
            </button>
            <button
              onClick={deleteCase}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              title="Delete Case"
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => router.push("/cases")}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['open', 'in_progress', 'closed', 'archived'].map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    caseData.status === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {status.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>📊 {caseData.entity_count} entities</span>
              <span>🔍 {caseData.job_count} jobs</span>
              <span>📅 {new Date(caseData.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {stats && stats.total_entities > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">📈 Case Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Entity Breakdown */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Entity Types</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">📧 Emails</span>
                    <span className="text-lg font-bold text-teal-400">{stats.entity_breakdown.emails}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">🌐 Domains</span>
                    <span className="text-lg font-bold text-blue-400">{stats.entity_breakdown.domains}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">🔌 IPs</span>
                    <span className="text-lg font-bold text-purple-400">{stats.entity_breakdown.ips}</span>
                  </div>
                </div>
              </div>

              {/* Risk Breakdown */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Risk Distribution</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">🔴 High Risk</span>
                    <span className="text-lg font-bold text-red-400">{stats.risk_breakdown.high}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">🟡 Medium Risk</span>
                    <span className="text-lg font-bold text-yellow-400">{stats.risk_breakdown.medium}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">🟢 Low Risk</span>
                    <span className="text-lg font-bold text-green-400">{stats.risk_breakdown.low}</span>
                  </div>
                </div>
              </div>

              {/* Average Risk Score */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Average Risk Score</h3>
                <div className="flex flex-col items-center justify-center h-20">
                  <div className={`text-4xl font-bold ${
                    stats.average_risk_score >= 60 ? 'text-red-400' :
                    stats.average_risk_score >= 30 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {stats.average_risk_score}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">out of 100</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entities */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Case Entities</h2>
            <button
              onClick={() => setShowAddEntity(!showAddEntity)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Entity
            </button>
          </div>

          {/* Add Entity Form */}
          {showAddEntity && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
              <h3 className="text-sm font-medium text-white mb-3">Add Entity to Case</h3>
              <div className="flex gap-3">
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="domain">Domain</option>
                  <option value="ip">IP Address</option>
                </select>
                <input
                  type="text"
                  value={entityValue}
                  onChange={(e) => setEntityValue(e.target.value)}
                  placeholder={`Enter ${entityType}...`}
                  className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && addEntity()}
                />
                <button
                  onClick={addEntity}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddEntity(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: The entity must already exist in your graph. Run a lookup first if needed.
              </p>
            </div>
          )}

          {entities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No entities added yet. Click "Add Entity" to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors border border-gray-700"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">
                        {entity.type === 'Email' ? '📧' : entity.type === 'Domain' ? '🌐' : '🔌'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white break-all">
                          {entity.properties.address || entity.properties.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{entity.type}</div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Score */}
                  {entity.properties.risk_score !== undefined && entity.properties.risk_score !== null ? (
                    <div className={`rounded p-2 mb-2 ${
                      entity.properties.risk_level === 'HIGH' ? 'bg-red-900/30 border border-red-800/30' :
                      entity.properties.risk_level === 'MEDIUM' ? 'bg-yellow-900/30 border border-yellow-800/30' :
                      'bg-green-900/30 border border-green-800/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">Risk Score</span>
                        <span className={`text-lg font-bold ${
                          entity.properties.risk_level === 'HIGH' ? 'text-red-400' :
                          entity.properties.risk_level === 'MEDIUM' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {entity.properties.risk_score}
                        </span>
                      </div>
                      <div className={`text-xs font-medium mt-1 ${
                        entity.properties.risk_level === 'HIGH' ? 'text-red-300' :
                        entity.properties.risk_level === 'MEDIUM' ? 'text-yellow-300' :
                        'text-green-300'
                      }`}>
                        {entity.properties.risk_level || 'UNKNOWN'} RISK
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-700/30 border border-gray-600/30 rounded p-2 mb-2">
                      <div className="text-xs text-gray-400 text-center">
                        No risk assessment available
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="space-y-1">
                    {/* Email specific */}
                    {entity.type === 'Email' && entity.properties.breach_count > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Breaches</span>
                        <span className="text-red-400 font-medium">{entity.properties.breach_count}</span>
                      </div>
                    )}
                    {entity.type === 'Email' && entity.properties.score !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Deliverability</span>
                        <span className="text-white font-medium">{entity.properties.score}/100</span>
                      </div>
                    )}

                    {/* Domain specific */}
                    {entity.type === 'Domain' && entity.properties.domain_age_days !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Age</span>
                        <span className="text-white font-medium">{entity.properties.domain_age_days} days</span>
                      </div>
                    )}
                    {entity.type === 'Domain' && entity.properties.registrar && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Registrar</span>
                        <span className="text-white font-medium truncate ml-2">{entity.properties.registrar}</span>
                      </div>
                    )}

                    {/* IP specific */}
                    {entity.type === 'IP' && entity.properties.country && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Country</span>
                        <span className="text-white font-medium">{entity.properties.country}</span>
                      </div>
                    )}
                    {entity.type === 'IP' && entity.properties.isp && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">ISP</span>
                        <span className="text-white font-medium truncate ml-2">{entity.properties.isp}</span>
                      </div>
                    )}
                    {entity.type === 'IP' && entity.properties.open_ports && entity.properties.open_ports.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Open Ports</span>
                        <span className="text-red-400 font-medium">{entity.properties.open_ports.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {entity.properties.tags && entity.properties.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entity.properties.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className={`text-xs px-2 py-0.5 rounded ${
                          tag === 'malicious' ? 'bg-red-900/30 text-red-400' :
                          tag === 'suspicious' ? 'bg-orange-900/30 text-orange-400' :
                          tag === 'benign' || tag === 'legitimate' ? 'bg-green-900/30 text-green-400' :
                          'bg-blue-900/30 text-blue-400'
                        }`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-gray-700 flex gap-2">
                    <button
                      onClick={() => removeEntity(entity.id, entity.properties.address || entity.properties.name)}
                      className="flex-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium transition-colors border border-red-800/30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
