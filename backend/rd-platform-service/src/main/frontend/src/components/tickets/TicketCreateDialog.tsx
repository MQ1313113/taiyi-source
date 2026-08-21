import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ticketApi, projectApi } from "@/services/api";
import PrioritySelectItems from "@/components/PrioritySelectItems";
import { toast } from "sonner";

export const TICKET_SOURCES = [
  { v: "SALES", l: "销售" }, { v: "SUPPORT", l: "售后" }, { v: "CUSTOMER", l: "客户" },
  { v: "PRODUCT", l: "产品" }, { v: "INTERNAL", l: "内部" },
];
export const TICKET_CATEGORIES = [
  { v: "BUG", l: "缺陷" }, { v: "REQUIREMENT", l: "需求" }, { v: "AFTERSALES", l: "售后" }, { v: "OTHER", l: "其他" },
];
const EMPTY = { source: "INTERNAL", category: "OTHER", title: "", description: "", priority: "P2", projectId: "" };

/** 内部工单创建弹窗(登录用户)。工单列表页与售后工作台共用。 */
export default function TicketCreateDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}) {
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);

  useEffect(() => {
    if (!open) return;
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, [open]);

  const submit = () => {
    if (!form.title.trim()) { toast.error("请填写标题"); return; }
    ticketApi.create({
      source: form.source, category: form.category, title: form.title,
      description: form.description, priority: form.priority,
      projectId: form.projectId ? Number(form.projectId) : undefined,
    }).then(() => {
      toast.success("工单已提交");
      onOpenChange(false);
      setForm(EMPTY);
      onCreated?.();
    }).catch((e: any) => toast.error(e?.message || "提交失败"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>提交工单</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">来源</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_SOURCES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">类型</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_CATEGORIES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">优先级</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><PrioritySelectItems showSla /></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">标题 <span className="text-red-500">*</span></Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="一句话说清问题" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">描述</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="补充背景、复现、影响等" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">关联项目（可选，分诊时也可补）</Label>
            <Select value={form.projectId ? String(form.projectId) : "none"} onValueChange={(v) => setForm({ ...form, projectId: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="不指定" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不指定</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.projectName || p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
