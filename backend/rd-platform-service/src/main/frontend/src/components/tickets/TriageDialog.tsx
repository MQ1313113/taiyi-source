import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ticketApi, userApi, projectApi } from "@/services/api";
import { TICKET_CATEGORIES } from "./TicketCreateDialog";
import PrioritySelectItems from "@/components/PrioritySelectItems";
import { toast } from "sonner";

/**
 * 分诊弹窗:在工作台/列表就地完成分诊,无需进详情页。
 * 外部匿名单(source=EXTERNAL 且待分诊)强制先确认优先级与问题分类,与后端校验一致。
 */
export default function TriageDialog({ ticket, open, onOpenChange, onDone }: {
  ticket: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ projectId: "", assigneeId: "", convertTo: "none", priority: "", category: "" });

  useEffect(() => {
    if (!open) return;
    setForm({ projectId: "", assigneeId: "", convertTo: "none", priority: "", category: "" });
    userApi.listWithRoles().then((res: any) => setUsers(res.data || [])).catch(() => {});
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => setProjects(res.data?.records || res.data || [])).catch(() => {});
  }, [open]);

  if (!ticket) return null;
  const isExternalPending = ticket.source === "EXTERNAL" && ticket.status === "PENDING_TRIAGE";

  const submit = () => {
    if (isExternalPending && (!form.priority || !form.category)) {
      toast.error("外部工单必须先确认优先级与问题分类");
      return;
    }
    if (!form.assigneeId && form.convertTo === "none") {
      toast.error("请至少指派责任人");
      return;
    }
    const payload: any = {};
    if (form.projectId) payload.projectId = Number(form.projectId);
    if (form.assigneeId) payload.assigneeId = Number(form.assigneeId);
    if (form.convertTo !== "none") payload.convertTo = form.convertTo;
    if (form.priority) payload.priority = form.priority;
    if (form.category) payload.category = form.category;
    ticketApi.triage(ticket.id, payload).then(() => {
      toast.success("分诊完成");
      onOpenChange(false);
      onDone?.();
    }).catch((e: any) => toast.error(e?.message || "分诊失败"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>分诊工单 · {ticket.ticketCode}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/40 rounded-lg text-sm">
            <p className="font-medium">{ticket.title}</p>
            {ticket.source === "EXTERNAL" && (
              <p className="text-xs text-amber-600 mt-1">外部提交 · 联系方式:{ticket.contactInfo || "未留"}</p>
            )}
            {ticket.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{ticket.description}</p>}
          </div>
          {isExternalPending && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs">确认优先级 <span className="text-red-500">*</span></Label>
                <Select value={form.priority || "unset"} onValueChange={(v) => setForm({ ...form, priority: v === "unset" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="请确认" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">请确认</SelectItem>
                    <PrioritySelectItems showSla />
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">问题分类 <span className="text-red-500">*</span></Label>
                <Select value={form.category || "unset"} onValueChange={(v) => setForm({ ...form, category: v === "unset" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="请归类" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">请归类</SelectItem>
                    {TICKET_CATEGORIES.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">指派责任人 <span className="text-red-500">*</span></Label>
              <Select value={form.assigneeId ? String(form.assigneeId) : "unset"} onValueChange={(v) => setForm({ ...form, assigneeId: v === "unset" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">请选择</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.nickname || u.username}（{u.roleCode}）</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">指定项目</Label>
              <Select value={form.projectId ? String(form.projectId) : "keep"} onValueChange={(v) => setForm({ ...form, projectId: v === "keep" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="保持不变" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保持不变</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.projectName || p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">转换为</Label>
            <Select value={form.convertTo} onValueChange={(v) => setForm({ ...form, convertTo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">仅指派（不转换）</SelectItem>
                <SelectItem value="REQUIREMENT">转为需求</SelectItem>
                <SelectItem value="BUG">转为缺陷</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">转换为需求/缺陷前需先指定项目;转换后在目标上回填来源工单以便追溯。</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">确认分诊</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
