import React, { useEffect, useMemo, useState } from "react";
import { listForms, saveForm } from "./api";
import type { FormSchema } from "./types";
import Designer from "./designer/Designer";
import RuntimePreview from "./runtime/RuntimePreview";
import MyApplicantPanel from "./components/MyApplicantPanel";
import MyApproverPanel from "./components/MyApproverPanel";
import { normalizeSchema } from "./utils/normalizeSchema";


export default function App() {
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [current, setCurrent] = useState<FormSchema | null>(null);

  useEffect(() => {
    listForms().then(fs => {
      const norm = fs.map(normalizeSchema);
      setForms(norm);
      setCurrent(norm[0] || null);
    }).catch(err => alert(err.message));
  }, []);

  const formOptions = useMemo(() => forms.map(f => (
    <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
  )), [forms]);

  async function onSave(next: FormSchema) {
    const saved = normalizeSchema(await saveForm(next));
    const refreshed = (await listForms()).map(normalizeSchema);
    setForms(refreshed);
    setCurrent(saved);
    alert("已保存（draft 新版本）");
  }


  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100vh" }}>
      <div style={{ borderRight: "1px solid #eee", padding: 12, overflow: "auto" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={current?.id || ""}
            onChange={(e) => setCurrent(forms.find(f => f.id === e.target.value) || null)}
          >
            {formOptions}
          </select>
          <button onClick={() => current && onSave(current)}>保存 Schema(draft)</button>
        </div>

        {current ? <Designer schema={current} onChange={setCurrent} /> : <div>无表单</div>}
      </div>

      <div style={{ padding: 12, overflow: "auto" }}>
        <MyApplicantPanel currentForm={current} />
        <div style={{ height: 10 }} />
        <MyApproverPanel />
        <div style={{ height: 10 }} />

        <div className="card">
          <div className="card-header">
            <div>运行态预览（节点权限/必填/可见）</div>
          </div>
          <div className="card-body">
            {current ? <RuntimePreview schema={current} /> : <div className="text-muted">无表单</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
