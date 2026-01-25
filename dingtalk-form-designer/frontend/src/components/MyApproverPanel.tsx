import React, { useEffect, useState } from "react";
import { doneTasks, inboxTasks } from "../api";
import ApprovalDrawer from "./ApprovalDrawer";

export default function MyApproverPanel() {
  const [userId, setUserId] = useState("u3"); // u3=manager, u2=hr
  const [tab, setTab] = useState<"inbox" | "done">("inbox");

  const [inbox, setInbox] = useState<any[]>([]);
  const [done, setDone] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      if (tab === "inbox") setInbox(await inboxTasks(userId) ?? []);
      else setDone(await doneTasks(userId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [userId, tab]);

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 800 }}>审批人</div>
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="u3">u3 Bob（经理）</option>
          <option value="u2">u2 Lily（HR）</option>
        </select>

        <button className="btn btn-outline btn-outline-primary btn-sm" onClick={() => setTab("inbox")} disabled={tab === "inbox"}>待办</button>
        <button className="btn btn-outline btn-outline-primary btn-sm" onClick={() => setTab("done")} disabled={tab === "done"}>已办</button>
        <button className="btn btn-outline btn-sm" onClick={refresh} disabled={loading}>刷新</button>

      </div>

      {tab === "inbox" ? (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {inbox.map((t) => (
            <div key={t.taskId} style={{ border: "1px solid #ddd", padding: 10 }}>
              <div style={{ fontWeight: 700 }}>
                {t.formName} · 节点 {t.taskNodeId} · 实例 {t.instanceId}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                申请人：{t.applicantName}（{t.applicantUserId}）
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { setActiveTaskId(t.taskId); setDrawerOpen(true); }}>处理</button>

              </div>
            </div>
          ))}
          {inbox.length === 0 ? <div style={{ color: "#666" }}>暂无待办</div> : null}
        </div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {done.map((t) => (
            <div key={t.taskId} style={{ border: "1px solid #ddd", padding: 10 }}>
              <div style={{ fontWeight: 700 }}>
                {t.formName} · 节点 {t.nodeId} · {t.actionTaken} · 实例 {t.instanceId}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                申请人：{t.applicantName} · 完成时间：{t.completedAt ? new Date(t.completedAt).toLocaleString() : "-"}
              </div>
            </div>
          ))}
          {done.length === 0 ? <div style={{ color: "#666" }}>暂无已办</div> : null}
        </div>
      )}

      <ApprovalDrawer
        open={drawerOpen}
        taskId={activeTaskId}
        userId={userId}
        onClose={() => setDrawerOpen(false)}
        onDone={refresh}
      />
    </div>
  );
}
