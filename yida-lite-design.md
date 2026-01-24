# 宜搭 30% 版本 - 低代码表单平台技术设计

> **设计原则**：Schema First，配置即数据，运行态无状态

---

## 一、Schema 设计规范

### 1.1 五大 Schema 原则

| 原则 | 说明 | 实现约束 |
|------|------|----------|
| **字段 ID 永久不变** | 字段一旦创建，ID 永不修改 | `fieldId` 使用 UUID，禁止重命名 |
| **UI ≠ 数据** | 展示配置与数据结构分离 | `uiSchema` 与 `dataSchema` 独立存储 |
| **结构型字段** | 支持子表等嵌套结构 | `type: 'subTable'` 内含 `children` |
| **行为是声明式** | 规则不写代码，纯配置 | JSON 描述条件和动作 |
| **Schema 有版本** | 支持回溯和迁移 | `schemaVersion` 递增，存储历史 |

### 1.2 核心 Schema 结构

```typescript
// FormSchema - 表单定义
interface FormSchema {
  formId: string;                    // 表单唯一标识
  formName: string;                  // 表单名称
  schemaVersion: number;             // Schema 版本号
  
  fields: FieldSchema[];             // 字段列表
  rules: RuleSchema[];               // 规则列表
  
  // 预留位 - 暂不实现
  _reserved: {
    fieldPermissions?: Record<string, PermissionLevel>;  // 字段级权限
    workflow?: string;                                    // 流程引擎
    pageLayout?: PageLayoutSchema;                        // 页面布局
  };
}

// FieldSchema - 字段定义
interface FieldSchema {
  fieldId: string;                   // 永久 ID (UUID)
  fieldKey: string;                  // 业务键名
  fieldType: FieldType;              // 字段类型
  label: string;                     // 显示名称
  
  // 数据约束
  dataSchema: {
    required: boolean;
    defaultValue?: any;
    validation?: ValidationRule;
  };
  
  // UI 配置（分离存储）
  uiSchema: {
    placeholder?: string;
    helpText?: string;
    width?: 'full' | 'half' | 'third';
    visible?: boolean;               // 默认可见性
  };
  
  // 子表专用
  children?: FieldSchema[];          // 仅 subTable 类型有效
  
  // 计算字段专用
  computation?: ComputationConfig;   // 仅 computed 类型有效
}

// RuleSchema - 规则定义
interface RuleSchema {
  ruleId: string;
  ruleName: string;
  ruleType: 'visibility' | 'required' | 'setValue';
  
  // 单条件（严格限制）
  condition: {
    sourceField: string;             // 触发字段 ID
    operator: CompareOperator;
    value: any;
  };
  
  // 单目标（严格限制）
  action: {
    targetField: string;             // 作用字段 ID
    actionValue: any;                // visibility: boolean, required: boolean, setValue: any
  };
}
```

---

## 二、字段系统设计

### 2.1 字段注册表 (Field Registry)

```typescript
// 字段注册表 - 可扩展架构
class FieldRegistry {
  private registry: Map<FieldType, FieldDefinition> = new Map();
  
  // 注册字段类型
  register(definition: FieldDefinition): void {
    this.registry.set(definition.type, definition);
  }
  
  // 获取字段定义
  get(type: FieldType): FieldDefinition | undefined {
    return this.registry.get(type);
  }
  
  // 获取所有可用字段
  getAll(): FieldDefinition[] {
    return Array.from(this.registry.values());
  }
}

// 字段定义接口
interface FieldDefinition {
  type: FieldType;
  category: 'basic' | 'choice' | 'structure' | 'logic';
  label: string;
  icon: string;
  
  // Schema 生成
  createSchema(config: Partial<FieldSchema>): FieldSchema;
  
  // 数据验证
  validate(value: any, schema: FieldSchema): ValidationResult;
  
  // 渲染组件
  renderComponent: React.ComponentType<FieldRenderProps>;
  
  // 属性面板
  renderConfigPanel: React.ComponentType<FieldConfigProps>;
}
```

### 2.2 第一期字段类型

```typescript
enum FieldType {
  // 基础类型
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  
  // 选择类型
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  
  // 结构类型
  SUB_TABLE = 'subTable',
  
  // 逻辑类型
  COMPUTED = 'computed',
}

// 字段类型矩阵
const FIELD_TYPE_MATRIX = {
  basic: [
    { type: 'text',   label: '单行文本', icon: '📝' },
    { type: 'number', label: '数字',     icon: '🔢' },
    { type: 'date',   label: '日期',     icon: '📅' },
  ],
  choice: [
    { type: 'radio',    label: '单选', icon: '⭕' },
    { type: 'checkbox', label: '多选', icon: '☑️' },
  ],
  structure: [
    { type: 'subTable', label: '子表', icon: '📋' },
  ],
  logic: [
    { type: 'computed', label: '计算字段', icon: '🧮' },
  ],
};
```

### 2.3 字段 Schema 示例

```typescript
// 文本字段
const textFieldSchema: FieldSchema = {
  fieldId: 'f_uuid_001',
  fieldKey: 'employeeName',
  fieldType: 'text',
  label: '员工姓名',
  dataSchema: {
    required: true,
    validation: { maxLength: 50 }
  },
  uiSchema: {
    placeholder: '请输入姓名',
    width: 'half'
  }
};

// 子表字段
const subTableSchema: FieldSchema = {
  fieldId: 'f_uuid_002',
  fieldKey: 'orderItems',
  fieldType: 'subTable',
  label: '订单明细',
  dataSchema: { required: true },
  uiSchema: { width: 'full' },
  children: [
    {
      fieldId: 'f_uuid_003',
      fieldKey: 'productName',
      fieldType: 'text',
      label: '商品名称',
      dataSchema: { required: true },
      uiSchema: {}
    },
    {
      fieldId: 'f_uuid_004',
      fieldKey: 'quantity',
      fieldType: 'number',
      label: '数量',
      dataSchema: { required: true, validation: { min: 1 } },
      uiSchema: {}
    }
  ]
};

// 计算字段
const computedFieldSchema: FieldSchema = {
  fieldId: 'f_uuid_005',
  fieldKey: 'totalAmount',
  fieldType: 'computed',
  label: '订单总额',
  dataSchema: { required: false },
  uiSchema: { width: 'half' },
  computation: {
    function: 'SUM',
    sourceField: 'orderItems.amount',  // 子表.字段
    precision: 2
  }
};
```

---

## 三、子表设计约束（铁律）

### 3.1 约束清单

| 约束项 | 规则 | 校验时机 |
|--------|------|----------|
| **层级限制** | 只支持 1 层嵌套 | Schema 保存时 |
| **禁止嵌套** | 子表内不能再有子表 | 字段拖入时 |
| **禁止上引用** | 子表字段不能引用父表字段 | 规则配置时 |
| **计算范围** | 子表内计算仅限本行 | 计算配置时 |

### 3.2 Schema 验证器

```typescript
class SubTableValidator {
  
  validate(schema: FormSchema): ValidationResult {
    const errors: string[] = [];
    
    for (const field of schema.fields) {
      if (field.fieldType === 'subTable') {
        // 检查嵌套层级
        this.checkNesting(field, errors);
        
        // 检查子表内字段
        this.checkChildFields(field, errors);
      }
    }
    
    // 检查规则引用
    this.checkRuleReferences(schema, errors);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  private checkNesting(field: FieldSchema, errors: string[]): void {
    if (!field.children) return;
    
    for (const child of field.children) {
      if (child.fieldType === 'subTable') {
        errors.push(`子表「${field.label}」内不能包含子表字段`);
      }
    }
  }
  
  private checkChildFields(field: FieldSchema, errors: string[]): void {
    // 禁止子表内出现特定字段类型
    const forbidden = ['subTable'];
    
    for (const child of field.children || []) {
      if (forbidden.includes(child.fieldType)) {
        errors.push(`子表「${field.label}」内不支持「${child.fieldType}」类型`);
      }
    }
  }
  
  private checkRuleReferences(schema: FormSchema, errors: string[]): void {
    // 构建子表字段 ID 集合
    const subTableFieldIds = new Set<string>();
    const parentFieldIds = new Set<string>();
    
    for (const field of schema.fields) {
      if (field.fieldType === 'subTable') {
        for (const child of field.children || []) {
          subTableFieldIds.add(child.fieldId);
        }
      } else {
        parentFieldIds.add(field.fieldId);
      }
    }
    
    // 检查规则：子表字段不能引用父表字段
    for (const rule of schema.rules) {
      if (subTableFieldIds.has(rule.action.targetField) &&
          parentFieldIds.has(rule.condition.sourceField)) {
        errors.push(`规则「${rule.ruleName}」：子表字段不能被父表字段触发`);
      }
    }
  }
}
```

---

## 四、规则系统 (Rule Engine Lite)

### 4.1 设计目标

> **让业务能"动"，但不让配置失控**

### 4.2 支持的规则类型

```typescript
enum RuleType {
  VISIBILITY = 'visibility',   // 显隐规则
  REQUIRED = 'required',       // 必填规则
  SET_VALUE = 'setValue',      // 赋值规则
}

// 比较操作符
enum CompareOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  CONTAINS = 'contains',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
}
```

### 4.3 规则 Schema 示例

```typescript
// 显隐规则：当"员工类型"为"外包"时，隐藏"部门"字段
const visibilityRule: RuleSchema = {
  ruleId: 'r_001',
  ruleName: '外包员工隐藏部门',
  ruleType: 'visibility',
  condition: {
    sourceField: 'f_employeeType',
    operator: 'eq',
    value: 'outsource'
  },
  action: {
    targetField: 'f_department',
    actionValue: false  // false = 隐藏
  }
};

// 必填规则：当"金额">1000时，"审批意见"必填
const requiredRule: RuleSchema = {
  ruleId: 'r_002',
  ruleName: '大额需审批意见',
  ruleType: 'required',
  condition: {
    sourceField: 'f_amount',
    operator: 'gt',
    value: 1000
  },
  action: {
    targetField: 'f_approvalComment',
    actionValue: true  // true = 必填
  }
};

// 赋值规则：当"省份"选择"北京"时，"邮编"自动填入"100000"
const setValueRule: RuleSchema = {
  ruleId: 'r_003',
  ruleName: '北京自动填邮编',
  ruleType: 'setValue',
  condition: {
    sourceField: 'f_province',
    operator: 'eq',
    value: 'beijing'
  },
  action: {
    targetField: 'f_zipCode',
    actionValue: '100000'
  }
};
```

### 4.4 规则引擎实现

```typescript
class RuleEngineLite {
  
  // 规则评估入口
  evaluate(
    rules: RuleSchema[],
    formData: Record<string, any>,
    fieldStates: Map<string, FieldState>
  ): EvaluationResult {
    
    const result: EvaluationResult = {
      visibility: new Map<string, boolean>(),
      required: new Map<string, boolean>(),
      setValue: new Map<string, any>(),
    };
    
    for (const rule of rules) {
      const conditionMet = this.evaluateCondition(rule.condition, formData);
      
      if (conditionMet) {
        this.applyAction(rule, result);
      }
    }
    
    return result;
  }
  
  // 条件评估（单条件，无嵌套）
  private evaluateCondition(
    condition: RuleCondition,
    formData: Record<string, any>
  ): boolean {
    const sourceValue = this.getFieldValue(condition.sourceField, formData);
    
    switch (condition.operator) {
      case 'eq':
        return sourceValue === condition.value;
      case 'neq':
        return sourceValue !== condition.value;
      case 'gt':
        return Number(sourceValue) > Number(condition.value);
      case 'lt':
        return Number(sourceValue) < Number(condition.value);
      case 'contains':
        return String(sourceValue).includes(String(condition.value));
      case 'isEmpty':
        return sourceValue === null || sourceValue === undefined || sourceValue === '';
      case 'isNotEmpty':
        return sourceValue !== null && sourceValue !== undefined && sourceValue !== '';
      default:
        return false;
    }
  }
  
  // 应用动作
  private applyAction(rule: RuleSchema, result: EvaluationResult): void {
    switch (rule.ruleType) {
      case 'visibility':
        result.visibility.set(rule.action.targetField, rule.action.actionValue);
        break;
      case 'required':
        result.required.set(rule.action.targetField, rule.action.actionValue);
        break;
      case 'setValue':
        result.setValue.set(rule.action.targetField, rule.action.actionValue);
        break;
    }
  }
  
  // 获取字段值（支持子表路径）
  private getFieldValue(fieldPath: string, formData: Record<string, any>): any {
    const parts = fieldPath.split('.');
    let value = formData;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }
}

// 评估结果类型
interface EvaluationResult {
  visibility: Map<string, boolean>;
  required: Map<string, boolean>;
  setValue: Map<string, any>;
}
```

### 4.5 严格限制（红线）

```typescript
// 规则校验器 - 确保不越界
class RuleValidator {
  
  validate(rule: RuleSchema): ValidationResult {
    const errors: string[] = [];
    
    // ❌ 禁止：多条件
    if (Array.isArray(rule.condition)) {
      errors.push('不支持多条件组合，请拆分为多个规则');
    }
    
    // ❌ 禁止：嵌套条件
    if (rule.condition.and || rule.condition.or) {
      errors.push('不支持嵌套条件');
    }
    
    // ❌ 禁止：多目标
    if (Array.isArray(rule.action)) {
      errors.push('不支持多目标动作，请拆分为多个规则');
    }
    
    // ❌ 禁止：脚本表达式
    if (typeof rule.condition.value === 'string' && 
        rule.condition.value.includes('${')) {
      errors.push('不支持脚本表达式');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

---

## 五、计算字段系统

### 5.1 支持的计算函数

```typescript
enum ComputeFunction {
  SUM = 'SUM',       // 求和
  COUNT = 'COUNT',   // 计数
  AVG = 'AVG',       // 平均值
}

interface ComputationConfig {
  function: ComputeFunction;
  sourceField: string;        // 子表.字段 格式
  precision?: number;         // 小数精度
  
  // 预留位
  _reserved?: {
    filter?: FilterCondition;  // 条件过滤（暂不实现）
  };
}
```

### 5.2 计算引擎

```typescript
class ComputeEngine {
  
  calculate(
    config: ComputationConfig,
    formData: Record<string, any>
  ): number {
    const [tableName, fieldName] = config.sourceField.split('.');
    const tableData = formData[tableName] as Array<Record<string, any>>;
    
    if (!Array.isArray(tableData) || tableData.length === 0) {
      return 0;
    }
    
    const values = tableData
      .map(row => Number(row[fieldName]))
      .filter(v => !isNaN(v));
    
    let result: number;
    
    switch (config.function) {
      case 'SUM':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'COUNT':
        result = values.length;
        break;
      case 'AVG':
        result = values.length > 0 
          ? values.reduce((a, b) => a + b, 0) / values.length 
          : 0;
        break;
      default:
        result = 0;
    }
    
    // 精度处理
    if (config.precision !== undefined) {
      result = Number(result.toFixed(config.precision));
    }
    
    return result;
  }
}
```

---

## 六、运行态 (Runtime) 设计

### 6.1 渲染流程

```
┌─────────────┐
│   Schema    │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌───────────────┐
│  Compiler   │────▶│ Compiled Form │
└──────┬──────┘     └───────────────┘
       │
       ▼
┌─────────────┐
│  Renderer   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ Rule Engine │◀───▶│ Form State  │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│ UI Output   │
└─────────────┘
```

### 6.2 Schema 编译器

```typescript
class SchemaCompiler {
  
  compile(schema: FormSchema): CompiledForm {
    return {
      formId: schema.formId,
      version: schema.schemaVersion,
      
      // 字段映射（快速查找）
      fieldMap: this.buildFieldMap(schema.fields),
      
      // 规则索引（按触发字段分组）
      ruleIndex: this.buildRuleIndex(schema.rules),
      
      // 渲染树（已优化）
      renderTree: this.buildRenderTree(schema.fields),
      
      // 计算依赖图
      computeDeps: this.buildComputeDeps(schema.fields),
    };
  }
  
  private buildFieldMap(fields: FieldSchema[]): Map<string, FieldSchema> {
    const map = new Map<string, FieldSchema>();
    
    const traverse = (fieldList: FieldSchema[]) => {
      for (const field of fieldList) {
        map.set(field.fieldId, field);
        if (field.children) {
          traverse(field.children);
        }
      }
    };
    
    traverse(fields);
    return map;
  }
  
  private buildRuleIndex(rules: RuleSchema[]): Map<string, RuleSchema[]> {
    const index = new Map<string, RuleSchema[]>();
    
    for (const rule of rules) {
      const sourceField = rule.condition.sourceField;
      if (!index.has(sourceField)) {
        index.set(sourceField, []);
      }
      index.get(sourceField)!.push(rule);
    }
    
    return index;
  }
  
  private buildRenderTree(fields: FieldSchema[]): RenderNode[] {
    return fields.map(field => ({
      fieldId: field.fieldId,
      fieldType: field.fieldType,
      component: this.getComponentName(field.fieldType),
      props: this.extractRenderProps(field),
      children: field.children 
        ? this.buildRenderTree(field.children)
        : undefined,
    }));
  }
  
  private buildComputeDeps(fields: FieldSchema[]): Map<string, string[]> {
    const deps = new Map<string, string[]>();
    
    for (const field of fields) {
      if (field.fieldType === 'computed' && field.computation) {
        const [tableName, fieldName] = field.computation.sourceField.split('.');
        deps.set(field.fieldId, [`${tableName}.${fieldName}`]);
      }
    }
    
    return deps;
  }
  
  private getComponentName(fieldType: FieldType): string {
    const componentMap: Record<FieldType, string> = {
      text: 'TextInput',
      number: 'NumberInput',
      date: 'DatePicker',
      radio: 'RadioGroup',
      checkbox: 'CheckboxGroup',
      subTable: 'SubTable',
      computed: 'ComputedDisplay',
    };
    return componentMap[fieldType];
  }
  
  private extractRenderProps(field: FieldSchema): Record<string, any> {
    return {
      label: field.label,
      required: field.dataSchema.required,
      ...field.uiSchema,
    };
  }
}

interface CompiledForm {
  formId: string;
  version: number;
  fieldMap: Map<string, FieldSchema>;
  ruleIndex: Map<string, RuleSchema[]>;
  renderTree: RenderNode[];
  computeDeps: Map<string, string[]>;
}

interface RenderNode {
  fieldId: string;
  fieldType: FieldType;
  component: string;
  props: Record<string, any>;
  children?: RenderNode[];
}
```

### 6.3 渲染器实现

```typescript
// 组件映射器
class ComponentMapper {
  private componentRegistry: Map<string, React.ComponentType<any>> = new Map();
  
  register(name: string, component: React.ComponentType<any>): void {
    this.componentRegistry.set(name, component);
  }
  
  get(name: string): React.ComponentType<any> {
    const component = this.componentRegistry.get(name);
    if (!component) {
      throw new Error(`Component not found: ${name}`);
    }
    return component;
  }
}

// 表单渲染器
class FormRenderer {
  constructor(
    private componentMapper: ComponentMapper,
    private ruleEngine: RuleEngineLite,
    private computeEngine: ComputeEngine,
  ) {}
  
  render(compiledForm: CompiledForm, formData: Record<string, any>): React.ReactNode {
    // 1. 计算规则
    const ruleResult = this.ruleEngine.evaluate(
      Array.from(compiledForm.ruleIndex.values()).flat(),
      formData,
      new Map()
    );
    
    // 2. 计算计算字段
    const computedValues = this.computeAllFields(compiledForm, formData);
    
    // 3. 渲染节点树
    return this.renderTree(
      compiledForm.renderTree,
      formData,
      ruleResult,
      computedValues
    );
  }
  
  private renderTree(
    nodes: RenderNode[],
    formData: Record<string, any>,
    ruleResult: EvaluationResult,
    computedValues: Map<string, any>
  ): React.ReactNode[] {
    return nodes.map(node => {
      // 检查可见性
      const visible = ruleResult.visibility.get(node.fieldId) ?? true;
      if (!visible) return null;
      
      // 获取组件
      const Component = this.componentMapper.get(node.component);
      
      // 构建 props
      const props = {
        ...node.props,
        fieldId: node.fieldId,
        value: computedValues.has(node.fieldId)
          ? computedValues.get(node.fieldId)
          : formData[node.fieldId],
        required: ruleResult.required.get(node.fieldId) ?? node.props.required,
        onChange: (value: any) => this.handleChange(node.fieldId, value),
      };
      
      // 子表特殊处理
      if (node.children) {
        return (
          <Component key={node.fieldId} {...props}>
            {this.renderTree(node.children, formData, ruleResult, computedValues)}
          </Component>
        );
      }
      
      return <Component key={node.fieldId} {...props} />;
    });
  }
  
  private computeAllFields(
    compiledForm: CompiledForm,
    formData: Record<string, any>
  ): Map<string, any> {
    const results = new Map<string, any>();
    
    for (const [fieldId] of compiledForm.computeDeps) {
      const field = compiledForm.fieldMap.get(fieldId);
      if (field?.computation) {
        results.set(fieldId, this.computeEngine.calculate(field.computation, formData));
      }
    }
    
    return results;
  }
  
  private handleChange(fieldId: string, value: any): void {
    // 由外部状态管理处理
  }
}
```

### 6.4 Runtime 三条铁律

```typescript
// 铁律检查器
class RuntimeGuard {
  
  // 铁律 1：不写业务 if
  ensureNoBusinessLogic(code: string): void {
    const forbidden = [
      /if\s*\(\s*formData\./,
      /switch\s*\(\s*formData\./,
      /formData\.\w+\s*===?\s*/,
    ];
    
    for (const pattern of forbidden) {
      if (pattern.test(code)) {
        throw new Error('Runtime 禁止包含业务条件判断');
      }
    }
  }
  
  // 铁律 2：所有行为来自 Schema
  ensureSchemaDriven(behavior: any): void {
    if (!behavior.ruleId && !behavior.fieldId) {
      throw new Error('所有行为必须可追溯到 Schema 定义');
    }
  }
  
  // 铁律 3：同一 Schema 多处复用
  ensureStateless(component: React.ComponentType<any>): void {
    // 检查组件是否是纯函数
    // 实际实现需要静态分析
  }
}
```

---

## 七、数据层设计

### 7.1 数据模型

```typescript
// 表单实例
interface Form {
  formId: string;
  formName: string;
  schema: FormSchema;
  schemaVersion: number;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 数据记录
interface Record {
  recordId: string;
  formId: string;
  
  // 数据内容
  data: Record<string, any>;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// Schema 版本历史
interface SchemaVersion {
  versionId: string;
  formId: string;
  version: number;
  schema: FormSchema;
  createdAt: Date;
  comment?: string;
}
```

### 7.2 存储接口

```typescript
interface SchemaStore {
  // Schema 操作
  saveSchema(formId: string, schema: FormSchema): Promise<void>;
  getSchema(formId: string): Promise<FormSchema | null>;
  getSchemaVersion(formId: string, version: number): Promise<FormSchema | null>;
  listSchemaVersions(formId: string): Promise<SchemaVersion[]>;
}

interface RecordStore {
  // 记录操作
  create(formId: string, data: Record<string, any>): Promise<string>;
  update(recordId: string, data: Record<string, any>): Promise<void>;
  delete(recordId: string): Promise<void>;
  get(recordId: string): Promise<Record | null>;
  
  // 列表查询（简单）
  list(formId: string, options: ListOptions): Promise<PaginatedResult>;
  
  // 导出/导入
  export(formId: string, format: 'json' | 'csv'): Promise<Blob>;
  import(formId: string, file: File): Promise<ImportResult>;
}

interface ListOptions {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  // 📌 不支持复杂查询和跨表 join
}
```

---

## 八、权限模型

### 8.1 第一阶段权限

```typescript
// 角色
enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

// 表单权限
interface FormPermission {
  formId: string;
  role: Role;
  permission: 'view' | 'edit';
}

// 权限检查器
class PermissionChecker {
  
  canView(userId: string, formId: string): boolean {
    const role = this.getUserRole(userId);
    return role === 'admin' || this.hasPermission(formId, role, 'view');
  }
  
  canEdit(userId: string, formId: string): boolean {
    const role = this.getUserRole(userId);
    return role === 'admin' || this.hasPermission(formId, role, 'edit');
  }
  
  private getUserRole(userId: string): Role {
    // 实现略
    return 'user';
  }
  
  private hasPermission(formId: string, role: Role, permission: string): boolean {
    // 实现略
    return false;
  }
}

// Schema 预留位（暂不实现）
interface FieldSchema {
  // ... 其他字段
  _reserved: {
    permissions?: {
      view?: Role[];
      edit?: Role[];
    };
  };
}
```

---

## 九、设计态 (Builder) 架构

### 9.1 模块结构

```
Builder（设计态）
├── FieldPanel        // 字段面板（拖拽源）
├── Canvas            // 画布（Schema 可视化）
├── PropertyPanel     // 属性面板（Schema 编辑）
├── RuleEditor        // 规则编辑器
└── PreviewPanel      // 预览面板
```

### 9.2 核心组件设计

```typescript
// 字段面板 - 拖拽源
const FieldPanel: React.FC = () => {
  return (
    <div className="field-panel">
      {Object.entries(FIELD_TYPE_MATRIX).map(([category, fields]) => (
        <div key={category} className="field-category">
          <h3>{categoryLabels[category]}</h3>
          {fields.map(field => (
            <DraggableField
              key={field.type}
              type={field.type}
              label={field.label}
              icon={field.icon}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// 画布 - Schema 树可视化
const Canvas: React.FC<{
  schema: FormSchema;
  onSchemaChange: (schema: FormSchema) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
}> = ({ schema, onSchemaChange, selectedFieldId, onSelectField }) => {
  
  const handleDrop = (fieldType: FieldType, position: DropPosition) => {
    const newField = FieldRegistry.get(fieldType)!.createSchema({
      fieldId: generateUUID(),
      fieldKey: generateFieldKey(fieldType),
    });
    
    const updatedFields = insertFieldAt(schema.fields, newField, position);
    onSchemaChange({ ...schema, fields: updatedFields });
  };
  
  return (
    <DropZone onDrop={handleDrop}>
      <div className="canvas">
        {schema.fields.map(field => (
          <FieldNode
            key={field.fieldId}
            field={field}
            selected={field.fieldId === selectedFieldId}
            onClick={() => onSelectField(field.fieldId)}
          />
        ))}
      </div>
    </DropZone>
  );
};

// 属性面板 - Schema 编辑器
const PropertyPanel: React.FC<{
  field: FieldSchema | null;
  onChange: (field: FieldSchema) => void;
}> = ({ field, onChange }) => {
  if (!field) {
    return <EmptyState message="选择字段进行配置" />;
  }
  
  const ConfigPanel = FieldRegistry.get(field.fieldType)!.renderConfigPanel;
  
  return (
    <div className="property-panel">
      <ConfigPanel field={field} onChange={onChange} />
    </div>
  );
};

// 规则编辑器 - 模板化配置
const RuleEditor: React.FC<{
  rules: RuleSchema[];
  fields: FieldSchema[];
  onChange: (rules: RuleSchema[]) => void;
}> = ({ rules, fields, onChange }) => {
  
  const addRule = (template: RuleTemplate) => {
    const newRule: RuleSchema = {
      ruleId: generateUUID(),
      ruleName: template.defaultName,
      ruleType: template.type,
      condition: {
        sourceField: '',
        operator: template.defaultOperator,
        value: '',
      },
      action: {
        targetField: '',
        actionValue: template.defaultActionValue,
      },
    };
    onChange([...rules, newRule]);
  };
  
  return (
    <div className="rule-editor">
      <RuleTemplateSelector onSelect={addRule} />
      
      {rules.map(rule => (
        <RuleCard
          key={rule.ruleId}
          rule={rule}
          fields={fields}
          onChange={updated => {
            onChange(rules.map(r => r.ruleId === updated.ruleId ? updated : r));
          }}
          onDelete={() => {
            onChange(rules.filter(r => r.ruleId !== rule.ruleId));
          }}
        />
      ))}
    </div>
  );
};
```

### 9.3 体验原则

```typescript
// 设计原则检查清单
const DESIGN_PRINCIPLES = {
  // ✅ 像飞书一样简单
  simple: [
    '字段拖拽添加',
    '点击选中配置',
    '所见即所得',
  ],
  
  // ✅ 比飞书强
  powerful: [
    '规则模板化',
    '子表可视化编辑',
    '实时预览',
  ],
  
  // ❌ 不暴露 Schema
  hidden: [
    '不显示 JSON',
    '不暴露字段 ID',
    '不允许代码编辑',
  ],
};
```

---

## 十、整体架构图

```
┌────────────────────────────────────────────────────────────────┐
│                     Low-Code Core (30%)                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Schema Layer                          │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │  │
│  │  │  FormSchema  │ │ FieldSchema  │ │  RuleSchema  │      │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│              ┌───────────────┴───────────────┐                 │
│              ▼                               ▼                 │
│  ┌─────────────────────┐       ┌─────────────────────┐        │
│  │   Builder (设计态)   │       │   Runtime (运行态)   │        │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │        │
│  │  │ Form Designer │  │       │  │   Renderer    │  │        │
│  │  └───────────────┘  │       │  └───────────────┘  │        │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │        │
│  │  │  Rule Editor  │  │       │  │  Rule Engine  │  │        │
│  │  └───────────────┘  │       │  │    Lite       │  │        │
│  │  ┌───────────────┐  │       │  └───────────────┘  │        │
│  │  │   Previewer   │  │       │  ┌───────────────┐  │        │
│  │  └───────────────┘  │       │  │  Data Engine  │  │        │
│  └─────────────────────┘       │  └───────────────┘  │        │
│                                └─────────────────────┘        │
│                              │                                 │
│              ┌───────────────┴───────────────┐                 │
│              ▼                               ▼                 │
│  ┌─────────────────────┐       ┌─────────────────────┐        │
│  │    Schema Store     │       │    Record Store     │        │
│  └─────────────────────┘       └─────────────────────┘        │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                    Storage Layer (DB/Files)                    │
└────────────────────────────────────────────────────────────────┘
```

---

## 十一、迭代路线图

### Phase 1: MVP (4 周)

| 周次 | 目标 | 产出 |
|------|------|------|
| W1 | Schema 层 | FormSchema、FieldSchema 类型定义 |
| W2 | 字段系统 | 4 种基础字段 + 注册表 |
| W3 | Builder 基础 | 拖拽 + 属性面板 |
| W4 | Runtime 基础 | 渲染器 + 数据绑定 |

### Phase 2: 核心能力 (4 周)

| 周次 | 目标 | 产出 |
|------|------|------|
| W5 | 子表 | 子表渲染 + 编辑 |
| W6 | 规则引擎 | 3 种规则类型 |
| W7 | 计算字段 | SUM/COUNT/AVG |
| W8 | 数据层 | CRUD + 列表 |

### Phase 3: 完善 (4 周)

| 周次 | 目标 | 产出 |
|------|------|------|
| W9 | 权限 | 表级权限 |
| W10 | 导入导出 | JSON/CSV |
| W11 | 版本管理 | Schema 历史 |
| W12 | 优化 | 性能 + 体验 |

---

## 十二、不做清单（红线）

| 功能 | 原因 | 替代方案 |
|------|------|----------|
| 流程引擎 | 复杂度高 | 第二阶段集成 |
| 页面引擎 | 超出范围 | 使用模板 |
| 多层嵌套 | 复杂度高 | 子表 1 层 |
| 复杂计算 | 易失控 | 3 个函数 |
| 脚本编写 | 维护难 | 声明式规则 |
| 字段权限 | MVP 不需要 | 预留 Schema 位 |
| 跨表 join | 性能风险 | 不支持 |

---

## 附录 A：Schema 完整示例

```json
{
  "formId": "form_001",
  "formName": "采购申请单",
  "schemaVersion": 1,
  
  "fields": [
    {
      "fieldId": "f_001",
      "fieldKey": "applicant",
      "fieldType": "text",
      "label": "申请人",
      "dataSchema": { "required": true },
      "uiSchema": { "width": "half" }
    },
    {
      "fieldId": "f_002",
      "fieldKey": "department",
      "fieldType": "radio",
      "label": "部门",
      "dataSchema": {
        "required": true,
        "options": [
          { "value": "tech", "label": "技术部" },
          { "value": "hr", "label": "人事部" },
          { "value": "finance", "label": "财务部" }
        ]
      },
      "uiSchema": { "width": "half" }
    },
    {
      "fieldId": "f_003",
      "fieldKey": "items",
      "fieldType": "subTable",
      "label": "采购明细",
      "dataSchema": { "required": true },
      "uiSchema": { "width": "full" },
      "children": [
        {
          "fieldId": "f_003_1",
          "fieldKey": "itemName",
          "fieldType": "text",
          "label": "物品名称",
          "dataSchema": { "required": true },
          "uiSchema": {}
        },
        {
          "fieldId": "f_003_2",
          "fieldKey": "quantity",
          "fieldType": "number",
          "label": "数量",
          "dataSchema": { "required": true, "validation": { "min": 1 } },
          "uiSchema": {}
        },
        {
          "fieldId": "f_003_3",
          "fieldKey": "unitPrice",
          "fieldType": "number",
          "label": "单价",
          "dataSchema": { "required": true, "validation": { "min": 0 } },
          "uiSchema": {}
        }
      ]
    },
    {
      "fieldId": "f_004",
      "fieldKey": "totalAmount",
      "fieldType": "computed",
      "label": "总金额",
      "dataSchema": { "required": false },
      "uiSchema": { "width": "half" },
      "computation": {
        "function": "SUM",
        "sourceField": "items.unitPrice",
        "precision": 2
      }
    }
  ],
  
  "rules": [
    {
      "ruleId": "r_001",
      "ruleName": "大额需说明",
      "ruleType": "required",
      "condition": {
        "sourceField": "f_004",
        "operator": "gt",
        "value": 10000
      },
      "action": {
        "targetField": "f_005",
        "actionValue": true
      }
    }
  ],
  
  "_reserved": {
    "fieldPermissions": {},
    "workflow": null,
    "pageLayout": null
  }
}
```

---

## 附录 B：技术栈建议

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | React 18 | 生态成熟 |
| 状态管理 | Zustand | 轻量简单 |
| 拖拽 | dnd-kit | 现代 API |
| 样式 | Tailwind CSS | 高效开发 |
| 后端框架 | Node.js + Fastify | 高性能 |
| 数据库 | PostgreSQL | Schema 灵活 |
| ORM | Prisma | 类型安全 |

---

**文档版本**: v1.0  
**最后更新**: 2026-01-24  
**作者**: 低代码架构组
