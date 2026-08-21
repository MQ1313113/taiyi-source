import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

/**
 * 结构化步骤列表输入：逐条"第 N 步"填写,支持增删与上下移动。
 * 序列化/反序列化工具随组件导出,存储仍是纯文本("1. xxx\n2. xxx"),
 * 兼容既有 text 字段与所有展示处。
 */

/** 步骤数组 → 编号文本 */
export function serializeSteps(steps: string[]): string {
  return steps.filter(s => s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`).join("\n");
}

/** 编号文本 → 步骤数组(识别 "1. xxx" / "1、xxx" / "1) xxx" 行;不合格式返回 null 表示应落回自由文本) */
export function parseSteps(text?: string): string[] | null {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const re = /^\d+[.、)]\s*(.+)$/;
  const parsed: string[] = [];
  for (const line of lines) {
    const m = line.match(re);
    if (!m) return null;
    parsed.push(m[1]);
  }
  return parsed;
}

interface StepListInputProps {
  value: string[];
  onChange: (steps: string[]) => void;
  placeholder?: string;
  /** 每步最少字数(仅用于占位提示,校验在提交处做) */
  minLen?: number;
}

export default function StepListInput({ value, onChange, placeholder = "描述这一步做了什么" }: StepListInputProps) {
  const steps = value.length > 0 ? value : [""];

  const update = (i: number, v: string) => {
    const next = [...steps]; next[i] = v; onChange(next);
  };
  const add = () => onChange([...steps, ""]);
  const remove = (i: number) => onChange(steps.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };

  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs text-muted-foreground text-right">第 {i + 1} 步</span>
          <Input className="rounded-xl h-9 flex-1" value={s} placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)} />
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" tabIndex={-1}
            disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-3.5 h-3.5" /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" tabIndex={-1}
            disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-3.5 h-3.5" /></Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" tabIndex={-1}
            disabled={steps.length <= 1} onClick={() => remove(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1" />添加一步
      </Button>
    </div>
  );
}

// ===================== 验收标准(AC) Given/When/Then 条目输入 =====================

export interface GwtItem { given: string; when: string; then: string; }

/** AC 条目 → 文本(每条一行 "Given … When … Then …",与后端三段式校验兼容) */
export function serializeGwt(items: GwtItem[]): string {
  return items
    .filter(it => it.given.trim() && it.when.trim() && it.then.trim())
    .map(it => `Given ${it.given.trim()} When ${it.when.trim()} Then ${it.then.trim()}`)
    .join("\n");
}

interface GwtListInputProps {
  value: GwtItem[];
  onChange: (items: GwtItem[]) => void;
}

/** 每条 AC 由 Given(前置)/When(操作)/Then(预期) 三个输入组成,强制结构化 */
export function GwtListInput({ value, onChange }: GwtListInputProps) {
  const items = value.length > 0 ? value : [{ given: "", when: "", then: "" }];

  const update = (i: number, k: keyof GwtItem, v: string) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [k]: v } : it);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="p-3 rounded-xl border border-border/60 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">AC {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" tabIndex={-1}
              disabled={items.length <= 1} onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-right text-[#0088ff] font-medium">Given</span>
            <Input className="rounded-xl h-9 flex-1" value={it.given} placeholder="前置条件,如:用户已登录"
              onChange={(e) => update(i, "given", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-right text-[#f59e0b] font-medium">When</span>
            <Input className="rounded-xl h-9 flex-1" value={it.when} placeholder="触发操作,如:点击导出按钮"
              onChange={(e) => update(i, "when", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-right text-[#10b981] font-medium">Then</span>
            <Input className="rounded-xl h-9 flex-1" value={it.then} placeholder="预期结果,如:下载Excel文件"
              onChange={(e) => update(i, "then", e.target.value)} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="rounded-xl h-8 text-xs"
        onClick={() => onChange([...items, { given: "", when: "", then: "" }])}>
        <Plus className="w-3.5 h-3.5 mr-1" />添加一条 AC
      </Button>
    </div>
  );
}
