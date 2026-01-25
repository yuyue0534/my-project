import jsonLogic from "json-logic-js";
import type { FormSchema, Field } from "../types";

export type RuntimeContext = {
  nodeId: string;
  user: { id: string; name: string; roles: string[]; deptId?: string };
  action: "start" | "approve";
};

export type FieldRuntimeState = {
  visible: boolean;
  required: boolean;
  readonly: boolean;
};

function starOrIncludes(list: string[] | undefined, id: string) {
  if (!list) return false;
  return list.includes("*") || list.includes(id);
}

export function computeFieldState(schema: FormSchema, field: Field, formData: any, ctx: RuntimeContext): FieldRuntimeState {
  const policy = schema.workflow.policies?.[ctx.nodeId];

  let visible = true;
  let required = !!field.required;
  let readonly = !!field.readonly;

  if (policy) {
    visible = starOrIncludes(policy.visible || ["*"], field.id);
    readonly = !starOrIncludes(policy.editable || [], field.id) || readonly;
    required = (policy.required || []).includes(field.id) || required;
  }

  if (visible && field.visibleWhen) {
    try {
      const data = { form: formData, ctx };
      visible = !!jsonLogic.apply(field.visibleWhen, data);
    } catch {
      visible = true;
    }
  }

  return { visible, required, readonly };
}

// calculation: minimal built-in sum(items.cost)
function sumPath(arr: any[], key: string) {
  return (arr || []).reduce((acc, row) => acc + (Number(row?.[key]) || 0), 0);
}

export function applyCalculations(schema: FormSchema, data: any): any {
  const next = { ...data };
  for (const c of (schema.calculations || [])) {
    if (c.expr.startsWith("sum(") && c.expr.endsWith(")")) {
      const inside = c.expr.slice(4, -1); // items.cost
      const [tableId, colId] = inside.split(".");
      next[c.targetFieldId] = sumPath(next[tableId] || [], colId);
    }
  }
  return next;
}
