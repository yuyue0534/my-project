import React from "react";
import type { Field } from "../types";

function uid(prefix: string) {
  return prefix + "_" + Math.random().toString(16).slice(2, 8);
}

export default function FieldPalette({ onAdd }: { onAdd: (f: Field) => void }) {
  const buttons: Array<{ label: string; mk: () => Field }> = [
    { label: "文本", mk: () => ({ id: uid("text"), type: "text", label: "文本" }) },
    { label: "多行文本", mk: () => ({ id: uid("ta"), type: "textarea", label: "多行文本" }) },
    { label: "数字", mk: () => ({ id: uid("num"), type: "number", label: "数字", step: 1 }) as any },
    { label: "金额", mk: () => ({ id: uid("money"), type: "money", label: "金额", min: 0, step: 0.01 }) as any },
    { label: "下拉", mk: () => ({ id: uid("sel"), type: "select", label: "下拉", options: ["A", "B"] }) as any },
    { label: "开关", mk: () => ({ id: uid("sw"), type: "switch", label: "开关", defaultValue: false }) },
    { label: "日期", mk: () => ({ id: uid("date"), type: "date", label: "日期" }) },
    { label: "附件", mk: () => ({ id: uid("att"), type: "attachment", label: "附件" }) },
    { label: "部门", mk: () => ({ id: uid("dept"), type: "department", label: "部门" }) },
    { label: "成员", mk: () => ({ id: uid("mem"), type: "member", label: "成员" }) },
    {
      label: "子表",
      mk: () => ({
        id: uid("sub"),
        type: "subtable",
        label: "子表",
        columns: [
          { id: "col1", type: "text", label: "列1", required: true },
          { id: "col2", type: "money", label: "列2", required: true, min: 0, step: 0.01 } as any
        ],
        maxRows: 20
      }) as any
    }
  ];

  return (
    <div style={{ border: "1px solid #eee", padding: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>字段库</div>
      <div style={{ display: "grid", gap: 6 }}>
        {buttons.map(b => (
          <button key={b.label} onClick={() => onAdd(b.mk())}>{b.label}</button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
        注：条件显示/计算字段在属性中配置；edges/会签/分支/退回由后端 seed 示例提供
      </div>
    </div>
  );
}
