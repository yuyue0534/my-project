package main

import (
	"database/sql"
	"encoding/json"
	"time"
)

func seedDemo(db *sql.DB) error {
	// users + org
	_, _ = db.Exec(`INSERT OR IGNORE INTO users(id,name) VALUES ('u1','Alice'),('u2','Lily'),('u3','Bob')`)
	_, _ = db.Exec(`INSERT OR IGNORE INTO depts(id,name) VALUES ('d1','研发'),('d2','HR')`)
	_, _ = db.Exec(`INSERT OR IGNORE INTO user_depts(user_id,dept_id) VALUES ('u1','d1'),('u2','d2'),('u3','d1')`)
	_, _ = db.Exec(`INSERT OR IGNORE INTO user_roles(user_id,role_id) VALUES ('u3','manager'),('u2','hr')`)

	// if published exists, do nothing
	var cnt int
	_ = db.QueryRow(`SELECT COUNT(1) FROM forms WHERE id='leave_form_v1' AND version=1 AND status='published'`).Scan(&cnt)
	if cnt > 0 {
		return nil
	}

	schema := map[string]any{
		"id":      "leave_form_v1",
		"name":    "请假审批",
		"version": 1,
		"fields": []any{
			map[string]any{"id": "title", "type": "text", "label": "标题", "required": true},
			map[string]any{"id": "applicant", "type": "member", "label": "申请人", "required": true},
			map[string]any{"id": "dept", "type": "department", "label": "部门", "required": true},
			map[string]any{"id": "leaveType", "type": "select", "label": "请假类型", "options": []string{"年假", "事假", "病假"}, "required": true},
			map[string]any{"id": "days", "type": "number", "label": "天数", "required": true, "min": 0.5, "step": 0.5},
			map[string]any{"id": "reason", "type": "textarea", "label": "事由", "required": true},
			map[string]any{"id": "needAttachment", "type": "switch", "label": "是否需要证明材料", "defaultValue": false},
			map[string]any{
				"id": "proof", "type": "attachment", "label": "证明材料",
				"visibleWhen": map[string]any{"==": []any{map[string]any{"var": "form.needAttachment"}, true}},
			},
			map[string]any{
				"id": "items", "type": "subtable", "label": "行程明细", "maxRows": 20,
				"columns": []any{
					map[string]any{"id": "date", "type": "date", "label": "日期", "required": true},
					map[string]any{"id": "city", "type": "text", "label": "城市", "required": true},
					map[string]any{"id": "cost", "type": "money", "label": "预估费用", "required": true, "min": 0},
				},
			},
			map[string]any{"id": "totalCost", "type": "money", "label": "费用合计", "readonly": true},
		},
		"calculations": []any{
			map[string]any{"targetFieldId": "totalCost", "expr": "sum(items.cost)"},
		},
		"workflow": map[string]any{
			"nodes": []any{
				map[string]any{"id": "start", "name": "发起"},
				map[string]any{"id": "manager", "name": "直属主管审批"},
				map[string]any{"id": "hr", "name": "HR 复核"},
				map[string]any{"id": "end", "name": "结束"},
			},
			"edges": []any{
				// submit -> manager (OR)
				map[string]any{
					"from": "start", "to": "manager", "on": "submit", "mode": "OR",
					"assignees": []any{map[string]any{"type": "role", "id": "manager"}},
				},
				// manager approve branches
				map[string]any{
					"from": "manager", "to": "hr", "on": "approve", "mode": "OR",
					"assignees": []any{map[string]any{"type": "role", "id": "hr"}},
					"condition": map[string]any{">": []any{map[string]any{"var": "form.days"}, 3}},
				},
				map[string]any{
					"from": "manager", "to": "end", "on": "approve", "mode": "OR",
					"condition": map[string]any{"<=": []any{map[string]any{"var": "form.days"}, 3}},
				},
				// manager return -> start to applicant
				map[string]any{
					"from": "manager", "to": "start", "on": "return", "mode": "OR",
					"assignees": []any{map[string]any{"type": "applicant", "id": ""}},
				},
				// hr approve -> end
				map[string]any{"from": "hr", "to": "end", "on": "approve", "mode": "OR"},
				// hr return -> start
				map[string]any{
					"from": "hr", "to": "start", "on": "return", "mode": "OR",
					"assignees": []any{map[string]any{"type": "applicant", "id": ""}},
				},
			},
			"policies": map[string]any{
				"start":   map[string]any{"visible": []string{"*"}, "editable": []string{"*"}, "required": []string{"title", "applicant", "dept", "leaveType", "days", "reason"}},
				"manager": map[string]any{"visible": []string{"*"}, "editable": []string{"reason", "items"}, "required": []string{}},
				"hr":      map[string]any{"visible": []string{"*"}, "editable": []string{"proof"}, "required": []string{"proof"}},
			},
		},
	}

	b, _ := json.Marshal(schema)
	now := time.Now().UnixMilli()
	_, err := db.Exec(`INSERT INTO forms(id,version,name,status,schema_json,updated_at) VALUES (?,?,?,?,?,?)`,
		"leave_form_v1", 1, "请假审批", "published", string(b), now)
	return err
}
