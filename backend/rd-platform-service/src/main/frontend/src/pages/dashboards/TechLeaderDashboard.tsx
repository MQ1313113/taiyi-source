import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Users, GitBranch, Bug, BarChart3, AlertTriangle, CheckCircle2, Code2, Play, ArrowRight, Clock, Scissors, UserPlus, TestTube2 } from "lucide-react";
import { taskApi, bugApi, requirementApi } from "@/services/api";
import MyTodoPanel from "@/components/MyTodoPanel";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SplitTaskDialog, AssignTaskDialog, SubmitTestDialog } from "@/components/dialogs";

export default function TechLeaderDashboard() {
  const { info } = useRole();
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [bugs, setBugs] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitConfig, setSplitConfig] = useState({ reqId: "", reqTitle: "" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignConfig, setAssignConfig] = useState({ taskId: "", taskTitle: "" });
  const [submitTestOpen, setSubmitTestOpen] = useState(false);

  const loadData = () => {
    Promise.all([
      taskApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
      bugApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
      requirementApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
    ]).then(([taskRes, bugRes, reqRes]) => {
      setTasks(taskRes.data?.records || taskRes.data || []);
      setBugs(bugRes.data?.records || bugRes.data || []);
      setRequirements(reqRes.data?.records || reqRes.data || []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const inProgressTasks = tasks.filter(t => t.status === "IN_PROGRESS" || t.status === "TODO");
  const openBugs = bugs.filter(b => b.status === "OPEN" || b.status === "CONFIRMED" || b.status === "IN_PROGRESS");
  const pendingReqs = requirements.filter(r => r.status === "REVIEWING" || r.status === "DEVELOPED");

  const stats = [
    { label: "进行中任务", value: inProgressTasks.length, icon: Code2, color: "#0088ff", bg: "bg-blue-50", href: "/app/tasks" },
    { label: "待确认Bug", value: openBugs.length, icon: Bug, color: "#ef4444", bg: "bg-red-50", href: "/app/bugs" },
    { label: "待审批", value: pendingReqs.length, icon: Clock, color: "#f59e0b", bg: "bg-amber-50", href: "/app/requirements" },
    { label: "总任务数", value: tasks.length, icon: BarChart3, color: "#10b981", bg: "bg-emerald-50", href: "/app/tasks" },
  ];

  const statusConfig: Record<string, { label: string; color: string }> = {
    TODO: { label: "待开发", color: "#6b7280" },
    IN_PROGRESS: { label: "开发中", color: "#0088ff" },
    TESTING: { label: "测试中", color: "#8b5cf6" },
    DONE: { label: "已完成", color: "#10b981" },
    CLOSED: { label: "已关闭", color: "#6b7280" },
  };

  const handleSplitTask = (req: any) => {
    setSplitConfig({ reqId: req.id?.toString() || "", reqTitle: req.requirementName || req.title || "" });
    setSplitOpen(true);
  };

  const handleAssignTask = (task: any) => {
    setAssignConfig({ taskId: task.id?.toString() || "", taskTitle: task.taskName || task.title || "" });
    setAssignOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Dialogs */}
      <SplitTaskDialog open={splitOpen} onOpenChange={(o) => { setSplitOpen(o); if (!o) loadData(); }} {...splitConfig} />
      <AssignTaskDialog open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (!o) loadData(); }} {...assignConfig} />
      <SubmitTestDialog open={submitTestOpen} onOpenChange={(o) => { setSubmitTestOpen(o); if (!o) loadData(); }} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">今天也是高效的一天</h2>
          <p className="text-sm text-muted-foreground mt-1">万物归一，秩序自生 · 让每一次交付都值得信赖</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-8 text-xs rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white"
            onClick={() => { setSplitConfig({ reqId: "", reqTitle: "" }); setSplitOpen(true); }}
          >
            <Scissors className="w-3.5 h-3.5 mr-1.5" />拆解任务
          </Button>
          <Button
            variant="outline" className="h-8 text-xs rounded-xl"
            onClick={() => { setAssignConfig({ taskId: "", taskTitle: "" }); setAssignOpen(true); }}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />分派任务
          </Button>
          <Button
            variant="outline" className="h-8 text-xs rounded-xl"
            onClick={() => setSubmitTestOpen(true)}
          >
            <TestTube2 className="w-3.5 h-3.5 mr-1.5" />发起提测
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
        {/* Task Queue - Actionable */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#0088ff]" />
              待处理任务
            </h3>
            <Link href="/app/tasks">
              <Button variant="ghost" size="sm" className="text-xs text-[#0088ff]">
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {inProgressTasks.slice(0, 5).map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-all cursor-pointer group"
                onClick={() => handleAssignTask(task)}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig[task.status]?.color || "#6b7280" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.taskName || task.title || "未命名任务"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.assigneeName || "未指派"}</p>
                </div>
                <Badge className="text-[10px]" style={{
                  backgroundColor: `${statusConfig[task.status]?.color}15`,
                  color: statusConfig[task.status]?.color
                }}>
                  {statusConfig[task.status]?.label || task.status}
                </Badge>
                <UserPlus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {inProgressTasks.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">暂无待处理任务</div>
            )}
          </div>
        </motion.div>

        {/* Bug Queue - Actionable */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bug className="w-4 h-4 text-red-500" />
              待确认Bug
            </h3>
            <Link href="/app/bugs">
              <Button variant="ghost" size="sm" className="text-xs text-[#0088ff]">
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {openBugs.slice(0, 5).map((bug: any) => (
              <div
                key={bug.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-all cursor-pointer"
                onClick={() => {
                  if (bug.status === 'OPEN') {
                    bugApi.changeStatus(bug.id, 'CONFIRMED').then(() => {
                      toast.success('已确认Bug', { description: bug.title });
                      setBugs(prev => prev.map(b => b.id === bug.id ? { ...b, status: 'CONFIRMED' } : b));
                    }).catch(() => toast.error('确认失败'));
                  } else {
                    setLocation('/app/bugs');
                  }
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bug.title || "未命名Bug"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bug.reporterName || "未知"} 提交</p>
                </div>
                {bug.status === 'OPEN' && (
                  <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 border-red-200 text-red-600 hover:bg-red-50">
                    确认
                  </Button>
                )}
                <Badge variant="outline" className="text-[10px] border-red-200 text-red-600">
                  {bug.severity || "MAJOR"}
                </Badge>
              </div>
            ))}
            {openBugs.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">暂无待确认Bug</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
