package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type Server struct{ DB *sql.DB }

/* ---------------- DB models ---------------- */

type Instance struct {
	ID              string
	FormID          string
	FormVersion     int
	Status          string
	CurrentNode     string
	Data            map[string]any
	ApplicantUserID string
}

type Task struct {
	ID           string
	GroupID      string
	InstanceID   string
	NodeID       string
	Status       string
	AssigneeType string
	AssigneeID   string
}

/* ---------------- forms ---------------- */

func (s *Server) ListForms(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(`
		SELECT f1.schema_json
		FROM forms f1
		JOIN (
			SELECT id, MAX(version) AS v FROM forms WHERE status='published' GROUP BY id
		) latest
		ON f1.id=latest.id AND f1.version=latest.v
		ORDER BY f1.updated_at DESC`)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	defer rows.Close()

	var out []any
	for rows.Next() {
		var sj string
		_ = rows.Scan(&sj)
		var schema any
		_ = json.Unmarshal([]byte(sj), &schema)
		out = append(out, schema)
	}
	writeJSON(w, 200, out)
}

func (s *Server) GetForm(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var sj string
	err := s.DB.QueryRow(`
		SELECT schema_json FROM forms
		WHERE id=? AND status='published'
		ORDER BY version DESC LIMIT 1`, id).Scan(&sj)
	if err != nil {
		writeJSON(w, 404, map[string]any{"error": "not found"})
		return
	}
	var schema any
	_ = json.Unmarshal([]byte(sj), &schema)
	writeJSON(w, 200, schema)
}

func (s *Server) SaveForm(w http.ResponseWriter, r *http.Request) {
	var schema FormSchema
	if err := json.NewDecoder(r.Body).Decode(&schema); err != nil {
		writeJSON(w, 400, map[string]any{"error": "bad json"})
		return
	}
	if schema.ID == "" || schema.Name == "" {
		writeJSON(w, 400, map[string]any{"error": "id/name required"})
		return
	}
	var maxV int
	_ = s.DB.QueryRow(`SELECT COALESCE(MAX(version),0) FROM forms WHERE id=?`, schema.ID).Scan(&maxV)
	schema.Version = maxV + 1

	b, _ := json.Marshal(schema)
	now := time.Now().UnixMilli()
	_, err := s.DB.Exec(`INSERT INTO forms(id,version,name,status,schema_json,updated_at) VALUES (?,?,?,?,?,?)`,
		schema.ID, schema.Version, schema.Name, "draft", string(b), now)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, 200, schema)
}

func (s *Server) PublishForm(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := s.DB.Exec(`
		UPDATE forms SET status='published', updated_at=?
		WHERE id=? AND version = (SELECT MAX(version) FROM forms WHERE id=?)
	`, time.Now().UnixMilli(), id, id)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

/* ---------------- instances ---------------- */

type CreateInstanceReq struct {
	UserID string         `json:"userId"`
	Data   map[string]any `json:"data"`
}

func (s *Server) CreateInstanceDraft(w http.ResponseWriter, r *http.Request) {
	formID := chi.URLParam(r, "id")
	var req CreateInstanceReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]any{"error": "bad json"})
		return
	}
	if req.UserID == "" {
		writeJSON(w, 400, map[string]any{"error": "userId required"})
		return
	}

	var ver int
	var sj string
	err := s.DB.QueryRow(`
		SELECT version, schema_json FROM forms
		WHERE id=? AND status='published'
		ORDER BY version DESC LIMIT 1`, formID).Scan(&ver, &sj)
	if err != nil {
		writeJSON(w, 404, map[string]any{"error": "form not found"})
		return
	}

	instID := newID("inst")
	now := time.Now().UnixMilli()
	dataJSON, _ := json.Marshal(req.Data)

	_, err = s.DB.Exec(`INSERT INTO instances(id,form_id,form_version,status,current_node,data_json,applicant_user_id,created_at,updated_at)
		VALUES (?,?,?,?,?,?,?,?,?)`,
		instID, formID, ver, "DRAFT", "start", string(dataJSON), req.UserID, now, now)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"id": instID, "status": "DRAFT", "currentNode": "start"})
}

func (s *Server) GetInstance(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := s.DB.QueryRow(`SELECT id,form_id,form_version,status,current_node,data_json,applicant_user_id FROM instances WHERE id=?`, id)

	var inst Instance
	var dataJSON string
	if err := row.Scan(&inst.ID, &inst.FormID, &inst.FormVersion, &inst.Status, &inst.CurrentNode, &dataJSON, &inst.ApplicantUserID); err != nil {
		writeJSON(w, 404, map[string]any{"error": "not found"})
		return
	}
	inst.Data = map[string]any{}
	_ = json.Unmarshal([]byte(dataJSON), &inst.Data)

	writeJSON(w, 200, map[string]any{
		"id":              inst.ID,
		"formId":          inst.FormID,
		"formVersion":     inst.FormVersion,
		"status":          inst.Status,
		"currentNode":     inst.CurrentNode,
		"data":            inst.Data,
		"applicantUserId": inst.ApplicantUserID,
	})
}

type SubmitReq struct{ UserID string `json:"userId"` }

func (s *Server) SubmitInstance(w http.ResponseWriter, r *http.Request) {
	instID := chi.URLParam(r, "id")
	var req SubmitReq
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.UserID == "" {
		writeJSON(w, 400, map[string]any{"error": "userId required"})
		return
	}

	inst, schema, err := s.loadInstanceWithSchema(instID)
	if err != nil {
		writeJSON(w, 404, map[string]any{"error": err.Error()})
		return
	}
	if inst.ApplicantUserID != req.UserID {
		writeJSON(w, 403, map[string]any{"error": "only applicant can submit"})
		return
	}
	if inst.CurrentNode != "start" || (inst.Status != "DRAFT" && inst.Status != "RUNNING") {
		writeJSON(w, 400, map[string]any{"error": "instance not submittable at current state"})
		return
	}

	if err := validateRequired(schema, "start", inst.Data); err != nil {
		writeJSON(w, 400, map[string]any{"error": err.Error()})
		return
	}

	edge, ok, err := findEdgeByCondition(schema, "start", "submit", inst.Data)
	if err != nil {
		writeJSON(w, 400, map[string]any{"error": err.Error()})
		return
	}
	if !ok {
		writeJSON(w, 400, map[string]any{"error": "no submit edge"})
		return
	}

	tx, _ := s.DB.Begin()
	defer tx.Rollback()
	now := time.Now().UnixMilli()

	// DRAFT/RUNNING -> RUNNING, node -> edge.To
	if _, err := tx.Exec(`UPDATE instances SET status='RUNNING', current_node=?, updated_at=? WHERE id=?`,
		edge.To, now, inst.ID); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}

	// create next node tasks
	if _, err := s.createNodeTasks(tx, inst, edge.To, edge, now); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "instanceId": inst.ID, "nextNode": edge.To})
}

/* ---------------- tasks ---------------- */

type InboxTaskRow struct {
	TaskID       string `json:"taskId"`
	TaskNodeID   string `json:"taskNodeId"`
	TaskStatus   string `json:"taskStatus"`
	AssigneeType string `json:"assigneeType"`
	AssigneeID   string `json:"assigneeId"`
	CreatedAt    int64  `json:"createdAt"`

	InstanceID     string `json:"instanceId"`
	InstanceStatus string `json:"instanceStatus"`
	CurrentNode    string `json:"currentNode"`
	ApplicantID    string `json:"applicantUserId"`
	ApplicantName  string `json:"applicantName"`

	FormID      string `json:"formId"`
	FormName    string `json:"formName"`
	FormVersion int    `json:"formVersion"`
}

func (s *Server) ListInboxTasks(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		writeJSON(w, 400, map[string]any{"error": "userId required"})
		return
	}

	rows, err := s.DB.Query(`
		SELECT
		  t.id, t.node_id, t.status, t.assignee_type, t.assignee_id, t.created_at,
		  i.id, i.status, i.current_node, i.applicant_user_id,
		  u.name,
		  f.id, f.name, i.form_version
		FROM tasks t
		JOIN instances i ON i.id = t.instance_id
		JOIN forms f ON f.id = i.form_id AND f.version = i.form_version
		JOIN users u ON u.id = i.applicant_user_id
		WHERE t.status='PENDING'
		AND (
		 (t.assignee_type='user' AND t.assignee_id=?)
		 OR
		 (t.assignee_type='role' AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=? AND ur.role_id=t.assignee_id))
		 OR
		 (t.assignee_type='dept' AND EXISTS (SELECT 1 FROM user_depts ud WHERE ud.user_id=? AND ud.dept_id=t.assignee_id))
		)
		ORDER BY t.created_at DESC
	`, userID, userID, userID)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	defer rows.Close()

	var out []InboxTaskRow
	for rows.Next() {
		var x InboxTaskRow
		if err := rows.Scan(
			&x.TaskID, &x.TaskNodeID, &x.TaskStatus, &x.AssigneeType, &x.AssigneeID, &x.CreatedAt,
			&x.InstanceID, &x.InstanceStatus, &x.CurrentNode, &x.ApplicantID,
			&x.ApplicantName,
			&x.FormID, &x.FormName, &x.FormVersion,
		); err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
		out = append(out, x)
	}
	writeJSON(w, 200, out)
}

type ActReq struct {
	UserID    string         `json:"userId"`
	Action    string         `json:"action"` // approve|reject|return
	Comment   string         `json:"comment"`
	DataPatch map[string]any `json:"dataPatch"`
}

func (s *Server) ActOnTask(w http.ResponseWriter, r *http.Request) {
	taskID := chi.URLParam(r, "id")
	var req ActReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]any{"error": "bad json"})
		return
	}
	if req.UserID == "" || (req.Action != "approve" && req.Action != "reject" && req.Action != "return") {
		writeJSON(w, 400, map[string]any{"error": "userId + action(approve|reject|return) required"})
		return
	}
	if req.DataPatch == nil {
		req.DataPatch = map[string]any{}
	}

	task, inst, schema, err := s.loadTaskInstanceSchema(taskID)
	if err != nil {
		writeJSON(w, 404, map[string]any{"error": err.Error()})
		return
	}
	if task.Status != "PENDING" {
		writeJSON(w, 400, map[string]any{"error": "task not pending"})
		return
	}

	ok, err := s.userMatchesAssignee(req.UserID, task.AssigneeType, task.AssigneeID)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	if !ok {
		writeJSON(w, 403, map[string]any{"error": "not allowed"})
		return
	}

	if inst.Status != "RUNNING" || inst.CurrentNode != task.NodeID {
		writeJSON(w, 400, map[string]any{"error": "instance/task node mismatch"})
		return
	}

	if err := enforceEditable(schema, task.NodeID, req.DataPatch); err != nil {
		writeJSON(w, 400, map[string]any{"error": err.Error()})
		return
	}
	for k, v := range req.DataPatch {
		inst.Data[k] = v
	}
	if err := validateRequired(schema, task.NodeID, inst.Data); err != nil {
		writeJSON(w, 400, map[string]any{"error": err.Error()})
		return
	}

	edge, found, err := findEdgeByCondition(schema, task.NodeID, req.Action, inst.Data)
	if err != nil {
		writeJSON(w, 400, map[string]any{"error": err.Error()})
		return
	}
	if !found && req.Action == "reject" {
		edge = Edge{From: task.NodeID, To: "end", On: "reject", Mode: "OR"}
		found = true
	}
	if !found {
		writeJSON(w, 400, map[string]any{"error": "no edge for action"})
		return
	}

	// load group state
	var mode, gStatus string
	var total, approved, rejected int
	if err := s.DB.QueryRow(`SELECT mode,status,total_count,approved_count,rejected_count FROM task_groups WHERE id=?`, task.GroupID).
		Scan(&mode, &gStatus, &total, &approved, &rejected); err != nil {
		writeJSON(w, 500, map[string]any{"error": "task group missing"})
		return
	}

	tx, _ := s.DB.Begin()
	defer tx.Rollback()
	now := time.Now().UnixMilli()

	// complete current task
	if _, err := tx.Exec(`UPDATE tasks SET status='DONE', action_taken=?, actor_user_id=?, comment=?, completed_at=? WHERE id=?`,
		req.Action, req.UserID, req.Comment, now, taskID); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}

	// update group counters
	if req.Action == "approve" {
		approved++
	} else if req.Action == "reject" {
		rejected++
	}
	if _, err := tx.Exec(`UPDATE task_groups SET approved_count=?, rejected_count=? WHERE id=?`, approved, rejected, task.GroupID); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}

	closeGroup := func() error {
		if _, err := tx.Exec(`UPDATE task_groups SET status='CLOSED', closed_at=? WHERE id=?`, now, task.GroupID); err != nil {
			return err
		}
		_, err := tx.Exec(`UPDATE tasks SET status='DONE', action_taken='auto_closed', completed_at=?
			WHERE group_id=? AND status='PENDING'`, now, task.GroupID)
		return err
	}

	nodeFinished := false
	if req.Action == "reject" || req.Action == "return" {
		nodeFinished = true
	} else {
		if mode == "" {
			mode = "OR"
		}
		if mode == "OR" && req.Action == "approve" {
			nodeFinished = true
		}
		if mode == "AND" && req.Action == "approve" && approved >= total {
			nodeFinished = true
		}
	}

	nextStatus := inst.Status
	nextNode := inst.CurrentNode

	if req.Action == "reject" {
		_ = closeGroup()
		nextStatus = "REJECTED"
		nextNode = "end"
	} else if req.Action == "return" {
		_ = closeGroup()
		nextStatus = "RUNNING"
		nextNode = edge.To // usually start
	} else if nodeFinished {
		if err := closeGroup(); err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
		nextNode = edge.To
		if nextNode == "end" {
			nextStatus = "APPROVED"
		}
	}

	dataJSON, _ := json.Marshal(inst.Data)
	if _, err := tx.Exec(`UPDATE instances SET status=?, current_node=?, data_json=?, updated_at=? WHERE id=?`,
		nextStatus, nextNode, string(dataJSON), now, inst.ID); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}

	if nodeFinished && nextNode != "end" {
		if _, err := s.createNodeTasks(tx, inst, nextNode, edge, now); err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "instanceId": inst.ID, "instanceStatus": nextStatus, "currentNode": nextNode})
}

/* ---------------- helpers: loading + rules ---------------- */

func (s *Server) loadInstanceWithSchema(instID string) (*Instance, *FormSchema, error) {
	row := s.DB.QueryRow(`SELECT id,form_id,form_version,status,current_node,data_json,applicant_user_id FROM instances WHERE id=?`, instID)
	var inst Instance
	var dataJSON string
	if err := row.Scan(&inst.ID, &inst.FormID, &inst.FormVersion, &inst.Status, &inst.CurrentNode, &dataJSON, &inst.ApplicantUserID); err != nil {
		return nil, nil, errors.New("instance not found")
	}
	inst.Data = map[string]any{}
	_ = json.Unmarshal([]byte(dataJSON), &inst.Data)

	var sj string
	if err := s.DB.QueryRow(`SELECT schema_json FROM forms WHERE id=? AND version=?`, inst.FormID, inst.FormVersion).Scan(&sj); err != nil {
		return nil, nil, errors.New("form schema not found")
	}
	var schema FormSchema
	if err := json.Unmarshal([]byte(sj), &schema); err != nil {
		return nil, nil, errors.New("schema json invalid")
	}
	return &inst, &schema, nil
}

func (s *Server) loadTaskInstanceSchema(taskID string) (*Task, *Instance, *FormSchema, error) {
	row := s.DB.QueryRow(`SELECT id,group_id,instance_id,node_id,status,assignee_type,assignee_id FROM tasks WHERE id=?`, taskID)
	var t Task
	if err := row.Scan(&t.ID, &t.GroupID, &t.InstanceID, &t.NodeID, &t.Status, &t.AssigneeType, &t.AssigneeID); err != nil {
		return nil, nil, nil, errors.New("task not found")
	}
	inst, schema, err := s.loadInstanceWithSchema(t.InstanceID)
	if err != nil {
		return nil, nil, nil, err
	}
	return &t, inst, schema, nil
}

func findEdgeByCondition(schema *FormSchema, from, on string, data map[string]any) (Edge, bool, error) {
	for _, e := range schema.Workflow.Edges {
		if e.From != from || e.On != on {
			continue
		}
		if e.Mode == "" {
			e.Mode = "OR"
		}
		ok, err := EvalJsonLogic(e.Condition, JLContext{Form: data})
		if err != nil {
			return Edge{}, false, err
		}
		if ok {
			return e, true, nil
		}
	}
	return Edge{}, false, nil
}

func validateRequired(schema *FormSchema, nodeID string, data map[string]any) error {
	p, ok := schema.Workflow.Policies[nodeID]
	if !ok {
		return nil
	}
	for _, fid := range p.Required {
		v, exists := data[fid]
		if !exists || v == nil || isEmptyString(v) {
			return errors.New("missing required field: " + fid)
		}
	}
	return nil
}

func enforceEditable(schema *FormSchema, nodeID string, patch map[string]any) error {
	if len(patch) == 0 {
		return nil
	}
	p, ok := schema.Workflow.Policies[nodeID]
	if !ok {
		return errors.New("no policy for node " + nodeID)
	}
	hasStar := false
	editable := map[string]bool{}
	for _, x := range p.Editable {
		if x == "*" {
			hasStar = true
		}
		editable[x] = true
	}
	if hasStar {
		return nil
	}
	for k := range patch {
		if !editable[k] {
			return errors.New("field not editable at node " + nodeID + ": " + k)
		}
	}
	return nil
}

func (s *Server) userMatchesAssignee(userID, typ, id string) (bool, error) {
	switch typ {
	case "user":
		return userID == id, nil
	case "role":
		var cnt int
		if err := s.DB.QueryRow(`SELECT COUNT(1) FROM user_roles WHERE user_id=? AND role_id=?`, userID, id).Scan(&cnt); err != nil {
			return false, err
		}
		return cnt > 0, nil
	case "dept":
		var cnt int
		if err := s.DB.QueryRow(`SELECT COUNT(1) FROM user_depts WHERE user_id=? AND dept_id=?`, userID, id).Scan(&cnt); err != nil {
			return false, err
		}
		return cnt > 0, nil
	default:
		return false, nil
	}
}

func isEmptyString(v any) bool {
	s, ok := v.(string)
	return ok && s == ""
}

func (s *Server) createNodeTasks(tx *sql.Tx, inst *Instance, nodeID string, edge Edge, now int64) (string, error) {
	if nodeID == "end" {
		return "", nil
	}
	assignees := edge.Assignees
	if len(assignees) == 0 {
		return "", errors.New("node " + nodeID + " has no assignees")
	}
	mode := edge.Mode
	if mode == "" {
		mode = "OR"
	}

	groupID := newID("tg")
	total := len(assignees)
	if _, err := tx.Exec(`INSERT INTO task_groups(id,instance_id,node_id,mode,status,total_count,approved_count,rejected_count,created_at)
		VALUES (?,?,?,?,?,?,?,?,?)`,
		groupID, inst.ID, nodeID, mode, "OPEN", total, 0, 0, now); err != nil {
		return "", err
	}

	for _, a := range assignees {
		typ := a.Type
		aid := a.ID
		if typ == "applicant" {
			typ = "user"
			aid = inst.ApplicantUserID
		}
		taskID := newID("task")
		if _, err := tx.Exec(`INSERT INTO tasks(id,group_id,instance_id,node_id,status,assignee_type,assignee_id,created_at)
			VALUES (?,?,?,?,?,?,?,?)`,
			taskID, groupID, inst.ID, nodeID, "PENDING", typ, aid, now); err != nil {
			return "", err
		}
	}
	return groupID, nil
}
