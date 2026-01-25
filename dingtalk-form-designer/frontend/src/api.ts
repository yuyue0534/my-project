import type { FormSchema } from "./types";
import { normalizeSchema } from "./utils/normalizeSchema";

export async function listForms(): Promise<FormSchema[]> {
  const res = await fetch("/api/forms");
  if (!res.ok) throw new Error("list forms failed");
  // return res.json();
  const arr = await res.json();
  return (Array.isArray(arr) ? arr : []).map(normalizeSchema);
}

export async function getForm(id: string): Promise<FormSchema> {
  const res = await fetch(`/api/forms/${id}`);
  if (!res.ok) throw new Error("get form failed");
  // return res.json();
  const one = await res.json();
  return normalizeSchema(one);
}

export async function saveForm(schema: FormSchema): Promise<FormSchema> {
  const res = await fetch("/api/forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(schema)
  });
  if (!res.ok) throw new Error("save form failed");
  return res.json();
}

export async function inboxTasks(userId: string) {
  const res = await fetch(`/api/tasks/inbox?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("inbox failed");
  return res.json();
}

export async function doneTasks(userId: string) {
  const res = await fetch(`/api/tasks/done?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("done tasks failed");
  return res.json();
}

export async function taskDetail(taskId: string) {
  const res = await fetch(`/api/tasks/${taskId}`);
  if (!res.ok) throw new Error("task detail failed");
  return res.json();
}

export async function actTask(taskId: string, body: any) {
  const res = await fetch(`/api/tasks/${taskId}/act`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createInstanceDraft(formId: string, body: any) {
  const res = await fetch(`/api/forms/${formId}/instances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("create instance failed");
  return res.json();
}

export async function updateInstanceData(instanceId: string, body: any) {
  const res = await fetch(`/api/instances/${instanceId}/data`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitInstance(instanceId: string, body: any) {
  const res = await fetch(`/api/instances/${instanceId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listInstances(userId: string, status: "DRAFT"|"RUNNING"|"DONE") {
  const res = await fetch(`/api/instances?userId=${encodeURIComponent(userId)}&scope=applicant&status=${status}`);
  if (!res.ok) throw new Error("list instances failed");
  return res.json();
}
