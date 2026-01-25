import React, { useMemo, useState } from "react";
import type { FormSchema } from "../types";
import { applyCalculations, computeFieldState, type RuntimeContext } from "./renderEngine";
import { FieldInput } from "./fields";

export default function RuntimePreview({ schema }: { schema: FormSchema }) {
  const [nodeId, setNodeId] = useState(schema.workflow.nodes[0]?.id || "start");
  const [data, setData] = useState<any>({});

  const ctx: RuntimeContext = useMemo(() => ({
    nodeId,
    action: nodeId === "start" ? "start" : "approve",
    user: { id: "u_demo", name: "DemoUser", roles: ["employee"], deptId: "d1" }
  }), [nodeId]);

  const computedData = useMemo(() => applyCalculations(schema, data), [schema, data]);

  function setField(id: string, v: any) {
    setData((prev: any) => ({ ...prev, [id]: v }));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div>当前节点：</div>
        <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
          {schema.workflow.nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {schema.fields.map(field => {
          const st = computeFieldState(schema, field, computedData, ctx);
          if (!st.visible) return null;

          const val = computedData[field.id];

          return (
            <div key={field.id} style={{ border: "1px solid #eee", padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>
                  {field.label} {st.required ? <span style={{ color: "red" }}>*</span> : null}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {st.readonly ? "只读" : "可编辑"} · {field.type} · {field.id}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <FieldInput
                  field={field as any}
                  value={val}
                  readonly={st.readonly}
                  onChange={(v) => setField(field.id, v)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <h4 style={{ marginTop: 16 }}>当前数据（含计算字段）</h4>
      <pre style={{ background: "#f7f7f7", padding: 10 }}>{JSON.stringify(computedData, null, 2)}</pre>
    </div>
  );
}
