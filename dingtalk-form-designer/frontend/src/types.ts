export type FieldType =
  | "text" | "textarea" | "number" | "money" | "select"
  | "switch" | "date" | "attachment" | "department" | "member"
  | "subtable";

export type JsonLogic = any;

export type FieldBase = {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  readonly?: boolean;
  defaultValue?: any;
  visibleWhen?: JsonLogic;
};

export type SelectField = FieldBase & { type: "select"; options: string[] };
export type NumberField = FieldBase & { type: "number" | "money"; min?: number; step?: number };
export type SubtableField = FieldBase & {
  type: "subtable";
  columns: Array<FieldBase>;
  maxRows?: number;
};

export type Field = FieldBase | SelectField | NumberField | SubtableField;

export type Calc = { targetFieldId: string; expr: string };

export type Node = { id: string; name: string };

export type NodePolicy = {
  visible: string[];
  editable: string[];
  required: string[];
};

export type FormSchema = {
  id: string;
  name: string;
  version: number;
  fields: Field[];
  calculations?: Calc[];
  workflow: {
    nodes: Node[];
    edges?: any[];
    policies: Record<string, NodePolicy>;
  };
};
