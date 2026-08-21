import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/**
 * 通用分步表单向导:步骤指示 + 上一步/下一步 + 最后一步提交。
 * 每步可提供 validate 回调,返回错误文案(阻止前进)或 null(放行)。
 */
export interface WizardStep {
  title: string;
  content: ReactNode;
  /** 校验当前步,返回错误消息则阻止进入下一步 */
  validate?: () => string | null;
}

interface StepFormWizardProps {
  steps: WizardStep[];
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  onError?: (msg: string) => void;
}

export default function StepFormWizard({ steps, onSubmit, submitting, submitLabel = "提交", onError }: StepFormWizardProps) {
  const [cur, setCur] = useState(0);
  const isLast = cur === steps.length - 1;

  const next = () => {
    const err = steps[cur].validate?.();
    if (err) { onError?.(err); return; }
    if (!isLast) setCur(cur + 1);
  };
  const submit = () => {
    const err = steps[cur].validate?.();
    if (err) { onError?.(err); return; }
    onSubmit();
  };

  return (
    <div className="space-y-4">
      {/* 步骤指示器 */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button type="button"
              onClick={() => { if (i < cur) setCur(i); }}
              className={`flex items-center gap-1.5 text-xs whitespace-nowrap ${i < cur ? "cursor-pointer" : "cursor-default"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium
                ${i < cur ? "bg-[#10b981] text-white" : i === cur ? "bg-[#0088ff] text-white" : "bg-muted text-muted-foreground"}`}>
                {i < cur ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className={i === cur ? "font-medium text-foreground" : "text-muted-foreground"}>{s.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`h-px flex-1 mx-2 ${i < cur ? "bg-[#10b981]" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* 当前步内容 */}
      <div className="min-h-[180px]">{steps[cur].content}</div>

      {/* 导航 */}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" className="rounded-xl" disabled={cur === 0}
          onClick={() => setCur(cur - 1)}>
          <ChevronLeft className="w-4 h-4 mr-1" />上一步
        </Button>
        {isLast ? (
          <Button type="button" className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white"
            disabled={submitting} onClick={submit}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{submitLabel}
          </Button>
        ) : (
          <Button type="button" className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white" onClick={next}>
            下一步<ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
