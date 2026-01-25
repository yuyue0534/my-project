import React from "react";
import type { Field } from "../types";

export default function FieldCanvas({
  fields,
  selectedFieldId,
  onSelect,
  onDelete
}: {
  fields: Field[];
  selectedFieldId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{ border: "1px solid #eee", padding: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>表单字段</div>
      <div style={{ display: "grid", gap: 6 }}>
        {fields.map(f => (
          <div
            key={f.id}
            style={{
              border: "1px solid #ddd",
              padding: 8,
              cursor: "pointer",
              background: f.id === selectedFieldId ? "#f5f7ff" : "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8
            }}
            onClick={() => onSelect(f.id)}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{f.type} · {f.id}</div>
            </div>
            <button className="btn btn-outline btn-outline-danger btn-sm" onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}>删除</button>

          </div>
        ))}
      </div>
    </div>
  );
}
