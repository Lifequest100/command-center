import { NextResponse } from "next/server";
import {
  togglePlugin,
  removeMCPFromProject,
  removeGlobalAgent,
  removeGlobalSkill,
  removeGlobalCommand,
} from "@/lib/scanner";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "togglePlugin": {
        const { pluginName, enabled } = body;
        togglePlugin(pluginName, enabled);
        logActivity("toggle-plugin", `${pluginName} → ${enabled ? "enabled" : "disabled"}`);
        return NextResponse.json({ ok: true, action, pluginName, enabled });
      }
      case "removeMCP": {
        const { projectName, mcpName } = body;
        const result = removeMCPFromProject(projectName, mcpName);
        if (result.removed) logActivity("remove-mcp", `${mcpName} from ${projectName}`);
        return NextResponse.json({ ok: result.removed, action, ...result });
      }
      case "removeAgent": {
        const { agentName } = body;
        const removed = removeGlobalAgent(agentName);
        if (removed) logActivity("remove-agent", agentName);
        return NextResponse.json({ ok: removed, action, agentName });
      }
      case "removeSkill": {
        const { namespace, skillName } = body;
        const removed = removeGlobalSkill(namespace, skillName);
        if (removed) logActivity("remove-skill", `${namespace}/${skillName}`);
        return NextResponse.json({ ok: removed, action, namespace, skillName });
      }
      case "removeCommand": {
        const { namespace, commandName } = body;
        const removed = removeGlobalCommand(namespace, commandName);
        if (removed) logActivity("remove-command", `${namespace}/${commandName}`);
        return NextResponse.json({ ok: removed, action, namespace, commandName });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Mutation failed", details: String(error) },
      { status: 500 }
    );
  }
}
