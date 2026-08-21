import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { FileText, TrendingUp, Clock, CheckCircle2, BarChart3, Layers, Plus, ArrowRight, AlertTriangle, Eye, GitBranch } from "lucide-react";
import { requirementApi, userApi, projectApi } from "@/services/api";
import MyTodoPanel from "@/components/MyTodoPanel";
import { useDashboardAutoRefresh } from "@/hooks/useDashboardAutoRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChangeRequestDialog } from "@/components/dialogs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RequirementForm from "@/components/forms/RequirementForm";

export default function ProductManagerDashboard() {
  const { info } = useRole();
  const [, setLocation] = useLocation();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  // 项目筛选：跨项目混计的需求统计无意义
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>("");

  // Dialog states
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [createReqOpen, setCreateReqOpen] = useState(false);

  const loadRequirements = () => {
    requirementApi.list({ pageNum: 1, pageSize: 200, projectId: projectId ? Number(projectId) : undefined })
      .then((res: any) => {
        const data = res.data?.records || res.data || [];
        setRequirements(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRequirements(); }, [projectId]);
  // 自动刷新：定时轮询 + 收到通知立即刷新
  useDashboardAutoRefresh(loadRequirements);

  useEffect(() => {
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      const list = res?.data?.records || res?.data || [];
      setProjects(Array.isArray(list) ? list : []);
    }).catch(() => setProjects([]));
    // 加载用户映射表，用于将需求 ownerId 转为中文姓名（FE-WS-01）
    userApi.listWithRoles().then((res: any) => {
      const map: Record<string, string> = {};
      (res.data || []).forEach((u: any) => { map[String(u.id)] = u.nickname || u.username; });
      setUserMap(map);
    }).catch(() => {});
  }, []);

  // 计算统计数据
  const totalReqs = requirements.length;
  const draftCount = requirements.filter(r => r.status === "DRAFT").length;
  const reviewingCount = requirements.filter(r => r.status === "REVIEWING").length;
  const developingCount = requirements.filter(r => r.status === "DEVELOPING").length;
  const closedCount = requirements.filter(r => r.status === "CLOSED").length;

  const stats = [
    { label: "需求池总量", value: totalReqs || 0, icon: FileText, color: "#0088ff", bg: "bg-blue-50", href: "/app/requirements" },
    { label: "待评审", value: reviewingCount + draftCount, icon: Clock, color: "#f59e0b", bg: "bg-amber-50", href: "/app/requirements" },
    { label: "开发中", value: developingCount, icon: TrendingUp, color: "#8b5cf6", bg: "bg-purple-50", href: "/app/requirements" },
    { label: "已关闭", value: closedCount, icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50", href: "/app/requirements" },
  ];

  const statusConfig: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "草稿", color: "#6b7280" },
    REVIEWING: { label: "评审中", color: "#f59e0b" },
    DEVELOPING: { label: "开发中", color: "#0088ff" },
    DEVELOPED: { label: "待提测", color: "#06b6d4" },
    TESTING: { label: "测试中", color: "#8b5cf6" },
    TESTED: { label: "待上线", color: "#10b981" },
    RELEASING: { label: "发布中", color: "#ec4899" },
    CLOSED: { label: "已关闭", color: "#6b7280" },
    CANCELLED: { label: "已取消", color: "#dc2626" },
  };

  const priorityConfig: Record<string, { label: string; color: string }> = {
    P0: { label: "P0", color: "#dc2626" },
    P1: { label: "P1", color: "#ea580c" },
    P2: { label: "P2", color: "#d97706" },
    P3: { label: "P3", color: "#6b7280" },
  };

  const reqByStatus = Object.entries(statusConfig)
    .map(([key, cfg]) => ({
      status: cfg.label,
      count: requirements.filter(r => r.status === key).length,
      color: cfg.color,
    }))
    .filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      {/* Dialogs */}
      <ChangeRequestDialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen} />
      <Dialog open={createReqOpen} onOpenChange={setCreateReqOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>创建需求</DialogTitle>
            <DialogDescription>填写需求信息，字段按当前档位分级必填</DialogDescription>
          </DialogHeader>
          <RequirementForm
            showBanner={true}
            embedded={true}
            onSuccess={() => { setCreateReqOpen(false); loadRequirements(); }}
            onCancel={() => setCreateReqOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">今天也是高效的一天</h2>
          <p className="text-sm text-muted-foreground mt-1">万物归一，秩序自生 · 让每一次交付都值得信赖</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={projectId || "all"} onValueChange={(v) => setProjectId(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-40 text-xs rounded-xl"><SelectValue placeholder="全部项目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.projectName || p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="h-8 text-xs rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white"
            onClick={() => setCreateReqOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />新建需求
          </Button>
          <Button
            variant="outline" className="h-8 text-xs rounded-xl"
            onClick={() => setChangeRequestOpen(true)}
          >
            <GitBranch className="w-3.5 h-3.5 mr-1.5" />发起变更
          </Button>
          <Link href="/app/sprints">
            <Button variant="outline" className="h-8 text-xs rounded-xl">
              <Clock className="w-3.5 h-3.5 mr-1.5" />迭代规划
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-xl border border-border/60 p-5 hover:shadow-md hover:shadow-[#0088ff]/5 transition-all duration-300 cursor-pointer group"
            onClick={() => setLocation(stat.href)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 我的待办行动区：可在工作台直接一键处理（按后端授权动作渲染） */}
      <MyTodoPanel />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Review Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              待处理需求
            </h3>
            <Link href="/app/requirements">
              <Button variant="ghost" size="sm" className="text-xs text-[#0088ff]">
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {requirements.filter(r => r.status !== "CLOSED" && r.status !== "CANCELLED").slice(0, 6).map((req: any) => (
              <div
                key={req.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 hover:border-[#0088ff]/20 transition-all cursor-pointer group"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusConfig[req.status]?.color || "#6b7280" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{req.requirementName || req.title || "未命名需求"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {userMap[String(req.ownerId)] || req.ownerName || "未指派"} · {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}
                  </p>
                </div>
                {req.priority && (
                  <Badge variant="outline" className="text-[10px] flex-shrink-0" style={{
                    borderColor: priorityConfig[req.priority]?.color,
                    color: priorityConfig[req.priority]?.color
                  }}>
                    {priorityConfig[req.priority]?.label || req.priority}
                  </Badge>
                )}
                <Badge className="text-[10px] flex-shrink-0" style={{
                  backgroundColor: `${statusConfig[req.status]?.color}15`,
                  color: statusConfig[req.status]?.color
                }}>
                  {statusConfig[req.status]?.label || req.status}
                </Badge>
              </div>
            ))}
            {requirements.filter(r => r.status !== "CLOSED" && r.status !== "CANCELLED").length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">暂无待处理需求</div>
            )}
          </div>
        </motion.div>

        {/* Right Panel - Status Distribution */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-border/60 p-5"
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0088ff]" />
              需求状态分布
            </h3>
            <div className="space-y-2.5">
              {reqByStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs flex-1">{item.status}</span>
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.count}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${totalReqs > 0 ? (item.count / totalReqs) * 100 : 0}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl border border-border/60 p-5"
          >
            <h3 className="text-sm font-semibold mb-3">快捷入口</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-9 text-xs justify-start" onClick={() => setCreateReqOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> 新建需求
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs justify-start" onClick={() => setChangeRequestOpen(true)}>
                <GitBranch className="w-3 h-3 mr-1" /> 发起变更
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs justify-start" onClick={() => setLocation("/app/sprints")}>
                <Layers className="w-3 h-3 mr-1" /> 迭代管理
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
