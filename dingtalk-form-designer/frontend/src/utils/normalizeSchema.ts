import type { FormSchema } from "../types";

export function normalizeSchema(raw: any): FormSchema {
  const s = raw ?? {};

  const workflow = s.workflow ?? {};
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const edges = Array.isArray(workflow.edges) ? workflow.edges : [];

  const policies = (workflow.policies && typeof workflow.policies === "object") ? workflow.policies : {};

  return {
    id: String(s.id ?? ""),
    name: String(s.name ?? "未命名表单"),
    version: Number.isFinite(Number(s.version)) ? Number(s.version) : 1,
    fields: Array.isArray(s.fields) ? s.fields : [],
    calculations: Array.isArray(s.calculations) ? s.calculations : [],
    workflow: {
      nodes,
      edges,
      policies
    }
  };
}
