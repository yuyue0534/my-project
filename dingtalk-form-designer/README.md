# dingtalk-form-designer (Workflow Low-code Demo)

A runnable MVP that mimics **DingTalk approval form** behavior:
- Form designer (schema + node policies)
- Runtime renderer (node-based visible/required/editable)
- Workflow runtime (SQLite): instances, task groups, tasks
- **Countersign (AND) / Or-sign (OR)** approvals
- **Branch conditions** (json-logic subset)
- **Return** to applicant (back to start)
- Applicant panels: drafts / running / done
- Approver panels: inbox / done, with approval drawer rendering only visible fields per node policy

## Tech
- Backend: Go + Chi + SQLite (pure Go driver `modernc.org/sqlite`, no CGO)
- Frontend: Vite + React + TypeScript

## Quick Start

### 1) Backend
```bash
cd backend
go mod download
CGO_ENABLED=0 go run .
```
Backend runs on: http://localhost:3001

### 2) Frontend
```bash
cd frontend
npm i
npm run dev
```
Frontend runs on: http://localhost:3000 (proxy /api -> backend)

## Demo users (seeded)
- Applicant: u1 Alice
- Manager: u3 Bob (role=manager)
- HR: u2 Lily (role=hr)

## Demo flow (seeded form)
1. Applicant creates a draft (start node), edits, then **Submit**
2. Manager approves:
   - If `days <= 3` -> end (Approved)
   - If `days > 3` -> HR
3. HR approves -> end (Approved)
4. Manager/HR can **Return** -> start (applicant edits and submits again)

## Notes
- Branch condition: json-logic subset (var, ==, !=, >, >=, <, <=, and, or)
- AND/OR countersign is implemented via `task_groups` + multiple `tasks`.
