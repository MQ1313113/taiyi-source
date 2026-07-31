import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Code2, Bug, CheckCircle2, Clock, AlertTriangle, ArrowRight, GitCommit } from "lucide-react";
import { taskApi, bugApi } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogHoursDialog, CreateDebtDialog } from "@/components/dialogs";
import MyTodoPanel from "@/components/MyTodoPanel";

export default function DeveloperDashboard() {
  const { info } = useRole();
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [bugs, setBugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [logHoursOpen, setLogHoursOpen] = useState(false);
  const [createDebtOpen, setCreateDebtOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      taskApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
      bugApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
    ]).then(([taskRes, bugRes]) => {
      setTasks(taskRes.data?.records || taskRes.data || []);
      setBugs(bugRes.data?.records || bugRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const myTodoTasks = tasks.filter(t => t.status === "TODO" || t.status === "IN_PROGRESS");
  const myFixBugs = bugs.filter(b => b.status === "CONFIRMED" || b.status === "IN_PROGRESS");
  const completedTasks = tasks.filter(t => t.status === "DONE" || t.status === "CLOSED");

  const stats = [
    { label: "待处理任务", value: myTodoTasks.length, icon: Code2, color: "#0088ff", bg: "bg-blue-50", href: "/app/tasks" },
    { label: "待修复Bug", value: myFixBugs.length, icon: Bug, color: "#ef4444", bg: "bg-red-50", href: "/app/bugs" },
    { label: "已完成", value: completedTasks.length, icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50", href: "/app/tasks" },
    { label: "逾期预警", value: 0, icon: AlertTriangle, color: "#f59e0b", bg: "bg-amber-50", href: "/app/tasks" },
  ];

  const statusConfig: Record<string, { label: string; color: string }> = {
    TODO: { label: "待开发", color: "#6b7280" },
    IN_PROGRESS: { label: "开发中", color: "#0088ff" },
    SELF_TESTING: { label: "自测中", color: "#f59e0b" },
    TESTING: { label: "测试中", color: "#8b5cf6" },
    DONE: { label: "已完成", color: "#10b981" },
    CLOSED: { label: "已关闭", color: "#6b7280" },
  };

  const bugStatusConfig: Record<string, { label: string; color: string }> = {
    OPEN: { label: "新建", color: "#6b7280" },
    CONFIRMED: { label: "已确认", color: "#f59e0b" },
    IN_PROGRESS: { label: "修复中", color: "#0088ff" },
    FIXED: { label: "已修复", color: "#10b981" },
    VERIFIED: { label: "验证中", color: "#8b5cf6" },
    CLOSED: { label: "已关闭", color: "#6b7280" },
  };

  return (
    <div className="space-y-6">
      {/* Dialogs */}
      <LogHoursDialog open={logHoursOpen} onOpenChange={setLogHoursOpen} />
      <CreateDebtDialog open={createDebtOpen} onOpenChange={setCreateDebtOpen} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">今天也是高效的一天</h2>
          <p className="text-sm text-muted-foreground mt-1">万物归一，秩序自生 · 让每一次交付都值得信赖</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" className="h-8 text-xs rounded-xl"
            onClick={() => setLogHoursOpen(true)}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />填写工时
          </Button>
          <Button
            className="h-8 text-xs rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white"
            onClick={() => setCreateDebtOpen(true)}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />记录技术债
          </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks - Click to open log hours dialog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#0088ff]" />
              我的任务
            </h3>
            <Link href="/app/tasks">
              <Button variant="ghost" size="sm" className="text-xs text-[#0088ff]">
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status !== "CLOSED").slice(0, 5).map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-all cursor-pointer group"
                onClick={() => setLogHoursOpen(true)}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig[task.status]?.color || "#6b7280" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.taskName || task.title || "未命名任务"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {task.planEndDate ? `截止 ${task.planEndDate}` : "未设定截止日期"}
                  </p>
                </div>
                <Badge className="text-[10px]" style={{
                  backgroundColor: `${statusConfig[task.status]?.color}15`,
                  color: statusConfig[task.status]?.color
                }}>
                  {statusConfig[task.status]?.label || task.status}
                </Badge>
                <Clock className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {tasks.filter(t => t.status !== "CLOSED").length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">暂无待处理任务</div>
            )}
          </div>
        </motion.div>

        {/* My Bugs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bug className="w-4 h-4 text-red-500" />
              待修复Bug
            </h3>
            <Link href="/app/bugs">
              <Button variant="ghost" size="sm" className="text-xs text-[#0088ff]">
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {bugs.filter(b => b.status !== "CLOSED" && b.status !== "VERIFIED").slice(0, 5).map((bug: any) => (
              <div
                key={bug.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bug.title || "未命名Bug"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bug.severity || "MAJOR"}</p>
                </div>
                <Badge className="text-[10px]" style={{
                  backgroundColor: `${bugStatusConfig[bug.status]?.color}15`,
                  color: bugStatusConfig[bug.status]?.color
                }}>
                  {bugStatusConfig[bug.status]?.label || bug.status}
                </Badge>
              </div>
            ))}
            {bugs.filter(b => b.status !== "CLOSED" && b.status !== "VERIFIED").length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">暂无待修复Bug</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
