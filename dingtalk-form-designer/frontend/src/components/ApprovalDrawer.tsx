import React, { useEffect, useMemo, useState } from "react";
import type { FormSchema, Field } from "../types";
import { actTask, taskDetail } from "../api";
import { applyCalculations, computeFieldState } from "../runtime/renderEngine";
import { FieldInput } from "../runtime/fields";

type Props = {
  open: boolean;
  taskId: string | null;
  userId: string;
  onClose: () => void;
  onDone: () => void;
};

function shallowEqualJSON(a: any, b: any) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export default function ApprovalDrawer({ open, taskId, userId, onClose, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [nodeId, setNodeId] = useState<string>("");
  const [instance, setInstance] = useState<any>(null);
  const [task, setTask] = useState<any>(null);

  const [data, setData] = useState<any>({});
  const [initialData, setInitialData] = useState<any>({});
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open || !taskId) return;
    setLoading(true);
    taskDetail(taskId)
      .then((res) => {
        setTask(res.task);
        setInstance(res.instance);
        setSchema(res.schema);
        setNodeId(res.task.nodeId);

        const d = res.instance.data || {};
        setInitialData(d);
        setData(d);
      })
      .catch((e) => alert(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [open, taskId]);

  const ctx = useMemo(
    () => ({
      nodeId,
      action: "approve" as const,
      user: { id: userId, name: userId, roles: [], deptId: "" }
    }),
    [nodeId, userId]
  );

  const computedData = useMemo(() => {
    if (!schema) return data;
    return applyCalculations(schema, data);
  }, [schema, data]);

  const editableSet = useMemo(() => {
    if (!schema) return new Set<string>();
    const p = schema.workflow.policies?.[nodeId];
    const set = new Set<string>();
    if (!p) return set;
    if (p.editable?.includes("*")) {
      schema.fields.forEach((f) => set.add(f.id));
      return set;
    }
    (p.editable || []).forEach((x) => set.add(x));
    return set;
  }, [schema, nodeId]);

  function setField(id: string, v: any) {
    setData((prev: any) => ({ ...prev, [id]: v }));
  }

  function buildPatch(): Record<string, any> {
    if (!schema) return {};
    const patch: Record<string, any> = {};
    for (const f of schema.fields) {
      if (!editableSet.has(f.id)) continue;
      if (!shallowEqualJSON(initialData?.[f.id], computedData?.[f.id])) {
        patch[f.id] = computedData?.[f.id];
      }
    }
    return patch;
  }

  async function doAct(action: "approve" | "reject" | "return") {
    if (!taskId) return;
    const patch = buildPatch();

    setLoading(true);
    try {
      await actTask(taskId, {
        userId,
        action,
        comment,
        dataPatch: patch
      });
      onDone();
      onClose();
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.25)",
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          height: "100%",
          background: "white",
          padding: 12,
          overflow: "auto",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.15)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>审批处理</div>
          <button onClick={onClose}>关闭</button>
        </div>

        {loading ? <div style={{ marginTop: 12 }}>加载中...</div> : null}

        {schema && instance && task ? (
          <>
            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              实例：{instance.id} · 表单：{schema.name} · 当前节点：{nodeId} · 申请人：{instance.applicantUserId}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {schema.fields.map((field: Field) => {
                const st = computeFieldState(schema, field, computedData, ctx);
                if (!st.visible) return null;

                return (
                  <div key={field.id} style={{ border: "1px solid #eee", padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 700 }}>
                        {field.label} {st.required ? <span style={{ color: "red" }}>*</span> : null}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {st.readonly ? "只读" : "可编辑"} · {field.type} · {field.id}
                      </div>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <FieldInput
                        field={field as any}
                        value={computedData[field.id]}
                        readonly={st.readonly}
                        onChange={(v) => setField(field.id, v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>审批意见</div>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ width: "100%" }}
                placeholder="可选"
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" disabled={loading} onClick={() => doAct("approve")}>通过</button>
              <button className="btn btn-danger" disabled={loading} onClick={() => doAct("reject")}>驳回</button>
              <button className="btn btn-outline btn-outline-primary" disabled={loading} onClick={() => doAct("return")}>退回发起人</button>
            </div>


            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer" }}>调试：当前数据</summary>
              <pre style={{ background: "#f7f7f7", padding: 10 }}>{JSON.stringify(computedData, null, 2)}</pre>
            </details>
          </>
        ) : null}
      </div>
    </div>
  );
}
