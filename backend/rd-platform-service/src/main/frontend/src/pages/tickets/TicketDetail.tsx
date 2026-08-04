import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Ticket, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useRoute } from "wouter";
import { ticketApi, userApi, projectApi } from "@/services/api";
import FlowPath from "@/components/FlowPath";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING_TRIAGE: { label: "待分诊", color: "#f59e0b" },
  DISPATCHED: { label: "已派单", color: "#0088ff" },
  PROCESSING: { label: "处理中", color: "#8b5cf6" },
  RESOLVED: { label: "已解决", color: "#10b981" },
  CLOSED: { label: "已关闭", color: "#6b7280" },
};
// 状态机可推进项（与后端一致）
const nextActions: Record<string, { to: string; label: string }[]> = {
  DISPATCHED: [{ to: "PROCESSING", label: "开始处理" }, { to: "RESOLVED", label: "标记解决" }],
  PROCESSING: [{ to: "RESOLVED", label: "标记解决" }],
  RESOLVED: [{ to: "CLOSED", label: "关闭工单" }, { to: "PROCESSING", label: "重新处理" }],
};
const CONVERT_LABEL: Record<string, string> = { REQUIREMENT: "需求", BUG: "缺陷", TASK: "任务" };

export default function TicketDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/tickets/:id");
  const ticketId = parseInt(params?.id || "0");
  const { hasPermission } = useRole();
  const canTriage = hasPermission("ticket:triage");

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<number, string>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tForm, setTForm] = useState<any>({ projectId: "", assigneeId: "", convertTo: "none" });

  const load = () => {
    setLoading(true);
    ticketApi.detail(ticketId).then((res: any) => setTicket(res.data)).catch(() => setTicket(null)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [ticketId]);
  useEffect(() => {
    userApi.listWithRoles().then((res: any) => {
      const list = res.data || [];
      setUsers(list);
      const m: Record<number, string> = {};
      list.forEach((u: any) => { m[u.id] = u.nickname || u.username; });
      setNames(m);
    }).catch(() => {});
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => setProjects(res.data?.records || res.data || [])).catch(() => {});
  }, []);

  const nameOf = (id: number) => names[id] || (id ? `用户#${id}` : "-");

  const doTriage = () => {
    const payload: any = {};
    if (tForm.projectId) payload.projectId = Number(tForm.projectId);
    if (tForm.assigneeId) payload.assigneeId = Number(tForm.assigneeId);
    if (tForm.convertTo !== "none") payload.convertTo = tForm.convertTo;
    ticketApi.triage(ticketId, payload).then(() => { toast.success("分诊完成"); load(); })
      .catch((e: any) => toast.error(e?.message || "分诊失败"));
  };

  const advance = (to: string) => {
    ticketApi.changeStatus(ticketId, { status: to }).then(() => { toast.success("状态已更新"); load(); })
      .catch((e: any) => toast.error(e?.message || "操作失败"));
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;
  if (!ticket) return <div className="p-6 text-center text-muted-foreground">工单不存在或无权访问</div>;

  const st = statusConfig[ticket.status] || statusConfig.PENDING_TRIAGE;
  const actions = nextActions[ticket.status] || [];
  const convertTargetPath = ticket.convertedType === "REQUIREMENT" ? `/app/requirements/${ticket.convertedId}`
    : ticket.convertedType === "BUG" ? `/app/bugs/${ticket.convertedId}`
    : ticket.convertedType === "TASK" ? `/app/tasks/${ticket.convertedId}` : null;

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/app/tickets")} className="text-sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回工单列表
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-border/60 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#0088ff]" /> {ticket.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {ticket.ticketCode} · 提报人 {nameOf(ticket.reporterId)} · 责任人 {nameOf(ticket.assigneeId)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{ticket.priority}</Badge>
            <Badge style={{ backgroundColor: `${st.color}15`, color: st.color }}>{st.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
          <div><span className="text-muted-foreground text-xs">来源</span><br />{ticket.source}</div>
          <div><span className="text-muted-foreground text-xs">类型</span><br />{ticket.category}</div>
          <div><span className="text-muted-foreground text-xs">项目</span><br />{ticket.projectId || "未指定"}</div>
        </div>
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">描述</h3>
          <pre className="text-sm whitespace-pre-wrap font-sans">{ticket.description || "-"}</pre>
        </div>

        {convertTargetPath && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            已转为{CONVERT_LABEL[ticket.convertedType]}：
            <button className="text-[#0088ff] hover:underline" onClick={() => setLocation(convertTargetPath)}>
              #{ticket.convertedId}
            </button>
          </div>
        )}
      </motion.div>

      {/* 状态推进（责任人/分诊人） */}
      {actions.length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 p-6 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">推进：</span>
          {actions.map(a => (
            <Button key={a.to} size="sm" variant="outline" onClick={() => advance(a.to)}>{a.label}</Button>
          ))}
        </div>
      )}

      {/* 分诊面板（仅分诊人，未解决/关闭时可分诊） */}
      {canTriage && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-amber-200 p-6">
          <h3 className="text-sm font-semibold mb-4">分诊 / 转派</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">指定项目</Label>
              <Select value={tForm.projectId ? String(tForm.projectId) : "keep"} onValueChange={(v) => setTForm({ ...tForm, projectId: v === "keep" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="保持不变" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保持不变</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.projectName || p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">指派责任人</Label>
              <Select value={tForm.assigneeId ? String(tForm.assigneeId) : "keep"} onValueChange={(v) => setTForm({ ...tForm, assigneeId: v === "keep" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="保持不变" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保持不变</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.nickname || u.username}（{u.roleCode}）</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">转换为</Label>
              <Select value={tForm.convertTo} onValueChange={(v) => setTForm({ ...tForm, convertTo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">仅指派（不转换）</SelectItem>
                  <SelectItem value="REQUIREMENT">转为需求</SelectItem>
                  <SelectItem value="BUG">转为缺陷</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">转换为需求/缺陷前需先指定项目；转换后会在目标上回填来源工单以便追溯。</p>
          <Button onClick={doTriage} className="mt-4 bg-[#0088ff] hover:bg-[#0066cc] text-white">确认分诊</Button>
        </motion.div>
      )}

      <FlowPath entityType="TICKET" entityId={ticketId} />
    </div>
  );
}
