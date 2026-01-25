import React, { useMemo, useState } from "react";
import type { Field, FormSchema } from "../types";
import FieldPalette from "./FieldPalette";
import FieldCanvas from "./FieldCanvas";
import FieldEditor from "./FieldEditor";
import NodePolicyEditor from "./NodePolicyEditor";

export default function Designer({
  schema,
  onChange
}: { schema: FormSchema; onChange: (s: FormSchema) => void }) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(schema.fields[0]?.id || null);
  const [tab, setTab] = useState<"fields" | "nodes">("fields");

  const selectedField = useMemo(
    () => schema.fields.find(f => f.id === selectedFieldId) || null,
    [schema.fields, selectedFieldId]
  );

  function addField(f: Field) {
    const next = { ...schema, fields: schema.fields.concat(f) };
    onChange(next);
    setSelectedFieldId(f.id);
  }

  function updateField(patch: Partial<Field>) {
    if (!selectedFieldId) return;
    const nextFields = schema.fields.map(f => f.id === selectedFieldId ? ({ ...f, ...patch } as Field) : f);
    onChange({ ...schema, fields: nextFields });
  }

  function deleteField(id: string) {
    const nextFields = schema.fields.filter(f => f.id !== id);
    onChange({ ...schema, fields: nextFields });
    setSelectedFieldId(nextFields[0]?.id || null);
  }

  return (
    <div>
      <h2 style={{ margin: "12px 0" }}>{schema.name}</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("fields")} disabled={tab === "fields"}>字段设计</button>
        <button onClick={() => setTab("nodes")} disabled={tab === "nodes"}>节点权限</button>
      </div>

      {tab === "fields" ? (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 320px", gap: 12 }}>
          <FieldPalette onAdd={addField} />
          <FieldCanvas
            fields={schema.fields}
            selectedFieldId={selectedFieldId}
            onSelect={setSelectedFieldId}
            onDelete={deleteField}
          />
          <FieldEditor field={selectedField} onChange={updateField} />
        </div>
      ) : (
        <NodePolicyEditor schema={schema} onChange={onChange} />
      )}
    </div>
  );
}
