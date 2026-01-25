package main

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type DoneTaskRow struct {
	TaskID      string `json:"taskId"`
	NodeID      string `json:"nodeId"`
	ActionTaken string `json:"actionTaken"`
	CompletedAt int64  `json:"completedAt"`

	InstanceID     string `json:"instanceId"`
	InstanceStatus string `json:"instanceStatus"`
	CurrentNode    string `json:"currentNode"`

	FormID   string `json:"formId"`
	FormName string `json:"formName"`

	ApplicantName string `json:"applicantName"`
}

func (s *Server) ListDoneTasks(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		writeJSON(w, 400, map[string]any{"error": "userId required"})
		return
	}

	rows, err := s.DB.Query(`
		SELECT
		  t.id, t.node_id, COALESCE(t.action_taken,''), COALESCE(t.completed_at,0),
		  i.id, i.status, i.current_node,
		  f.id, f.name,
		  u.name
		FROM tasks t
		JOIN instances i ON i.id=t.instance_id
		JOIN forms f ON f.id=i.form_id AND f.version=i.form_version
		JOIN users u ON u.id=i.applicant_user_id
		WHERE t.status='DONE' AND t.actor_user_id=?
		ORDER BY t.completed_at DESC
	`, userID)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	defer rows.Close()

	var out []DoneTaskRow
	for rows.Next() {
		var x DoneTaskRow
		if err := rows.Scan(
			&x.TaskID, &x.NodeID, &x.ActionTaken, &x.CompletedAt,
			&x.InstanceID, &x.InstanceStatus, &x.CurrentNode,
			&x.FormID, &x.FormName,
			&x.ApplicantName,
		); err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
		out = append(out, x)
	}
	writeJSON(w, 200, out)
}

type TaskDetailResp struct {
	Task     map[string]any `json:"task"`
	Instance map[string]any `json:"instance"`
	Schema   FormSchema     `json:"schema"`
}

func (s *Server) GetTaskDetail(w http.ResponseWriter, r *http.Request) {
	taskID := chi.URLParam(r, "id")
	task, inst, schema, err := s.loadTaskInstanceSchema(taskID)
	if err != nil {
		writeJSON(w, 404, map[string]any{"error": err.Error()})
		return
	}

	resp := TaskDetailResp{
		Task: map[string]any{
			"id":           task.ID,
			"groupId":      task.GroupID,
			"instanceId":   task.InstanceID,
			"nodeId":       task.NodeID,
			"status":       task.Status,
			"assigneeType": task.AssigneeType,
			"assigneeId":   task.AssigneeID,
		},
		Instance: map[string]any{
			"id":              inst.ID,
			"formId":          inst.FormID,
			"formVersion":     inst.FormVersion,
			"status":          inst.Status,
			"currentNode":     inst.CurrentNode,
			"data":            inst.Data,
			"applicantUserId": inst.ApplicantUserID,
		},
		Schema: *schema,
	}

	b, _ := json.Marshal(resp)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	_, _ = w.Write(b)
}
