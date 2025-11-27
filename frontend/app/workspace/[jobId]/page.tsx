"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import toast from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Register layout
if (typeof window !== "undefined") {
  cytoscape.use(fcose);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

// Node type configurations with colors, shapes, and icons
const NODE_CONFIG = {
  Email: { 
    color: "#14b8a6", // teal
    shape: "roundrectangle",
    icon: "📧",
    size: 70
  },
  Domain: { 
    color: "#3b82f6", // blue
    shape: "hexagon",
    icon: "🌐",
    size: 75
  },
  IP: { 
    color: "#8b5cf6", // purple
    shape: "ellipse",
    icon: "🔌",
    size: 65
  },
  Breach: { 
    color: "#ef4444", // red
    shape: "diamond",
    icon: "🔓",
    size: 60
  },
  Person: { 
    color: "#eab308", // yellow
    shape: "triangle",
    icon: "👤",
    size: 55
  },
  Organization: { 
    color: "#10b981", // green
    shape: "rectangle",
    icon: "🏢",
    size: 70
  },
  ScanJob: { 
    color: "#6b7280", // gray
    shape: "ellipse",
    icon: "🔍",
    size: 50
  }
};

// Relationship type labels
const RELATIONSHIP_LABELS = {
  EXPOSED_IN: "Exposed In",
  RESOLVES_TO: "Resolves To",
  REGISTERED_TO: "Registered To",
  REGISTERED_WITH: "Registered With",
  HAS_EMAIL: "Has Email",
  HOSTED_BY: "Hosted By",
  SCANNED: "Scanned",
  OWNED_BY: "Owned By",
  ASSOCIATED_WITH: "Associated With"
};

export default function WorkspacePage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<any>(null);

  const [job, setJob] = useState<any>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Notes & Tags state
  const [notes, setNotes] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  
  // Pivot menu state
  const [pivotMenu, setPivotMenu] = useState<{show: boolean, x: number, y: number, node: GraphNode | null}>({
    show: false,
    x: 0,
    y: 0,
    node: null
  });
  
  // Case management state
  const [cases, setCases] = useState<any[]>([]);
  const [showAddToCase, setShowAddToCase] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  
  const predefinedTags = [
    "malicious", "suspicious", "benign", "to_review", 
    "infrastructure", "phishing", "malware", "c2", 
    "botnet", "legitimate", "false_positive"
  ];

  // Fetch job status
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/job/${jobId}`);
        setJob(response.data);
      } catch (error) {
        console.error("Failed to fetch job:", error);
      }
    };

    fetchJob();
    const interval = setInterval(fetchJob, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  // Fetch graph data
  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/graph/${jobId}`);
        setNodes(response.data.nodes || []);
        setEdges(response.data.edges || []);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch graph:", error);
        setLoading(false);
      }
    };

    fetchGraph();
    const interval = setInterval(fetchGraph, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  // Calculate risk score for a node (use backend score if available)
  const calculateRiskScore = (node: GraphNode): number => {
    const props = node.properties;
    
    // Use backend-calculated risk score if available
    if (props.risk_score !== undefined && props.risk_score !== null) {
      return props.risk_score;
    }
    
    // Fallback to client-side calculation
    let risk = 0;
    
    // Email risk factors
    if (node.label === "Email") {
      if (props.breach_count > 0) risk += props.breach_count * 20;
      if (props.score && props.score < 50) risk += 30;
    }
    
    // Domain risk factors
    if (node.label === "Domain") {
      if (props.domain_age_days && props.domain_age_days < 30) risk += 40;
      if (props.domain_age_days && props.domain_age_days < 90) risk += 20;
    }
    
    // IP risk factors
    if (node.label === "IP") {
      if (props.is_proxy) risk += 30;
      if (props.is_hosting) risk += 20;
    }
    
    return Math.min(risk, 100);
  };

  // Get risk color
  const getRiskColor = (risk: number): string => {
    if (risk >= 60) return "#ef4444"; // red (HIGH)
    if (risk >= 30) return "#f59e0b"; // orange (MEDIUM)
    return "#10b981"; // green (LOW)
  };
  
  // Get risk level label
  const getRiskLevel = (risk: number): string => {
    if (risk >= 60) return "HIGH";
    if (risk >= 30) return "MEDIUM";
    return "LOW";
  };
  
  // Load notes and tags when node is selected
  useEffect(() => {
    if (selectedNode) {
      loadNotesAndTags();
    }
  }, [selectedNode]);
  
  // Load cases
  useEffect(() => {
    loadCases();
  }, []);
  
  const loadCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cases`);
      setCases(response.data.cases || []);
    } catch (error) {
      console.error("Failed to load cases:", error);
    }
  };
  
  const loadNotesAndTags = async () => {
    if (!selectedNode) return;
    
    const entityId = selectedNode.properties.address || selectedNode.properties.name || selectedNode.id;
    
    try {
      // Load notes
      const notesRes = await axios.get(`${API_URL}/api/notes/${entityId}`);
      setNotes(notesRes.data.notes || []);
      
      // Load tags
      const tagsRes = await axios.get(`${API_URL}/api/tags/${entityId}`);
      setTags(tagsRes.data.tags || []);
    } catch (error) {
      console.error("Failed to load notes/tags:", error);
    }
  };
  
  const handleAddNote = async () => {
    if (!selectedNode || !newNote.trim()) return;
    
    const entityId = selectedNode.properties.address || selectedNode.properties.name;
    const entityType = selectedNode.label.toLowerCase();
    
    try {
      await axios.post(`${API_URL}/api/notes`, {
        entity_id: entityId,
        entity_type: entityType,
        content: newNote
      });
      
      setNewNote("");
      setShowNoteForm(false);
      await loadNotesAndTags();
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };
  
  const handleDeleteNote = async (noteId: string) => {
    try {
      await axios.delete(`${API_URL}/api/notes/${noteId}`);
      await loadNotesAndTags();
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };
  
  const handleAddTag = async (tag: string) => {
    if (!selectedNode) return;
    
    const entityId = selectedNode.properties.address || selectedNode.properties.name;
    const entityType = selectedNode.label.toLowerCase();
    
    try {
      await axios.post(`${API_URL}/api/tags`, {
        entity_id: entityId,
        entity_type: entityType,
        tag: tag
      });
      
      setNewTag("");
      setShowTagForm(false);
      await loadNotesAndTags();
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };
  
  const handleRemoveTag = async (tag: string) => {
    if (!selectedNode) return;
    
    const entityId = selectedNode.properties.address || selectedNode.properties.name;
    const entityType = selectedNode.label.toLowerCase();
    
    try {
      await axios.delete(`${API_URL}/api/tags`, {
        data: {
          entity_id: entityId,
          entity_type: entityType,
          tag: tag
        }
      });
      
      await loadNotesAndTags();
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };
  
  const handleAddToCase = async () => {
    if (!selectedNode || !selectedCaseId) return;
    
    const entityId = selectedNode.properties.address || selectedNode.properties.name;
    const entityType = selectedNode.label.toLowerCase();
    
    const toastId = toast.loading("Adding entity to case...");
    
    try {
      await axios.post(`${API_URL}/api/cases/${selectedCaseId}/entities`, {
        entity_id: entityId,
        entity_type: entityType
      });
      
      setShowAddToCase(false);
      setSelectedCaseId("");
      toast.success("Entity added to case successfully!", { id: toastId });
    } catch (error) {
      console.error("Failed to add entity to case:", error);
      toast.error("Failed to add entity to case. Please try again.", { id: toastId });
    }
  };
  
  // Pivot action handler
  const handlePivot = async (pivotType: string) => {
    if (!pivotMenu.node) return;
    
    const entityId = pivotMenu.node.properties.address || pivotMenu.node.properties.name;
    const entityType = pivotMenu.node.label.toLowerCase();
    
    setPivotMenu({ show: false, x: 0, y: 0, node: null });
    
    try {
      const response = await axios.post(
        `${API_URL}/api/pivot/${entityType}/${entityId}?pivot_type=${pivotType}&depth=1`
      );
      
      if (response.data.success && response.data.entities.length > 0) {
        // Add new nodes to the graph
        const newNodes = response.data.entities.map((entity: any) => ({
          id: entity.id,
          label: entity.label,
          properties: entity.properties
        }));
        
        // Update nodes state
        setNodes(prevNodes => {
          const existingIds = new Set(prevNodes.map(n => n.id));
          const uniqueNewNodes = newNodes.filter((n: GraphNode) => !existingIds.has(n.id));
          return [...prevNodes, ...uniqueNewNodes];
        });
        
        // Refresh graph
        setTimeout(() => {
          const fetchGraph = async () => {
            try {
              const response = await axios.get(`${API_URL}/api/graph/${jobId}`);
              setNodes(response.data.nodes || []);
              setEdges(response.data.edges || []);
            } catch (error) {
              console.error("Failed to refresh graph:", error);
            }
          };
          fetchGraph();
        }, 500);
      }
    } catch (error) {
      console.error("Pivot failed:", error);
    }
  };

  // Initialize Cytoscape
  useEffect(() => {
    if (!cyRef.current || nodes.length === 0) return;

    const elements = [
      ...nodes.map((node) => {
        const config = NODE_CONFIG[node.label as keyof typeof NODE_CONFIG] || NODE_CONFIG.ScanJob;
        const risk = calculateRiskScore(node);
        
        return {
          data: {
            id: node.id,
            label: node.properties.address || node.properties.name || node.label,
            type: node.label,
            risk,
            ...node.properties,
          },
        };
      }),
      ...edges.map((edge, idx) => ({
        data: {
          id: `edge-${idx}`,
          source: edge.source,
          target: edge.target,
          label: RELATIONSHIP_LABELS[edge.type as keyof typeof RELATIONSHIP_LABELS] || edge.type,
          relType: edge.type,
          ...edge.properties,
        },
      })),
    ];

    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: any) => {
              const config = NODE_CONFIG[ele.data("type") as keyof typeof NODE_CONFIG];
              return config?.color || "#6b7280";
            },
            shape: (ele: any) => {
              const config = NODE_CONFIG[ele.data("type") as keyof typeof NODE_CONFIG];
              return (config?.shape || "ellipse") as any;
            },
            label: "data(label)",
            color: "#fff",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "11px",
            "font-weight": "600",
            "text-outline-width": 2,
            "text-outline-color": (ele: any) => {
              const config = NODE_CONFIG[ele.data("type") as keyof typeof NODE_CONFIG];
              return config?.color || "#6b7280";
            },
            width: (ele: any) => {
              const config = NODE_CONFIG[ele.data("type") as keyof typeof NODE_CONFIG];
              return config?.size || 60;
            },
            height: (ele: any) => {
              const config = NODE_CONFIG[ele.data("type") as keyof typeof NODE_CONFIG];
              return config?.size || 60;
            },
            "border-width": 3,
            "border-color": (ele: any) => {
              const risk = ele.data("risk") || 0;
              return getRiskColor(risk);
            },
            "border-opacity": 0.8,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2.5,
            "line-color": "#4b5563",
            "target-arrow-color": "#4b5563",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "9px",
            "font-weight": "500",
            color: "#9ca3af",
            "text-rotation": "autorotate",
            "text-margin-y": -12,
            "text-background-color": "#1f2937",
            "text-background-opacity": 0.8,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 5,
            "border-color": "#fbbf24",
            "overlay-opacity": 0.2,
            "overlay-color": "#fbbf24",
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "#fbbf24",
            "target-arrow-color": "#fbbf24",
            width: 4,
          },
        },
      ],
      layout: {
        name: "fcose",
        quality: "default",
        randomize: false,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 60,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
      },
    });

    // Node click handler
    cyInstance.current.on("tap", "node", (evt: any) => {
      const node = evt.target;
      const nodeData = nodes.find((n) => n.id === node.id());
      if (nodeData) {
        setSelectedNode(nodeData);
      }
    });
    
    // Right-click handler for pivot menu
    cyInstance.current.on("cxttap", "node", (evt: any) => {
      const node = evt.target;
      const nodeData = nodes.find((n) => n.id === node.id());
      if (nodeData) {
        const position = evt.renderedPosition || evt.position;
        setPivotMenu({
          show: true,
          x: position.x,
          y: position.y,
          node: nodeData
        });
      }
    });

    // Node hover handler - cursor is handled via CSS on the container

    // Double-click to expand neighbors
    cyInstance.current.on("dbltap", "node", (evt: any) => {
      const node = evt.target;
      const neighbors = node.neighborhood();
      neighbors.animate({
        style: { opacity: 1 },
        duration: 500,
      });
    });

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }
    };
  }, [nodes, edges]);

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-950">
      {/* Top Bar */}
      <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <a href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            OSINT Explorer
          </a>
          {job && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">|</span>
              <span className="text-gray-300">{job.query}</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  job.status === "completed"
                    ? "bg-green-900/30 text-green-400"
                    : job.status === "running"
                    ? "bg-blue-900/30 text-blue-400"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {job.status}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.location.href = "/cases"}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors font-medium"
          >
            📁 Cases
          </button>
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
            Export
          </button>
          <button 
            onClick={() => window.location.href = "/settings"}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Settings
          </button>
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.clear();
                window.location.href = "/login";
              }
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Graph Canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400">Loading graph data...</p>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400">No data available yet. Enrichment in progress...</p>
            </div>
          ) : (
            <div ref={cyRef} className="w-full h-full cursor-pointer" />
          )}
        </div>

        {/* Right Panel - Enhanced Details */}
        {selectedNode && (
          <div className="w-[480px] bg-gray-900 border-l border-gray-800 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">
                      {NODE_CONFIG[selectedNode.label as keyof typeof NODE_CONFIG]?.icon || "📍"}
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {selectedNode.properties.address || selectedNode.properties.name || selectedNode.label}
                      </h2>
                      <p className="text-sm text-gray-400">{selectedNode.label}</p>
                    </div>
                  </div>
                  
                  {/* Risk Score */}
                  {(() => {
                    const risk = calculateRiskScore(selectedNode);
                    const riskColor = getRiskColor(risk);
                    const riskLabel = risk >= 70 ? "High Risk" : risk >= 40 ? "Medium Risk" : "Low Risk";
                    return (
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${risk}%`, backgroundColor: riskColor }}
                          />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: riskColor }}>
                          {riskLabel}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  ✕
                </button>
              </div>

              {/* Add to Case Section */}
              {(selectedNode.label === "Email" || selectedNode.label === "Domain" || selectedNode.label === "IP") && (
                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📁</span>
                      <h3 className="text-sm font-semibold text-blue-400 uppercase">Case Management</h3>
                    </div>
                    <button
                      onClick={() => setShowAddToCase(!showAddToCase)}
                      className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors font-medium"
                    >
                      {showAddToCase ? "Cancel" : "+ Add to Case"}
                    </button>
                  </div>
                  
                  {showAddToCase && (
                    <div className="space-y-3">
                      {cases.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400 mb-3">No cases available</p>
                          <button
                            onClick={() => window.location.href = "/cases"}
                            className="text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                          >
                            Create a Case
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            value={selectedCaseId}
                            onChange={(e) => setSelectedCaseId(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a case...</option>
                            {cases.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title} ({c.status})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleAddToCase}
                            disabled={!selectedCaseId}
                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                          >
                            Add Entity to Case
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Risk Analysis Panel - Show for all entity types */}
              {selectedNode.properties.risk_score !== undefined && (
                <div className={`rounded-lg p-4 border ${
                  selectedNode.properties.risk_level === 'HIGH' ? 'bg-red-900/20 border-red-800/30' :
                  selectedNode.properties.risk_level === 'MEDIUM' ? 'bg-orange-900/20 border-orange-800/30' :
                  'bg-green-900/20 border-green-800/30'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{selectedNode.properties.risk_level === 'HIGH' ? '⚠️' : selectedNode.properties.risk_level === 'MEDIUM' ? '⚡' : '✅'}</span>
                    <h3 className={`text-sm font-semibold uppercase ${
                      selectedNode.properties.risk_level === 'HIGH' ? 'text-red-400' :
                      selectedNode.properties.risk_level === 'MEDIUM' ? 'text-orange-400' :
                      'text-green-400'
                    }`}>Risk Analysis</h3>
                  </div>
                  <div className="space-y-3">
                    <div className={`rounded p-3 ${
                      selectedNode.properties.risk_level === 'HIGH' ? 'bg-red-900/30' :
                      selectedNode.properties.risk_level === 'MEDIUM' ? 'bg-orange-900/30' :
                      'bg-green-900/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">Risk Score</span>
                        <span className={`text-2xl font-bold ${
                          selectedNode.properties.risk_level === 'HIGH' ? 'text-red-400' :
                          selectedNode.properties.risk_level === 'MEDIUM' ? 'text-orange-400' :
                          'text-green-400'
                        }`}>
                          {selectedNode.properties.risk_score}/100
                        </span>
                      </div>
                      <div className={`text-xs font-medium ${
                        selectedNode.properties.risk_level === 'HIGH' ? 'text-red-300' :
                        selectedNode.properties.risk_level === 'MEDIUM' ? 'text-orange-300' :
                        'text-green-300'
                      }`}>
                        {selectedNode.properties.risk_level} RISK
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-2 font-semibold">Risk Factors:</div>
                      <div className="space-y-1">
                        {selectedNode.properties.risk_reasons.map((reason: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`mt-0.5 ${
                              selectedNode.properties.risk_level === 'HIGH' ? 'text-red-400' :
                              selectedNode.properties.risk_level === 'MEDIUM' ? 'text-orange-400' :
                              'text-green-400'
                            }`}>•</span>
                            <span className="text-gray-300">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Details */}
              {selectedNode.label === "Email" && (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">📧 Email Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Address</span>
                        <span className="text-white text-sm font-mono">{selectedNode.properties.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hunter.io Data */}
                  {(selectedNode.properties.score !== undefined || selectedNode.properties.status) && (
                    <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 border border-orange-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🎯</span>
                        <h3 className="text-sm font-semibold text-orange-400 uppercase">Hunter.io Verification</h3>
                      </div>
                      <div className="space-y-2">
                        {selectedNode.properties.score !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Deliverability Score</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-orange-500 h-2 rounded-full"
                                  style={{ width: `${selectedNode.properties.score}%` }}
                                />
                              </div>
                              <span className="text-orange-400 text-sm font-bold">{selectedNode.properties.score}/100</span>
                            </div>
                          </div>
                        )}
                        {selectedNode.properties.status && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Status</span>
                            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                              selectedNode.properties.status === 'valid' ? 'bg-green-900/30 text-green-400' :
                              selectedNode.properties.status === 'invalid' ? 'bg-red-900/30 text-red-400' :
                              'bg-yellow-900/30 text-yellow-400'
                            }`}>
                              {selectedNode.properties.status}
                            </span>
                          </div>
                        )}
                        {selectedNode.properties.result && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Result</span>
                            <span className="text-white text-sm">{selectedNode.properties.result}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Breach Data */}
                  {selectedNode.properties.breach_count > 0 && (
                    <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🔓</span>
                        <h3 className="text-sm font-semibold text-red-400 uppercase">Breach History</h3>
                      </div>
                      <div className="bg-red-900/20 rounded p-3 mb-2">
                        <div className="text-2xl font-bold text-red-400 mb-1">
                          {selectedNode.properties.breach_count}
                        </div>
                        <div className="text-xs text-red-300">Breaches Found</div>
                      </div>
                      {selectedNode.properties.data_classes && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-400 mb-2">Exposed Data:</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedNode.properties.data_classes.slice(0, 8).map((dc: string, idx: number) => (
                              <span key={idx} className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded">
                                {dc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Domain Details */}
              {selectedNode.label === "Domain" && (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">🌐 Domain Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Domain</span>
                        <span className="text-white text-sm font-mono">{selectedNode.properties.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* WHOIS Data */}
                  {(selectedNode.properties.registrar || selectedNode.properties.creation_date) && (
                    <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📝</span>
                        <h3 className="text-sm font-semibold text-blue-400 uppercase">WHOIS Registry</h3>
                      </div>
                      <div className="space-y-2">
                        {selectedNode.properties.registrar && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Registrar</span>
                            <span className="text-blue-300 text-sm font-medium">{selectedNode.properties.registrar}</span>
                          </div>
                        )}
                        {selectedNode.properties.creation_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Created</span>
                            <span className="text-white text-sm">{new Date(selectedNode.properties.creation_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {selectedNode.properties.expiration_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Expires</span>
                            <span className="text-white text-sm">{new Date(selectedNode.properties.expiration_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {selectedNode.properties.domain_age_days !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Age</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm">{selectedNode.properties.domain_age_days} days</span>
                              {selectedNode.properties.domain_age_days < 30 && (
                                <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded font-medium">NEW</span>
                              )}
                              {selectedNode.properties.domain_age_days > 365 && (
                                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded font-medium">ESTABLISHED</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* VirusTotal Reputation */}
                  {selectedNode.properties.vt_reputation !== undefined && (
                    <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🛡️</span>
                        <h3 className="text-sm font-semibold text-purple-400 uppercase">VirusTotal Analysis</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-300 text-sm">Reputation Score</span>
                            <span className={`text-lg font-bold ${
                              selectedNode.properties.vt_reputation >= 70 ? 'text-green-400' :
                              selectedNode.properties.vt_reputation >= 40 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {selectedNode.properties.vt_reputation}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                selectedNode.properties.vt_reputation >= 70 ? 'bg-green-500' :
                                selectedNode.properties.vt_reputation >= 40 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${selectedNode.properties.vt_reputation}%` }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedNode.properties.vt_malicious > 0 && (
                            <div className="bg-red-900/20 rounded p-2">
                              <div className="text-lg font-bold text-red-400">{selectedNode.properties.vt_malicious}</div>
                              <div className="text-xs text-red-300">Malicious</div>
                            </div>
                          )}
                          {selectedNode.properties.vt_suspicious > 0 && (
                            <div className="bg-yellow-900/20 rounded p-2">
                              <div className="text-lg font-bold text-yellow-400">{selectedNode.properties.vt_suspicious}</div>
                              <div className="text-xs text-yellow-300">Suspicious</div>
                            </div>
                          )}
                        </div>
                        {selectedNode.properties.vt_categories && selectedNode.properties.vt_categories.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Categories:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.properties.vt_categories.slice(0, 5).map((cat: string, idx: number) => (
                                <span key={idx} className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* URLScan Data */}
                  {(selectedNode.properties.urlscan_screenshot || selectedNode.properties.technologies) && (
                    <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border border-cyan-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📸</span>
                        <h3 className="text-sm font-semibold text-cyan-400 uppercase">URLScan Analysis</h3>
                      </div>
                      
                      {/* Embedded Screenshot */}
                      {selectedNode.properties.urlscan_screenshot && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 mb-2">Website Screenshot:</div>
                          <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-cyan-800/30">
                            <img 
                              src={selectedNode.properties.urlscan_screenshot}
                              alt="URLScan Screenshot"
                              className="w-full h-auto"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">Screenshot not available</div>';
                                }
                              }}
                            />
                            <a 
                              href={selectedNode.properties.urlscan_screenshot}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 right-2 bg-cyan-900/80 hover:bg-cyan-800 text-cyan-300 text-xs px-2 py-1 rounded backdrop-blur-sm transition-colors"
                            >
                              🔍 Full Size
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Malicious Score */}
                      {selectedNode.properties.malicious_score !== undefined && selectedNode.properties.malicious_score > 0 && (
                        <div className="mb-3 bg-red-900/20 border border-red-800/30 rounded p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-red-300">Malicious Score</span>
                            <span className="text-lg font-bold text-red-400">{selectedNode.properties.malicious_score}</span>
                          </div>
                        </div>
                      )}

                      {/* Technologies */}
                      {selectedNode.properties.technologies && selectedNode.properties.technologies.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 mb-2">Technologies Detected:</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedNode.properties.technologies.map((tech: string, idx: number) => (
                              <span key={idx} className="text-xs bg-cyan-900/30 text-cyan-300 px-2 py-1 rounded">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full Report Link */}
                      {selectedNode.properties.urlscan_report && (
                        <a 
                          href={selectedNode.properties.urlscan_report}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center bg-cyan-900/20 hover:bg-cyan-900/30 rounded p-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          📊 View Full URLScan Report →
                        </a>
                      )}
                    </div>
                  )}

                  {/* AlienVault OTX Threat Intel */}
                  {selectedNode.properties.otx_threat_score !== undefined && (
                    <div className={`bg-gradient-to-br border rounded-lg p-4 ${
                      selectedNode.properties.otx_threat_score > 0 
                        ? 'from-red-900/20 to-orange-800/10 border-red-800/30' 
                        : 'from-green-900/20 to-green-800/10 border-green-800/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{selectedNode.properties.otx_threat_score > 0 ? '⚠️' : '✅'}</span>
                        <h3 className={`text-sm font-semibold uppercase ${
                          selectedNode.properties.otx_threat_score > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>AlienVault Threat Intelligence</h3>
                      </div>
                      <div className="space-y-2">
                        <div className={`rounded p-3 ${
                          selectedNode.properties.otx_threat_score > 0 ? 'bg-red-900/20' : 'bg-green-900/20'
                        }`}>
                          <div className={`text-2xl font-bold mb-1 ${
                            selectedNode.properties.otx_threat_score > 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {selectedNode.properties.otx_threat_score}/100
                          </div>
                          <div className={`text-xs ${
                            selectedNode.properties.otx_threat_score > 0 ? 'text-red-300' : 'text-green-300'
                          }`}>
                            {selectedNode.properties.otx_threat_score > 0 ? 'Threat Score' : 'No Threats Detected'}
                          </div>
                        </div>
                        {selectedNode.properties.otx_pulse_count > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Threat Pulses</span>
                            <span className="text-red-400 text-sm font-bold">{selectedNode.properties.otx_pulse_count}</span>
                          </div>
                        )}
                        {selectedNode.properties.otx_tags && selectedNode.properties.otx_tags.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Threat Tags:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.properties.otx_tags.slice(0, 6).map((tag: string, idx: number) => (
                                <span key={idx} className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedNode.properties.otx_malware && selectedNode.properties.otx_malware.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Malware Families:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.properties.otx_malware.map((malware: string, idx: number) => (
                                <span key={idx} className="text-xs bg-orange-900/30 text-orange-300 px-2 py-1 rounded font-medium">
                                  {malware}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IP Details */}
              {selectedNode.label === "IP" && (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">🔌 IP Address</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Address</span>
                        <span className="text-white text-sm font-mono">{selectedNode.properties.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* GeoIP Data */}
                  {(selectedNode.properties.country || selectedNode.properties.isp) && (
                    <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🌍</span>
                        <h3 className="text-sm font-semibold text-green-400 uppercase">GeoIP Location</h3>
                      </div>
                      <div className="space-y-2">
                        {selectedNode.properties.country && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Country</span>
                            <span className="text-green-300 text-sm font-medium">{selectedNode.properties.country}</span>
                          </div>
                        )}
                        {selectedNode.properties.city && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">City</span>
                            <span className="text-white text-sm">{selectedNode.properties.city}</span>
                          </div>
                        )}
                        {selectedNode.properties.region && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Region</span>
                            <span className="text-white text-sm">{selectedNode.properties.region}</span>
                          </div>
                        )}
                        {selectedNode.properties.isp && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">ISP</span>
                            <span className="text-white text-sm">{selectedNode.properties.isp}</span>
                          </div>
                        )}
                        {selectedNode.properties.asn && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">ASN</span>
                            <span className="text-white text-sm font-mono">{selectedNode.properties.asn}</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          {selectedNode.properties.is_hosting && (
                            <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded">
                              🏢 Hosting
                            </span>
                          )}
                          {selectedNode.properties.is_proxy && (
                            <span className="text-xs bg-orange-900/30 text-orange-400 px-2 py-1 rounded">
                              🔒 Proxy
                            </span>
                          )}
                          {selectedNode.properties.is_mobile && (
                            <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-1 rounded">
                              📱 Mobile
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shodan Data */}
                  {(selectedNode.properties.open_ports || selectedNode.properties.services) && (
                    <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🔍</span>
                        <h3 className="text-sm font-semibold text-red-400 uppercase">Shodan Scan</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedNode.properties.open_ports && selectedNode.properties.open_ports.length > 0 && (
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-300 text-sm">Open Ports</span>
                              <span className="text-red-400 text-sm font-bold">{selectedNode.properties.open_ports.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.properties.open_ports.slice(0, 12).map((port: number, idx: number) => (
                                <span key={idx} className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded font-mono">
                                  {port}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedNode.properties.services && selectedNode.properties.services.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Services:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.properties.services.map((service: string, idx: number) => (
                                <span key={idx} className="text-xs bg-orange-900/30 text-orange-300 px-2 py-1 rounded">
                                  {service}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedNode.properties.vulnerabilities && selectedNode.properties.vulnerabilities.length > 0 && (
                          <div className="bg-red-900/20 rounded p-2">
                            <div className="text-lg font-bold text-red-400 mb-1">
                              ⚠️ {selectedNode.properties.vulnerabilities.length}
                            </div>
                            <div className="text-xs text-red-300 mb-2">Vulnerabilities Found</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.properties.vulnerabilities.slice(0, 5).map((vuln: string, idx: number) => (
                                <span key={idx} className="text-xs bg-red-900/40 text-red-200 px-2 py-1 rounded font-mono">
                                  {vuln}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedNode.properties.os && (
                          <div className="flex justify-between">
                            <span className="text-gray-300 text-sm">Operating System</span>
                            <span className="text-white text-sm">{selectedNode.properties.os}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* VirusTotal Reputation */}
                  {selectedNode.properties.vt_reputation !== undefined && (
                    <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🛡️</span>
                        <h3 className="text-sm font-semibold text-purple-400 uppercase">VirusTotal Analysis</h3>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-300 text-sm">Reputation Score</span>
                            <span className={`text-lg font-bold ${
                              selectedNode.properties.vt_reputation >= 70 ? 'text-green-400' :
                              selectedNode.properties.vt_reputation >= 40 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {selectedNode.properties.vt_reputation}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                selectedNode.properties.vt_reputation >= 70 ? 'bg-green-500' :
                                selectedNode.properties.vt_reputation >= 40 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${selectedNode.properties.vt_reputation}%` }}
                            />
                          </div>
                        </div>
                        {(selectedNode.properties.vt_malicious > 0 || selectedNode.properties.vt_suspicious > 0) && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {selectedNode.properties.vt_malicious > 0 && (
                              <div className="bg-red-900/20 rounded p-2">
                                <div className="text-lg font-bold text-red-400">{selectedNode.properties.vt_malicious}</div>
                                <div className="text-xs text-red-300">Malicious</div>
                              </div>
                            )}
                            {selectedNode.properties.vt_suspicious > 0 && (
                              <div className="bg-yellow-900/20 rounded p-2">
                                <div className="text-lg font-bold text-yellow-400">{selectedNode.properties.vt_suspicious}</div>
                                <div className="text-xs text-yellow-300">Suspicious</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AlienVault OTX */}
                  {selectedNode.properties.otx_threat_score > 0 && (
                    <div className="bg-gradient-to-br from-red-900/20 to-orange-800/10 border border-red-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">⚠️</span>
                        <h3 className="text-sm font-semibold text-red-400 uppercase">AlienVault Threat Intel</h3>
                      </div>
                      <div className="bg-red-900/20 rounded p-3 mb-2">
                        <div className="text-2xl font-bold text-red-400 mb-1">
                          {selectedNode.properties.otx_threat_score}/100
                        </div>
                        <div className="text-xs text-red-300">Threat Score</div>
                      </div>
                      {selectedNode.properties.otx_pulse_count > 0 && (
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300 text-sm">Threat Pulses</span>
                          <span className="text-red-400 text-sm font-bold">{selectedNode.properties.otx_pulse_count}</span>
                        </div>
                      )}
                      {selectedNode.properties.otx_tags && selectedNode.properties.otx_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedNode.properties.otx_tags.slice(0, 6).map((tag: string, idx: number) => (
                            <span key={idx} className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Breach Details */}
              {selectedNode.label === "Breach" && (
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Breach Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Name</span>
                        <span className="text-white text-sm font-semibold">{selectedNode.properties.name}</span>
                      </div>
                      {selectedNode.properties.breach_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Date</span>
                          <span className="text-white text-sm">{selectedNode.properties.breach_date}</span>
                        </div>
                      )}
                      {selectedNode.properties.pwn_count && (
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Accounts</span>
                          <span className="text-white text-sm">{selectedNode.properties.pwn_count.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedNode.properties.data_classes && (
                        <div className="mt-3">
                          <span className="text-gray-400 text-sm block mb-2">Data Exposed</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedNode.properties.data_classes.map((dc: string, idx: number) => (
                              <span key={idx} className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded">
                                {dc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Organization Details */}
              {selectedNode.label === "Organization" && (
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Organization Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Name</span>
                        <span className="text-white text-sm">{selectedNode.properties.name}</span>
                      </div>
                      {selectedNode.properties.type && (
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Type</span>
                          <span className="text-white text-sm capitalize">{selectedNode.properties.type}</span>
                        </div>
                      )}
                      {selectedNode.properties.country && (
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">Country</span>
                          <span className="text-white text-sm">{selectedNode.properties.country}</span>
                        </div>
                      )}
                      {selectedNode.properties.asn && (
                        <div className="flex justify-between">
                          <span className="text-gray-400 text-sm">ASN</span>
                          <span className="text-white text-sm font-mono">{selectedNode.properties.asn}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags Section */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase">🏷️ Tags</h3>
                  <button
                    onClick={() => setShowTagForm(!showTagForm)}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    + Add Tag
                  </button>
                </div>
                
                {showTagForm && (
                  <div className="mb-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Enter custom tag..."
                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && newTag && handleAddTag(newTag)}
                      />
                      <button
                        onClick={() => newTag && handleAddTag(newTag)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {predefinedTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleAddTag(tag)}
                          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          tag === 'malicious' ? 'bg-red-900/30 text-red-400' :
                          tag === 'suspicious' ? 'bg-orange-900/30 text-orange-400' :
                          tag === 'benign' || tag === 'legitimate' ? 'bg-green-900/30 text-green-400' :
                          'bg-blue-900/30 text-blue-400'
                        }`}
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-white transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No tags yet</span>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase">📝 Notes</h3>
                  <button
                    onClick={() => setShowNoteForm(!showNoteForm)}
                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    + Add Note
                  </button>
                </div>
                
                {showNoteForm && (
                  <div className="mb-3 space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Enter your note (markdown supported)..."
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddNote}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                      >
                        Save Note
                      </button>
                      <button
                        onClick={() => {
                          setShowNoteForm(false);
                          setNewNote("");
                        }}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div key={note.id} className="bg-gray-900 rounded p-3 space-y-2">
                        <div className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No notes yet</span>
                  )}
                </div>
              </div>

              {/* Raw Data */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Raw Data</h3>
                <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-900 p-3 rounded">
                  {JSON.stringify(selectedNode.properties, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pivot Context Menu */}
      {pivotMenu.show && pivotMenu.node && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setPivotMenu({ show: false, x: 0, y: 0, node: null })}
          />
          <div
            className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-2 min-w-[200px]"
            style={{ left: `${pivotMenu.x}px`, top: `${pivotMenu.y}px` }}
          >
            <div className="px-3 py-2 border-b border-gray-700">
              <div className="text-xs font-semibold text-gray-400 uppercase">Pivot Actions</div>
              <div className="text-xs text-gray-500 mt-1">
                {pivotMenu.node.properties.address || pivotMenu.node.properties.name}
              </div>
            </div>
            
            <div className="py-1">
              <button
                onClick={() => handlePivot("related_domains")}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <span>🌐</span>
                <span>Find Related Domains</span>
              </button>
              
              <button
                onClick={() => handlePivot("related_ips")}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <span>🔌</span>
                <span>Find Related IPs</span>
              </button>
              
              <button
                onClick={() => handlePivot("related_emails")}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <span>📧</span>
                <span>Find Related Emails</span>
              </button>
              
              {pivotMenu.node.label === "Domain" && (
                <>
                  <div className="border-t border-gray-700 my-1" />
                  <button
                    onClick={() => handlePivot("hosted_by_same_ip")}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <span>🏢</span>
                    <span>Domains on Same IP</span>
                  </button>
                  
                  <button
                    onClick={() => handlePivot("same_registrar")}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <span>📝</span>
                    <span>Same Registrar</span>
                  </button>
                </>
              )}
              
              {pivotMenu.node.label === "IP" && (
                <>
                  <div className="border-t border-gray-700 my-1" />
                  <button
                    onClick={() => handlePivot("same_asn")}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <span>🌍</span>
                    <span>IPs in Same ASN</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Enhanced Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/95 backdrop-blur border border-gray-800 rounded-lg p-4 space-y-3 shadow-xl">
        <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide">Node Types</div>
        {Object.entries(NODE_CONFIG).filter(([key]) => key !== "ScanJob").map(([label, config]) => (
          <div key={label} className="flex items-center gap-3">
            <div 
              className="w-5 h-5 rounded flex items-center justify-center text-xs"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
            </div>
            <span className="text-xs text-gray-300 font-medium">{label}</span>
          </div>
        ))}
        
        <div className="border-t border-gray-800 pt-3 mt-3">
          <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide">Risk Levels</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-300">Low Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-300">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-300">High Risk</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
