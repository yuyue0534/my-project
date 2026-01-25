package main

import (
	"encoding/json"
	"errors"
)

type JLContext struct {
	Form map[string]any
}

func EvalJsonLogic(expr any, ctx JLContext) (bool, error) {
	if expr == nil {
		return true, nil
	}
	m, ok := expr.(map[string]any)
	if !ok {
		return false, errors.New("condition must be object")
	}
	for op, raw := range m {
		args, _ := raw.([]any)
		switch op {
		case "==":
			a, _ := evalValue(args[0], ctx)
			b, _ := evalValue(args[1], ctx)
			return equal(a, b), nil
		case "!=":
			a, _ := evalValue(args[0], ctx)
			b, _ := evalValue(args[1], ctx)
			return !equal(a, b), nil
		case ">", "<", ">=", "<=":
			a, _ := evalValue(args[0], ctx)
			b, _ := evalValue(args[1], ctx)
			af := toFloat(a)
			bf := toFloat(b)
			switch op {
			case ">":
				return af > bf, nil
			case "<":
				return af < bf, nil
			case ">=":
				return af >= bf, nil
			case "<=":
				return af <= bf, nil
			}
		case "and":
			for _, it := range args {
				ok, err := EvalJsonLogic(it, ctx)
				if err != nil {
					return false, err
				}
				if !ok {
					return false, nil
				}
			}
			return true, nil
		case "or":
			for _, it := range args {
				ok, err := EvalJsonLogic(it, ctx)
				if err != nil {
					return false, err
				}
				if ok {
					return true, nil
				}
			}
			return false, nil
		default:
			return false, errors.New("unsupported op: " + op)
		}
	}
	return true, nil
}

func evalValue(v any, ctx JLContext) (any, error) {
	if m, ok := v.(map[string]any); ok {
		if vv, ok2 := m["var"]; ok2 {
			path, _ := vv.(string)
			if len(path) >= 5 && path[:5] == "form." {
				key := path[5:]
				return ctx.Form[key], nil
			}
			if path == "form" {
				return ctx.Form, nil
			}
			return nil, nil
		}
		b, err := EvalJsonLogic(m, ctx)
		if err != nil {
			return nil, err
		}
		return b, nil
	}
	return v, nil
}

func toFloat(v any) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case json.Number:
		f, _ := t.Float64()
		return f
	case string:
		var n json.Number = json.Number(t)
		f, _ := n.Float64()
		return f
	default:
		return 0
	}
}

func equal(a, b any) bool {
	// numeric-ish compare first when possible
	af := toFloat(a)
	bf := toFloat(b)
	if (af != 0) || (bf != 0) {
		return af == bf
	}
	return stringify(a) == stringify(b)
}

func stringify(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	bs, _ := json.Marshal(v)
	return string(bs)
}
