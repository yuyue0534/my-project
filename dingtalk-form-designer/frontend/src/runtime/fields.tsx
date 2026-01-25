import React from "react";
import type { Field } from "../types";

export function FieldInput({
  field,
  value,
  readonly,
  onChange
}: {
  field: Field;
  value: any;
  readonly: boolean;
  onChange: (v: any) => void;
}) {
  const common = { disabled: readonly };

  switch (field.type) {
    case "text":
      return <input {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "textarea":
      return <textarea {...(common as any)} rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
    case "money":
      return <input {...common} type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
    case "select":
      return (
        <select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">请选择</option>
          {(field as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "switch":
      return (
        <input
          {...common}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "date":
      return <input {...common} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "attachment":
      return <input {...common} placeholder="Demo：用 URL 代替附件" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "department":
      return <input {...common} placeholder="Demo：部门ID/名称" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "member":
      return <input {...common} placeholder="Demo：成员ID/名称" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "subtable": {
      const rows: any[] = Array.isArray(value) ? value : [];
      const columns = (field as any).columns as Field[];

      return (
        <div style={{ border: "1px solid #ddd", padding: 8 }}>
          <button
            disabled={readonly}
            onClick={() => onChange(rows.concat([{}]))}
          >
            + 添加一行
          </button>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {rows.map((row, idx) => (
              <div key={idx} style={{ border: "1px solid #eee", padding: 8 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <div>第 {idx + 1} 行</div>
                  <button className="btn btn-danger"
                    disabled={readonly}
                    onClick={() => onChange(rows.filter((_, i) => i !== idx))}
                  >
                    删除
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, marginTop: 8 }}>
                  {columns.map(col => (
                    <React.Fragment key={col.id}>
                      <div>{col.label}</div>
                      <FieldInput
                        field={col}
                        value={(row as any)[col.id]}
                        readonly={readonly}
                        onChange={(v) => {
                          const next = rows.slice();
                          next[idx] = { ...row, [col.id]: v };
                          onChange(next);
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return <div>Unsupported field type: {(field as any).type}</div>;
  }
}
