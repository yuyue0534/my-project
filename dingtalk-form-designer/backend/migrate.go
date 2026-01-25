package main

import "database/sql"

func migrate(db *sql.DB) error {
	stmts := []string{
		`PRAGMA foreign_keys = ON;`,

		`CREATE TABLE IF NOT EXISTS forms (
			id TEXT NOT NULL,
			version INTEGER NOT NULL,
			name TEXT NOT NULL,
			status TEXT NOT NULL, -- draft|published
			schema_json TEXT NOT NULL,
			updated_at INTEGER NOT NULL,
			PRIMARY KEY (id, version)
		);`,

		`CREATE TABLE IF NOT EXISTS instances (
			id TEXT PRIMARY KEY,
			form_id TEXT NOT NULL,
			form_version INTEGER NOT NULL,
			status TEXT NOT NULL,       -- DRAFT|RUNNING|APPROVED|REJECTED
			current_node TEXT NOT NULL, -- start/manager/hr/end
			data_json TEXT NOT NULL,
			applicant_user_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY(form_id, form_version) REFERENCES forms(id, version)
		);`,

		`CREATE TABLE IF NOT EXISTS task_groups (
			id TEXT PRIMARY KEY,
			instance_id TEXT NOT NULL,
			node_id TEXT NOT NULL,
			mode TEXT NOT NULL,           -- AND|OR
			status TEXT NOT NULL,         -- OPEN|CLOSED
			total_count INTEGER NOT NULL,
			approved_count INTEGER NOT NULL,
			rejected_count INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			closed_at INTEGER,
			FOREIGN KEY(instance_id) REFERENCES instances(id)
		);`,

		`CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			group_id TEXT,
			instance_id TEXT NOT NULL,
			node_id TEXT NOT NULL,
			status TEXT NOT NULL, -- PENDING|DONE
			assignee_type TEXT NOT NULL, -- user|role|dept
			assignee_id TEXT NOT NULL,
			action_taken TEXT, -- approve|reject|return|submit|auto_closed
			actor_user_id TEXT,
			comment TEXT,
			created_at INTEGER NOT NULL,
			completed_at INTEGER,
			FOREIGN KEY(instance_id) REFERENCES instances(id),
			FOREIGN KEY(group_id) REFERENCES task_groups(id)
		);`,

		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS depts (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS user_depts (
			user_id TEXT NOT NULL,
			dept_id TEXT NOT NULL,
			PRIMARY KEY(user_id, dept_id),
			FOREIGN KEY(user_id) REFERENCES users(id),
			FOREIGN KEY(dept_id) REFERENCES depts(id)
		);`,
		`CREATE TABLE IF NOT EXISTS user_roles (
			user_id TEXT NOT NULL,
			role_id TEXT NOT NULL,
			PRIMARY KEY(user_id, role_id),
			FOREIGN KEY(user_id) REFERENCES users(id)
		);`,
	}

	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return err
		}
	}
	return nil
}
