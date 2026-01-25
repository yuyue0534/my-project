package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	_ "modernc.org/sqlite"
)

func main() {
	dbPath := getenv("DB_PATH", "./data.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := migrate(db); err != nil {
		log.Fatal(err)
	}
	if err := seedDemo(db); err != nil {
		log.Fatal(err)
	}

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})

	s := &Server{DB: db}

	r.Route("/api", func(api chi.Router) {
		// forms
		api.Get("/forms", s.ListForms)
		api.Get("/forms/{id}", s.GetForm)
		api.Post("/forms", s.SaveForm)
		api.Post("/forms/{id}/publish", s.PublishForm)

		// instances
		api.Post("/forms/{id}/instances", s.CreateInstanceDraft)
		api.Get("/instances/{id}", s.GetInstance)
		api.Put("/instances/{id}/data", s.UpdateInstanceData)
		api.Post("/instances/{id}/submit", s.SubmitInstance)
		api.Get("/instances", s.ListInstances)

		// tasks
		api.Get("/tasks/inbox", s.ListInboxTasks)
		api.Get("/tasks/done", s.ListDoneTasks)
		api.Get("/tasks/{id}", s.GetTaskDetail)
		api.Post("/tasks/{id}/act", s.ActOnTask)
	})

	log.Println("✅ backend on :3001 (sqlite:", dbPath, ")")
	log.Fatal(http.ListenAndServe(":3001", r))
}

func getenv(k, def string) string {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	return v
}
