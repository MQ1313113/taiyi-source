import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Plus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ticketApi } from "@/services/api";
import ExternalPortalQr from "@/components/ExternalPortalQr";
import TicketCreateDialog from "@/components/tickets/TicketCreateDialog";
import { useRole } from "@/contexts/RoleContext";

const SOURCES = [
  { v: "SALES", l: "销售" }, { v: "SUPPORT", l: "售后" }, { v: "CUSTOMER", l: "客户" },
  { v: "PRODUCT", l: "产品" }, { v: "INTERNAL", l: "内部" }, { v: "EXTERNAL", l: "外部提交" },
];
const CATEGORIES = [
  { v: "BUG", l: "缺陷" }, { v: "REQUIREMENT", l: "需求" }, { v: "AFTERSALES", l: "售后" }, { v: "OTHER", l: "其他" },
];
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
        <div className="flex items-center gap-2">
          {canTriage && <ExternalPortalQr />}
          {hasPermission("ticket:create") && (
            <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
              <Plus className="w-4 h-4 mr-1" /> 提交工单
            </Button>
          )}
        </div>
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

      <TicketCreateDialog open={showCreate} onOpenChange={setShowCreate} onCreated={fetch} />
    </div>
  );
}
