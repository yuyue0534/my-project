import React, { useEffect, useState } from "react";
import type { Field } from "../types";

export default function FieldEditor({
  field,
  onChange
}: {
  field: Field | null;
  onChange: (patch: Partial<Field>) => void;
}) {
  const [visibleWhenText, setVisibleWhenText] = useState("");

  useEffect(() => {
    setVisibleWhenText(field?.visibleWhen ? JSON.stringify(field.visibleWhen, null, 2) : "");
  }, [field?.id]);

  if (!field) return <div style={{ border: "1px solid #eee", padding: 8 }}>未选择字段</div>;

  const isSelect = field.type === "select";
  const isSubtable = field.type === "subtable";

  return (
    <div style={{ border: "1px solid #eee", padding: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>字段属性</div>

      <div style={{ display: "grid", gap: 8 }}>
        <label>
          Label：
          <input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
        </label>

        <label>
          Required：
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
        </label>

        <label>
          Readonly：
          <input
            type="checkbox"
            checked={!!field.readonly}
            onChange={(e) => onChange({ readonly: e.target.checked })}
          />
        </label>

        {isSelect ? (
          <label>
            Options（逗号分隔）：
            <input
              value={(field as any).options.join(",")}
              onChange={(e) => onChange({ ...(field as any), options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
            />
          </label>
        ) : null}

        {isSubtable ? (
          <div style={{ fontSize: 12, color: "#666" }}>
            子表列编辑在 Demo 中简化：可扩展为“列设计器”
          </div>
        ) : null}

        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>条件显示 visibleWhen（json-logic）</div>
          <textarea
            rows={8}
            value={visibleWhenText}
            placeholder='例如：{ "==": [ { "var": "form.needAttachment" }, true ] }'
            onChange={(e) => setVisibleWhenText(e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={() => {
                if (!visibleWhenText.trim()) return onChange({ visibleWhen: undefined });
                try {
                  const parsed = JSON.parse(visibleWhenText);
                  onChange({ visibleWhen: parsed });
                  alert("visibleWhen 已更新");
                } catch {
                  alert("JSON 解析失败");
                }
              }}
            >
              应用 visibleWhen
            </button>
            <button onClick={() => { setVisibleWhenText(""); onChange({ visibleWhen: undefined }); }}>
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
