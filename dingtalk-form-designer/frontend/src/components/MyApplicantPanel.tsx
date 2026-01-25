import React, { useEffect, useMemo, useState } from "react";
import { createInstanceDraft, listInstances, submitInstance, updateInstanceData } from "../api";
import type { FormSchema, Field } from "../types";
import { applyCalculations, computeFieldState } from "../runtime/renderEngine";
import { FieldInput } from "../runtime/fields";

export default function MyApplicantPanel({ currentForm }: { currentForm: FormSchema | null }) {
  const fields = currentForm?.fields ?? [];

  const [userId] = useState("u1"); // demo applicant
  const [tab, setTab] = useState<"DRAFT" | "RUNNING" | "DONE">("DRAFT");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // editor drawer
  const [editOpen, setEditOpen] = useState(false);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [initialData, setInitialData] = useState<any>({});

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listInstances(userId, tab) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [tab]);

  async function onCreateDraft() {
    if (!currentForm) return alert("没有可用表单");
    setLoading(true);
    try {
      const res = await createInstanceDraft(currentForm.id, {
        userId,
        data: {
          title: "（草稿）" + currentForm.name,
          applicant: userId,
          dept: "d1",
          days: 1
        }
      });
      await refresh();
      alert("已创建草稿：" + res.id);
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openEditor(instanceId: string) {
    const res = await fetch(`/api/instances/${instanceId}`);
    if (!res.ok) return alert("加载实例失败");
    const inst = await res.json();
    setEditingInstanceId(instanceId);
    setEditingData(inst.data || {});
    setInitialData(inst.data || {});
    setEditOpen(true);
  }

  const computedData = useMemo(() => {
    if (!currentForm) return editingData;
    return applyCalculations(currentForm, editingData);
  }, [currentForm, editingData]);

  const ctx = useMemo(
    () => ({
      nodeId: "start",
      action: "start" as const,
      user: { id: userId, name: userId, roles: [], deptId: "" }
    }),
    [userId]
  );

  async function saveDraftChanges() {
    if (!editingInstanceId) return;
    if (!currentForm) return;

    const patch: Record<string, any> = {};
    for (const f of fields) {
      const a = initialData?.[f.id];
      const b = computedData?.[f.id];
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) patch[f.id] = b;
    }

    setLoading(true);
    try {
      await updateInstanceData(editingInstanceId, { userId, dataPatch: patch });
      setInitialData(computedData);
      alert("已保存草稿数据");
      await refresh();
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submitThisInstance(instanceId: string) {
    setLoading(true);
    try {
      await submitInstance(instanceId, { userId });
      alert("已提交，进入审批");
      await refresh();
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 800 }}>发起人（u1）</div>

        <button onClick={() => setTab("DRAFT")} disabled={tab === "DRAFT"}>草稿</button>
        <button onClick={() => setTab("RUNNING")} disabled={tab === "RUNNING"}>提交中</button>
        <button onClick={() => setTab("DONE")} disabled={tab === "DONE"}>已完成</button>

        <button className="btn btn-outline btn-sm" onClick={refresh} disabled={loading}>刷新</button>
        <button className="btn btn-primary btn-sm" onClick={onCreateDraft} disabled={!currentForm || loading}>新建草稿</button>

      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {rows?.map((x) => (
          <div key={x.id} style={{ border: "1px solid #ddd", padding: 10 }}>
            <div style={{ fontWeight: 700 }}>
              {x.formName} · 实例 {x.id} · {x.status} · 当前节点 {x.currentNode}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              更新时间：{new Date(x.updatedAt).toLocaleString()}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {tab !== "DONE" ? <button className="btn btn-outline btn-sm" onClick={() => openEditor(x.id)}>编辑</button> : null}
              {tab === "DRAFT" ? <button className="btn btn-primary btn-sm" onClick={() => submitThisInstance(x.id)}>提交</button> : null}

            </div>
          </div>
        ))}
        {rows.length === 0 ? <div style={{ color: "#666" }}>暂无记录</div> : null}
      </div>

      {editOpen && currentForm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            justifyContent: "flex-end"
          }}
          onClick={() => setEditOpen(false)}
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
              <div style={{ fontWeight: 800 }}>编辑草稿（start 节点）</div>
              <button onClick={() => setEditOpen(false)}>关闭</button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              实例：{editingInstanceId} · 表单：{currentForm.name}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {fields.map((field: Field) => {
                const st = computeFieldState(currentForm, field, computedData, ctx);
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
                        onChange={(v) => setEditingData((prev: any) => ({ ...prev, [field.id]: v }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-outline btn-sm" disabled={loading} onClick={saveDraftChanges}>保存草稿</button>

              {editingInstanceId ? (
                <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => submitThisInstance(editingInstanceId)}>提交</button>
              ) : null}
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer" }}>调试：当前数据</summary>
              <pre style={{ background: "#f7f7f7", padding: 10 }}>{JSON.stringify(computedData, null, 2)}</pre>
            </details>
          </div>
        </div>
      ) : null}
    </div>
  );
}
