import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Plus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { ticketApi, projectApi } from "@/services/api";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const SOURCES = [
  { v: "SALES", l: "销售" }, { v: "SUPPORT", l: "售后" }, { v: "CUSTOMER", l: "客户" },
  { v: "PRODUCT", l: "产品" }, { v: "INTERNAL", l: "内部" },
];
const CATEGORIES = [
  { v: "BUG", l: "缺陷" }, { v: "REQUIREMENT", l: "需求" }, { v: "AFTERSALES", l: "售后" }, { v: "OTHER", l: "其他" },
];
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING_TRIAGE: { label: "待分诊", color: "#f59e0b" },
  DISPATCHED: { label: "已派单", color: "#0088ff" },
  PROCESSING: { label: "处理中", color: "#8b5cf6" },
  RESOLVED: { label: "已解决", color: "#10b981" },
  CLOSED: { label: "已关闭", color: "#6b7280" },
};
const labelOf = (arr: { v: string; l: string }[], v: string) => arr.find(x => x.v === v)?.l || v;

export default function TicketList() {
  const [, setLocation] = useLocation();
  const { hasPermission } = useRole();
  const canTriage = hasPermission("ticket:triage");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "mine" | "pending">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ source: "INTERNAL", category: "OTHER", title: "", description: "", priority: "P2", projectId: "" });

  const fetch = () => {
    setLoading(true);
    const params: any = { page: 1, size: 50 };
    if (tab === "mine") params.mine = true;
    if (tab === "pending") params.status = "PENDING_TRIAGE";
    ticketApi.list(params).then((res: any) => {
      setTickets(res.data?.records || res.data || []);
    }).catch(() => setTickets([])).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [tab]);
  useEffect(() => {
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  const submit = () => {
    if (!form.title.trim()) { toast.error("请填写标题"); return; }
    ticketApi.create({
      source: form.source, category: form.category, title: form.title,
      description: form.description, priority: form.priority,
      projectId: form.projectId ? Number(form.projectId) : undefined,
    }).then(() => {
      toast.success("工单已提交");
      setShowCreate(false);
      setForm({ source: "INTERNAL", category: "OTHER", title: "", description: "", priority: "P2", projectId: "" });
      fetch();
    }).catch((e: any) => toast.error(e?.message || "提交失败"));
  };

  const tabs: { k: typeof tab; l: string }[] = [
    { k: "all", l: "全部" }, { k: "mine", l: "我负责的" },
    ...(canTriage ? [{ k: "pending" as const, l: "待分诊" }] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#0088ff]" /> 工单管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">统一问题入口：销售/售后/客户/内部的问题从这里进来，自动派单或分诊转派</p>
        </div>
        {hasPermission("ticket:create") && (
          <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 提交工单
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === t.k ? "border-[#0088ff] text-[#0088ff] font-medium" : "border-transparent text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">加载中...</p>
      ) : tickets.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          暂无工单
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t, i) => {
            const st = statusConfig[t.status] || statusConfig.PENDING_TRIAGE;
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                onClick={() => setLocation(`/app/tickets/${t.id}`)}
                className="bg-white rounded-xl border border-border/60 p-4 hover:shadow-md cursor-pointer transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{t.ticketCode}</span>
                    <span className="font-medium truncate">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{labelOf(SOURCES, t.source)}</Badge>
                    <Badge variant="outline" className="text-[10px]">{labelOf(CATEGORIES, t.category)}</Badge>
                    <Badge className="text-[10px]">{t.priority}</Badge>
                    <Badge style={{ backgroundColor: `${st.color}15`, color: st.color }} className="text-[10px]">{st.label}</Badge>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>提交工单</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">来源</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">类型</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">优先级</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
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
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={submit} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">提交</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
