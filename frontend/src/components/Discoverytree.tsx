"use client";

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type OnNodesChange,
  type OnEdgesChange,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type LabelData = { label: string };

// ── Node components ───────────────────────────────────────────────────────────

const PlannerNode = ({ data }: NodeProps<Node<LabelData>>) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-slate-300 min-w-[180px]">
    <div className="font-bold text-xs text-slate-500 uppercase mb-1">Planner</div>
    <div className="font-semibold text-sm text-center">{data.label}</div>
    <Handle type="source" position={Position.Bottom} id="source" />
  </div>
);

// fact_check explorers — blue
const ExplorerNode = ({ data }: NodeProps<Node<LabelData>>) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-300 min-w-[180px]">
    <Handle type="target" position={Position.Top} id="target" />
    <div className="font-bold text-xs text-blue-500 uppercase mb-1">Explorer</div>
    <div className="font-semibold text-sm text-center">{data.label}</div>
    <Handle type="source" position={Position.Bottom} id="source" />
  </div>
);

// deep_curation source hunters — purple
const CuratorNode = ({ data }: NodeProps<Node<LabelData>>) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-purple-400 min-w-[160px]">
    <Handle type="target" position={Position.Top} id="target" />
    <div className="font-bold text-xs text-purple-600 uppercase mb-1">Source Hunter</div>
    <div className="font-semibold text-sm text-center">{data.label}</div>
    <Handle type="source" position={Position.Bottom} id="source" />
  </div>
);

// debate FOR — green
const DebaterForNode = ({ data }: NodeProps<Node<LabelData>>) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-400 min-w-[160px]">
    <Handle type="target" position={Position.Top} id="target" />
    <div className="font-bold text-xs text-green-600 uppercase mb-1">✅ FOR</div>
    <div className="font-semibold text-sm text-center">{data.label}</div>
    <Handle type="source" position={Position.Bottom} id="source" />
  </div>
);

// debate AGAINST — red
const DebaterAgainstNode = ({ data }: NodeProps<Node<LabelData>>) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-red-400 min-w-[160px]">
    <Handle type="target" position={Position.Top} id="target" />
    <div className="font-bold text-xs text-red-600 uppercase mb-1">❌ AGAINST</div>
    <div className="font-semibold text-sm text-center">{data.label}</div>
    <Handle type="source" position={Position.Bottom} id="source" />
  </div>
);

const AuditorNode = ({ data }: NodeProps<Node<LabelData>>) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-amber-300 min-w-[180px]">
    <Handle type="target" position={Position.Top} id="target" />
    <div className="font-bold text-xs text-amber-600 uppercase mb-1">CoVe Auditor</div>
    <div className="font-semibold text-sm text-center">{data.label}</div>
    <Handle type="source" position={Position.Bottom} id="source" />
  </div>
);

const SynthesizerNode = ({ data }: NodeProps<Node<LabelData>>) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-emerald-400 min-w-[180px]">
    <Handle type="target" position={Position.Top} id="target" />
    <div className="font-bold text-xs text-emerald-600 uppercase mb-1">Synthesizer</div>
    <div className="font-semibold text-sm text-center">{data.label}</div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

interface DiscoveryTreeProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export default function DiscoveryTree({ nodes, edges, setNodes, setEdges }: DiscoveryTreeProps) {
  const nodeTypes = useMemo(() => ({
    planner:          PlannerNode,
    explorer:         ExplorerNode,
    curator:          CuratorNode,
    debater_for:      DebaterForNode,
    debater_against:  DebaterAgainstNode,
    auditor:          AuditorNode,
    synthesizer:      SynthesizerNode,
  }), []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes(nds => applyNodeChanges(changes, nds)), [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges(eds => applyEdgeChanges(changes, eds)), [setEdges]
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)), [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Controls />
      <MiniMap />
      <Background gap={12} size={1} />
    </ReactFlow>
  );
}
