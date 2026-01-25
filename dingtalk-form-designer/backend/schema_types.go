package main

type FormSchema struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Version     int       `json:"version"`
	Fields      []Field   `json:"fields"`
	Workflow    Workflow  `json:"workflow"`
	Calculations []Calc   `json:"calculations,omitempty"`
}

type Field struct {
	ID        string   `json:"id"`
	Type      string   `json:"type"`
	Label     string   `json:"label"`
	Required  bool     `json:"required,omitempty"`
	Readonly  bool     `json:"readonly,omitempty"`
	VisibleWhen any    `json:"visibleWhen,omitempty"`
	Options   []string `json:"options,omitempty"`
	Columns   []Field  `json:"columns,omitempty"` // subtable
	MaxRows   int      `json:"maxRows,omitempty"`
}

type Calc struct {
	TargetFieldId string `json:"targetFieldId"`
	Expr          string `json:"expr"`
}

type Workflow struct {
	Nodes    []Node                `json:"nodes"`
	Edges    []Edge                `json:"edges,omitempty"`
	Policies map[string]NodePolicy `json:"policies"`
}

type Node struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Edge struct {
	From      string     `json:"from"`
	To        string     `json:"to"`
	On        string     `json:"on"`               // submit|approve|reject|return
	Mode      string     `json:"mode"`             // AND|OR (default OR)
	Assignees []Assignee `json:"assignees,omitempty"`
	Condition any        `json:"condition,omitempty"` // json-logic subset
}

type Assignee struct {
	Type string `json:"type"` // user|role|dept|applicant
	ID   string `json:"id"`
}

type NodePolicy struct {
	Visible  []string `json:"visible"`
	Editable []string `json:"editable"`
	Required []string `json:"required"`
}
