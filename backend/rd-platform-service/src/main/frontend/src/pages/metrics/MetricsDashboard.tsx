import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target, Zap, Bug, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { metricsApi, projectApi, sprintApi, userApi } from "@/services/api";
import { useRole } from "@/contexts/RoleContext";
import { ShieldAlert } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  sys_admin: "系统管理员",
  pm: "产品经理",
  
  dev: "开发",
  qa: "测试",
};

interface ProjectOption {
  id: number;
  name: string;
}

interface OverviewData {
  requirementTotal: number;
  requirementClosed: number;
  requirementCompletionRate: number;
  taskTotal: number;
  taskDone: number;
  taskCompletionRate: number;
  bugTotal: number;
  bugClosed: number;
  bugCritical: number;
  bugFixRate: number;
}

interface WorkloadRow {
  userId: number;
  name: string;
  role: string;
  totalTasks: number;
  doneTasks: number;
  estimatedHours: number;
  actualHours: number;
}

interface BurndownData {
  sprintName: string;
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
}

export default function MetricsDashboard() {
  const { role } = useRole();
  const allowed = role === "pm" || role === "sys_admin";

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [workload, setWorkload] = useState<WorkloadRow[]>([]);
  const [burndown, setBurndown] = useState<BurndownData | null>(null);

  // Load project list once
  useEffect(() => {
    if (!allowed) return;
    projectApi.list().then((res: any) => {
      const raw = res.data?.records ?? res.data ?? [];
      const list: ProjectOption[] = raw.map((p: any) => ({ id: p.id, name: p.projectName || p.name || `项目#${p.id}` }));
      setProjects(list);
      if (list.length > 0) {
        setProjectId(String(list[0].id));
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [allowed]);

  // Load metrics when project changes
  useEffect(() => {
    if (!allowed) return;
    if (!projectId) return;
    const pid = Number(projectId);
    setLoading(true);

    Promise.all([
      metricsApi.getVelocity(pid),
      metricsApi.getTeamWorkload({ projectId: pid }),
      userApi.listWithRoles(),
      sprintApi.list({ projectId: pid }),
    ]).then(async ([ov, wl, users, sprints]: any[]) => {
      // Overview
      setOverview(ov.data as OverviewData);

      // Build user map
      const userMap: Record<number, { name: string; role: string }> = {};
      const usersRaw = users.data?.records ?? users.data ?? [];
      usersRaw.forEach((u: any) => {
        userMap[u.id] = {
          name: u.nickname || u.username || `用户${u.id}`,
          role: u.roleCode || u.role || "",
        };
      });

      // Workload -> attach names
      const wlRaw = wl.data?.records ?? wl.data ?? [];
      const rows: WorkloadRow[] = wlRaw.map((w: any) => {
        const info = userMap[w.userId] || { name: `用户${w.userId}`, role: "" };
        return {
          userId: w.userId,
          name: info.name,
          role: info.role,
          totalTasks: w.totalTasks || 0,
          doneTasks: w.doneTasks || 0,
          estimatedHours: Number(w.estimatedHours || 0),
          actualHours: Number(w.actualHours || 0),
        };
      }).sort((a: WorkloadRow, b: WorkloadRow) => b.doneTasks - a.doneTasks);
      setWorkload(rows);

      // Burndown for the latest sprint of this project
      const sprintList = sprints.data?.records ?? sprints.data ?? [];
      if (sprintList.length > 0) {
        // prefer ACTIVE/PLANNING sprint, else the first
        const active = sprintList.find((s: any) => s.status === "ACTIVE")
          || sprintList.find((s: any) => s.status === "PLANNING")
          || sprintList[0];
        try {
          const bd: any = await metricsApi.getBurndown(active.id);
          setBurndown({
            sprintName: active.sprintName || active.name || `迭代#${active.id}`,
            totalTasks: bd.data.totalTasks || 0,
            completedTasks: bd.data.completedTasks || 0,
            remainingTasks: bd.data.remainingTasks || 0,
          });
        } catch {
          setBurndown(null);
        }
      } else {
        setBurndown(null);
      }
      setLoading(false);
    }).catch(() => {
      setOverview(null);
      setWorkload([]);
      setBurndown(null);
      setLoading(false);
    });
  }, [projectId, allowed]);

  const pct = (rate: number) => Math.round((rate || 0) * 100);

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-24 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold mb-1">无权访问</h2>
          <p className="text-sm text-muted-foreground">效能度量模块仅对产品经理与系统管理员开放，您当前角色暂无查看权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0088ff]" /> 效能度量
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">基于项目实时数据的研发效能分析</p>
        </div>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="选择项目" /></SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">加载中...</div>
      ) : !overview ? (
        <div className="p-12 text-center text-muted-foreground">暂无可用的项目效能数据</div>
      ) : (
        <>
          {/* KPI Cards - all from backend */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-[#0088ff]" />
                <span className="text-xs text-muted-foreground">已完成任务</span>
              </div>
              <p className="text-2xl font-bold">{overview.taskDone}</p>
              <Badge className="text-[9px] mt-1 bg-blue-50 text-blue-600">共{overview.taskTotal}个任务</Badge>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">任务完成率</span>
              </div>
              <p className="text-2xl font-bold">{pct(overview.taskCompletionRate)}%</p>
              <Progress value={pct(overview.taskCompletionRate)} className="h-1.5 mt-2" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">严重Bug数</span>
              </div>
              <p className="text-2xl font-bold">{overview.bugCritical}</p>
              <Badge className="text-[9px] mt-1 bg-amber-50 text-amber-600">共{overview.bugTotal}个Bug</Badge>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Bug修复率</span>
              </div>
              <p className="text-2xl font-bold">{pct(overview.bugFixRate)}%</p>
              <Progress value={pct(overview.bugFixRate)} className="h-1.5 mt-2" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">需求完成率</span>
              </div>
              <p className="text-2xl font-bold">{pct(overview.requirementCompletionRate)}%</p>
              <Progress value={pct(overview.requirementCompletionRate)} className="h-1.5 mt-2" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">需求总量</span>
              </div>
              <p className="text-2xl font-bold">{overview.requirementTotal}</p>
              <Badge className="text-[9px] mt-1 bg-purple-50 text-purple-600">已关闭{overview.requirementClosed}个</Badge>
            </motion.div>
          </div>

          {/* Sprint Burndown - real data */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-border/60 p-6">
            <h3 className="text-sm font-semibold mb-4">迭代任务进度</h3>
            {burndown && burndown.totalTasks > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{burndown.sprintName}</span>
                  <span className="text-muted-foreground">
                    已完成 {burndown.completedTasks} / {burndown.totalTasks}，剩余 {burndown.remainingTasks}
                  </span>
                </div>
                <Progress
                  value={burndown.totalTasks > 0 ? Math.round((burndown.completedTasks / burndown.totalTasks) * 100) : 0}
                  className="h-3"
                />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xl font-bold">{burndown.totalTasks}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">总任务</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xl font-bold text-emerald-600">{burndown.completedTasks}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">已完成</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xl font-bold text-amber-600">{burndown.remainingTasks}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">剩余</p>
                  </div>
                </div>
              </div>
            ) : burndown ? (
              <p className="text-sm text-muted-foreground py-6 text-center">当前迭代「{burndown.sprintName}」暂未关联任务</p>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">该项目暂无迭代数据</p>
            )}
          </motion.div>

          {/* Team Workload - real data from /metrics/workload */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-border/60 p-6">
            <h3 className="text-sm font-semibold mb-4">团队成员工作量</h3>
            {workload.length > 0 ? (
              <div className="space-y-3">
                {workload.map((m) => (
                  <div key={m.userId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0088ff] to-[#0066cc] flex items-center justify-center text-white text-xs font-bold">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.name}</span>
                        {m.role && <Badge variant="outline" className="text-[9px]">{ROLE_LABELS[m.role] || m.role}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>总任务: {m.totalTasks}</span>
                        <span>已完成: {m.doneTasks}</span>
                        <span>预估工时: {m.estimatedHours}h</span>
                        <span>实际工时: {m.actualHours}h</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#0088ff]">
                        {m.totalTasks > 0 ? Math.round((m.doneTasks / m.totalTasks) * 100) : 0}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">完成率</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">该项目暂无已指派的任务工作量数据</p>
            )}
          </motion.div>

          {/* Improvement Suggestions - derived from real data */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-[#0088ff]/20 p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0088ff]" /> 效能洞察
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 当前项目任务完成率 {pct(overview.taskCompletionRate)}%（{overview.taskDone}/{overview.taskTotal}），建议关注进行中任务的推进。</p>
              <p>• 共有 {overview.bugTotal} 个 Bug，其中 {overview.bugCritical} 个为严重级别，Bug 修复率 {pct(overview.bugFixRate)}%。</p>
              <p>• 需求完成率 {pct(overview.requirementCompletionRate)}%（已关闭 {overview.requirementClosed}/{overview.requirementTotal}）。</p>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
