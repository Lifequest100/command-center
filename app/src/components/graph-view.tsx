"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ScanResult } from "@/lib/scanner";
import { Cpu, Server, FolderOpen, Plug, Bot } from "lucide-react";

interface Props {
  data: ScanResult;
  onSelectProject: (name: string) => void;
}

function CenterNode({ data }: { data: { model: string; plugins: number; agents: number; skills: number } }) {
  return (
    <div className="rounded-xl border-2 border-amber-500/50 bg-zinc-900 px-6 py-4 shadow-lg shadow-amber-500/10">
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-amber-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-amber-500 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <Cpu size={16} className="text-amber-400" />
        <span className="font-semibold text-zinc-100 text-sm">Claude Code</span>
      </div>
      <div className="text-[11px] text-zinc-500 space-y-0.5">
        <div>Model: <span className="text-zinc-300">{data.model}</span></div>
        <div>{data.plugins} plugins &middot; {data.skills} skills &middot; {data.agents} agents</div>
      </div>
    </div>
  );
}

function ProjectNode({ data }: { data: { label: string; summary: string; mcpCount: number; skillCount: number; onClick: () => void } }) {
  return (
    <div
      className="cursor-pointer rounded-xl border border-blue-500/30 bg-zinc-900 px-5 py-3 shadow-md transition-all hover:border-blue-500/60 hover:shadow-blue-500/10 max-w-[250px]"
      onClick={data.onClick}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-blue-500 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <FolderOpen size={14} className="text-blue-400" />
        <span className="font-medium text-zinc-100 text-sm">{data.label}</span>
      </div>
      <p className="text-[10px] text-zinc-600 line-clamp-2 mb-1.5">{data.summary}</p>
      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
        {data.mcpCount > 0 && <span>{data.mcpCount} MCP</span>}
        {data.skillCount > 0 && <span>{data.skillCount} skills</span>}
      </div>
    </div>
  );
}

function MCPNode({ data }: { data: { label: string; tools: number } }) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-zinc-900 px-4 py-2 shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-2 !h-2" />
      <div className="flex items-center gap-1.5">
        <Server size={12} className="text-emerald-400" />
        <span className="text-xs font-medium text-zinc-200">{data.label}</span>
      </div>
      {data.tools > 0 && <div className="text-[10px] text-zinc-500 mt-0.5">{data.tools} tools</div>}
    </div>
  );
}

function PluginNode({ data }: { data: { label: string; enabled: boolean } }) {
  return (
    <div className={`rounded-lg border bg-zinc-900 px-4 py-2 shadow-sm ${data.enabled ? "border-purple-500/30" : "border-zinc-700"}`}>
      <Handle type="target" position={Position.Right} className="!bg-purple-500 !w-2 !h-2" />
      <div className="flex items-center gap-1.5">
        <Plug size={12} className={data.enabled ? "text-purple-400" : "text-zinc-600"} />
        <span className={`text-xs font-medium ${data.enabled ? "text-zinc-200" : "text-zinc-500"}`}>{data.label}</span>
      </div>
    </div>
  );
}

function AgentGroupNode({ data }: { data: { count: number } }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-zinc-900 px-4 py-2 shadow-sm">
      <Handle type="target" position={Position.Left} className="!bg-rose-500 !w-2 !h-2" />
      <div className="flex items-center gap-1.5">
        <Bot size={12} className="text-rose-400" />
        <span className="text-xs font-medium text-zinc-200">{data.count} agents</span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  center: CenterNode,
  project: ProjectNode,
  mcp: MCPNode,
  plugin: PluginNode,
  agentGroup: AgentGroupNode,
};

export function GraphView({ data, onSelectProject }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const { global, projects, allMCPs } = data;

    nodes.push({
      id: "center", type: "center", position: { x: 400, y: 50 },
      data: { model: global.model, plugins: global.plugins.length, agents: global.agents.length, skills: global.skills.length },
      draggable: true,
    });

    global.plugins.forEach((plugin, i) => {
      const id = `plugin-${i}`;
      nodes.push({ id, type: "plugin", position: { x: 30, y: 20 + i * 55 }, data: { label: plugin.shortName, enabled: plugin.enabled }, draggable: true });
      edges.push({ id: `e-c-${id}`, source: "center", sourceHandle: "left", target: id, style: { stroke: "#a855f7", strokeWidth: 1.5, opacity: 0.4 }, animated: plugin.enabled });
    });

    nodes.push({ id: "agents", type: "agentGroup", position: { x: 750, y: 30 }, data: { count: global.agents.length }, draggable: true });
    edges.push({ id: "e-c-agents", source: "center", sourceHandle: "right", target: "agents", style: { stroke: "#f43f5e", strokeWidth: 1.5, opacity: 0.4 } });

    const spacing = 280;
    const startX = 400 - ((projects.length - 1) * spacing) / 2;
    projects.forEach((project, i) => {
      const pid = `proj-${i}`;
      nodes.push({
        id: pid, type: "project", position: { x: startX + i * spacing, y: 220 },
        data: { label: project.name, summary: project.summary, mcpCount: project.mcpServers.length, skillCount: project.skills.length, onClick: () => onSelectProject(project.name) },
        draggable: true,
      });
      edges.push({ id: `e-c-${pid}`, source: "center", target: pid, style: { stroke: "#3b82f6", strokeWidth: 1.5, opacity: 0.4 } });
    });

    const mcpMap = new Map<string, { tools: number; projectIds: string[] }>();
    allMCPs.forEach(mcp => {
      const pIdx = projects.findIndex(p => p.name === mcp.project);
      const pId = `proj-${pIdx}`;
      const existing = mcpMap.get(mcp.name);
      if (existing) {
        existing.tools = Math.max(existing.tools, mcp.tools.length);
        if (!existing.projectIds.includes(pId)) existing.projectIds.push(pId);
      } else {
        mcpMap.set(mcp.name, { tools: mcp.tools.length, projectIds: [pId] });
      }
    });

    const mcpSpacing = 170;
    const mcpStartX = 400 - ((mcpMap.size - 1) * mcpSpacing) / 2;
    let mi = 0;
    mcpMap.forEach((info, name) => {
      const mid = `mcp-${mi}`;
      nodes.push({ id: mid, type: "mcp", position: { x: mcpStartX + mi * mcpSpacing, y: 420 }, data: { label: name, tools: info.tools }, draggable: true });
      info.projectIds.forEach(pid => {
        edges.push({ id: `e-${pid}-${mid}`, source: pid, sourceHandle: "bottom", target: mid, style: { stroke: "#10b981", strokeWidth: 1.5, opacity: 0.4 }, animated: true });
      });
      mi++;
    });

    return { nodes, edges };
  }, [data, onSelectProject]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "project" && node.data.onClick) {
      (node.data.onClick as () => void)();
    }
  }, []);

  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView fitViewOptions={{ padding: 0.3 }} proOptions={{ hideAttribution: true }} className="bg-zinc-950">
      <Background color="#27272a" gap={20} size={1} />
      <Controls className="!bg-zinc-800 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700" />
    </ReactFlow>
  );
}
