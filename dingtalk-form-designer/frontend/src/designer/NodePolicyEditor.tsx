import React, { useMemo, useState } from "react";
import type { FormSchema, NodePolicy } from "../types";

function toSet(arr: string[]) { return new Set(arr); }

export default function NodePolicyEditor({
  schema,
  onChange
}: { schema: FormSchema; onChange: (s: FormSchema) => void }) {
  const [nodeId, setNodeId] = useState(schema.workflow.nodes[0]?.id || "start");
  const policy: NodePolicy = schema.workflow.policies[nodeId] || { visible: ["*"], editable: ["*"], required: [] };

  const fieldIds = useMemo(() => schema.fields.map(f => f.id), [schema.fields]);
  const requiredSet = useMemo(() => toSet(policy.required || []), [policy.required]);
  const editableSet = useMemo(() => toSet(policy.editable || []), [policy.editable]);

  function update(next: NodePolicy) {
    onChange({
      ...schema,
      workflow: {
        ...schema.workflow,
        policies: { ...schema.workflow.policies, [nodeId]: next }
      }
    });
  }

  return (
    <div style={{ border: "1px solid #eee", padding: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>节点权限</div>
        <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
          {schema.workflow.nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
        </select>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
        Demo 简化：visible 默认全可见（["*"]），你可扩展为字段级隐藏。
      </div>

      <h4>可编辑 editable</h4>
      <div style={{ display: "grid", gap: 6 }}>
        {fieldIds.map(id => (
          <label key={id}>
            <input
              type="checkbox"
              checked={policy.editable.includes("*") ? true : editableSet.has(id)}
              disabled={policy.editable.includes("*")}
              onChange={(e) => {
                const base = policy.editable.includes("*") ? ["*"] : policy.editable;
                const next = new Set(base);
                e.target.checked ? next.add(id) : next.delete(id);
                update({ ...policy, editable: Array.from(next) });
              }}
            />
            {id}
          </label>
        ))}
      </div>

      <h4>必填 required</h4>
      <div style={{ display: "grid", gap: 6 }}>
        {fieldIds.map(id => (
          <label key={id}>
            <input
              type="checkbox"
              checked={requiredSet.has(id)}
              onChange={(e) => {
                const next = new Set(policy.required || []);
                e.target.checked ? next.add(id) : next.delete(id);
                update({ ...policy, required: Array.from(next) });
              }}
            />
            {id}
          </label>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => update({ visible: ["*"], editable: ["*"], required: [] })}>
          重置为全可编辑
        </button>
      </div>
    </div>
  );
}
