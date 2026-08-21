import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Ticket, Inbox, Wrench, CheckCircle2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ticketApi } from "@/services/api";
import MyTodoPanel from "@/components/MyTodoPanel";
import ExternalPortalQr from "@/components/ExternalPortalQr";
import TicketCreateDialog from "@/components/tickets/TicketCreateDialog";
import { useDashboardAutoRefresh } from "@/hooks/useDashboardAutoRefresh";

/**
 * 售后工程师工作台:统计概览 + 我的待办(待办即工作队列,分诊/处理都在待办上就地完成)。
 */
export default function SupportDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState({ pending: 0, mine: 0, resolved: 0 });
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      ticketApi.list({ pageNum: 1, pageSize: 1, status: "PENDING_TRIAGE" }).catch(() => null),
      ticketApi.list({ pageNum: 1, pageSize: 50, mine: true }).catch(() => null),
    ]).then(([pend, mine]: any[]) => {
      const mineRecs = mine?.data?.records || mine?.data || [];
      setStats({
        pending: pend?.data?.total ?? 0,
        mine: mineRecs.filter((t: any) => t.status === "DISPATCHED" || t.status === "PROCESSING").length,
        resolved: mineRecs.filter((t: any) => t.status === "RESOLVED" || t.status === "CLOSED").length,
      });
    });
  }, []);
  useEffect(() => { load(); }, [load]);
  useDashboardAutoRefresh(load);

  const cards = [
    { label: "待分诊工单", value: stats.pending, icon: Inbox, color: "#f59e0b" },
    { label: "我处理中的", value: stats.mine, icon: Wrench, color: "#0088ff" },
    { label: "我已解决的", value: stats.resolved, icon: CheckCircle2, color: "#10b981" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">售后工作台</h2>
          <p className="text-sm text-muted-foreground mt-1">外部问题的第一入口 · 确认、归类、分诊,让每个问题有着落</p>
        </div>
        <div className="flex items-center gap-2">
          <ExternalPortalQr />
          <Button variant="outline" onClick={() => setLocation("/app/tickets")} className="rounded-lg">
            <Ticket className="w-4 h-4 mr-1" /> 工单管理
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">
            <Plus className="w-4 h-4 mr-1" /> 提交工单
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            onClick={() => setLocation("/app/tickets")}
            className="bg-white rounded-xl border border-border/60 p-5 cursor-pointer hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: c.color }}>{c.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}15` }}>
                <c.icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 待办即工作队列:分诊单带"分诊"按钮弹窗就地处理,处理中的单点击直达详情 */}
      <MyTodoPanel />

      <TicketCreateDialog open={showCreate} onOpenChange={setShowCreate} onCreated={load} />
    </div>
  );
}
