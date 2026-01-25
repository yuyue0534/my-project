package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type InstanceListRow struct {
	ID          string `json:"id"`
	FormID      string `json:"formId"`
	FormName    string `json:"formName"`
	FormVersion int    `json:"formVersion"`
	Status      string `json:"status"`
	CurrentNode string `json:"currentNode"`
	ApplicantID string `json:"applicantUserId"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

func (s *Server) ListInstances(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	scope := r.URL.Query().Get("scope")   // applicant (MVP only)
	status := r.URL.Query().Get("status") // DRAFT|RUNNING|DONE
	if userID == "" || scope != "applicant" || (status != "DRAFT" && status != "RUNNING" && status != "DONE") {
		writeJSON(w, 400, map[string]any{"error": "query required: userId, scope=applicant, status=DRAFT|RUNNING|DONE"})
		return
	}

	whereStatus := ""
	switch status {
	case "DRAFT":
		whereStatus = `i.status='DRAFT'`
	case "RUNNING":
		whereStatus = `i.status='RUNNING'`
	case "DONE":
		whereStatus = `(i.status='APPROVED' OR i.status='REJECTED')`
	}

	q := `
		SELECT
		  i.id, i.form_id, f.name, i.form_version, i.status, i.current_node, i.applicant_user_id, i.created_at, i.updated_at
		FROM instances i
		JOIN forms f ON f.id=i.form_id AND f.version=i.form_version
		WHERE i.applicant_user_id=? AND ` + whereStatus + `
		ORDER BY i.updated_at DESC
	`
	rows, err := s.DB.Query(q, userID)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}
	defer rows.Close()

	var out []InstanceListRow
	for rows.Next() {
		var x InstanceListRow
		if err := rows.Scan(&x.ID, &x.FormID, &x.FormName, &x.FormVersion, &x.Status, &x.CurrentNode, &x.ApplicantID, &x.CreatedAt, &x.UpdatedAt); err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
		out = append(out, x)
	}
	writeJSON(w, 200, out)
}

type UpdateInstanceDataReq struct {
	UserID    string         `json:"userId"`
	DataPatch map[string]any `json:"dataPatch"`
}

func (s *Server) UpdateInstanceData(w http.ResponseWriter, r *http.Request) {
	instID := chi.URLParam(r, "id")
	var req UpdateInstanceDataReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, map[string]any{"error": "bad json"})
		return
	}
	if req.UserID == "" {
		writeJSON(w, 400, map[string]any{"error": "userId required"})
		return
	}
	if req.DataPatch == nil {
		req.DataPatch = map[string]any{}
	}

	inst, schema, err := s.loadInstanceWithSchema(instID)
	if err != nil {
		writeJSON(w, 404, map[string]any{"error": err.Error()})
		return
	}
	if inst.ApplicantUserID != req.UserID {
		writeJSON(w, 403, map[string]any{"error": "only applicant can edit instance data"})
		return
	}
	if inst.CurrentNode != "start" {
		writeJSON(w, 400, map[string]any{"error": "instance not editable at current node (only start)"})
		return
	}
	if inst.Status != "DRAFT" && inst.Status != "RUNNING" {
		writeJSON(w, 400, map[string]any{"error": "instance not editable in current status"})
		return
	}

	// strict editable checks
	if err := enforceEditable(schema, "start", req.DataPatch); err != nil {
		writeJSON(w, 400, map[string]any{"error": err.Error()})
		return
	}

	for k, v := range req.DataPatch {
		inst.Data[k] = v
	}
	dataJSON, _ := json.Marshal(inst.Data)
	now := time.Now().UnixMilli()
	_, err = s.DB.Exec(`UPDATE instances SET data_json=?, updated_at=? WHERE id=?`, string(dataJSON), now, inst.ID)
	if err != nil {
		writeJSON(w, 500, map[string]any{"error": err.Error()})
		return
	}

	writeJSON(w, 200, map[string]any{"ok": true, "instanceId": inst.ID, "updatedAt": now})
}
