import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";

/**
 * 优先级选项统一定义:全站口径一致(需求/任务/工单共用)。
 * desc 帮助非专业用户判断该选哪档;sla 仅工单场景展示(与后端 slaHours 对应)。
 */
export const PRIORITY_OPTIONS = [
  { v: "P0", label: "P0 · 紧急", color: "#dc2626", desc: "系统不可用或核心流程中断,须立即处理", sla: "SLA 4小时" },
  { v: "P1", label: "P1 · 高", color: "#ea580c", desc: "主要功能受影响,应优先安排", sla: "SLA 24小时" },
  { v: "P2", label: "P2 · 中", color: "#2563eb", desc: "常规问题,按正常节奏排期", sla: "SLA 3天" },
  { v: "P3", label: "P3 · 低", color: "#6b7280", desc: "轻微问题或优化建议,空闲时处理", sla: "SLA 7天" },
];

/**
 * 带描述的优先级下拉选项组,放在 <SelectContent> 内使用。
 * 描述必须放在 ItemText 之外:Radix 会把 ItemText 的内容回显到触发框,
 * 选中后触发框只显示"P0 · 紧急",下拉展开时才显示完整说明。
 */
export default function PrioritySelectItems({ showSla }: { showSla?: boolean }) {
  return (
    <>
      {PRIORITY_OPTIONS.map((o) => (
        <SelectPrimitive.Item
          key={o.v}
          value={o.v}
          className="relative flex w-full cursor-default select-none flex-col items-start rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        >
          <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center">
            <SelectPrimitive.ItemIndicator>
              <Check className="h-4 w-4" />
            </SelectPrimitive.ItemIndicator>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
            <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
          </span>
          <span className="text-[11px] leading-4 text-muted-foreground">
            {o.desc}
            {showSla ? ` · ${o.sla}` : ""}
          </span>
        </SelectPrimitive.Item>
      ))}
    </>
  );
}
