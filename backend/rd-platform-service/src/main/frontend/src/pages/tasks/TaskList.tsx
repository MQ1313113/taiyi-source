import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Code2, Plus, Search, Filter, LayoutGrid, List, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { taskApi, userApi, requirementApi, projectApi } from "@/services/api";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  TODO: { label: "待开发", color: "#6b7280" },
  IN_PROGRESS: { label: "开发中", color: "#0088ff" },
  SELF_TESTING: { label: "自测中", color: "#f59e0b" },
  TESTING: { label: "测试中", color: "#06b6d4" },
  CODE_REVIEW: { label: "代码审查", color: "#8b5cf6" },
  DONE: { label: "已完成", color: "#10b981" },
  BLOCKED: { label: "已阻塞", color: "#ef4444" },
};

export default function TaskList() {
  const { hasPermission, role } = useRole();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [form, setForm] = useState({
    title: "", description: "", requirementId: "", assigneeId: "", estimatedHours: "",
    priority: "MEDIUM", startDate: "", dueDate: "", type: "FEATURE", projectId: "", acceptanceCriteria: "",
  });

  const [users, setUsers] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const fetchTasks = () => {
    setLoading(true);
    taskApi.list({ page: 1, size: 50 }).then((res: any) => {
      const records = res.data?.records || res.data || [];
      setTasks(records.map((t: any) => ({
        ...t,
        title: t.taskName || t.title,
      })));
    }).catch(() => {
      setTasks([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    // 获取带角色的用户列表
    userApi.listWithRoles().then((res: any) => {
      setUsers((res.data || []).filter((u: any) => u.roleCode !== 'sys_admin' && u.roleCode !== 'admin'));
    }).catch(() => {});
    // 获取需求列表（只显示评审通过后的需求，草稿和评审中的不允许拆解任务）
    requirementApi.list({ page: 1, size: 100 }).then((res: any) => {
      const allReqs = res.data?.records || res.data || [];
      const allowedStatuses = ['DEVELOPING', 'DEVELOPED', 'TESTING', 'TESTED', 'RELEASED'];
      setRequirements(allReqs.filter((r: any) => allowedStatuses.includes(r.status)));
    }).catch(() => {});
    // 获取项目列表
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  // 构建用户名映射
  const userMap: Record<number, string> = {};
  users.forEach((u: any) => { userMap[u.id] = u.nickname || u.username; });

  const handleCreate = () => {
    if (!form.projectId || !form.title || !form.description || !form.assigneeId || !form.estimatedHours || !form.startDate || !form.dueDate || !form.requirementId || !form.acceptanceCriteria) {
      toast.error("请填写所有必填字段（所属项目、标题、任务描述、负责人、预估工时、开始日期、截止日期、关联需求、验收标准）"); return;
    }
    taskApi.create({
      taskName: form.title,
      description: form.description,
      priority: form.priority,
      type: form.type,
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedHours: parseInt(form.estimatedHours),
      requirementId: parseInt(form.requirementId),
      assigneeId: parseInt(form.assigneeId),
      projectId: parseInt(form.projectId),
      acceptanceCriteria: form.acceptanceCriteria,
    }).then(() => {
      toast.success("任务创建成功");
      setShowCreate(false);
      setForm({ title: "", description: "", requirementId: "", assigneeId: "", estimatedHours: "", priority: "MEDIUM", startDate: "", dueDate: "", type: "FEATURE", projectId: "", acceptanceCriteria: "" });
      fetchTasks();
    }).catch((err: any) => toast.error(err?.message || "创建失败"));
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    taskApi.changeStatus(taskId, { status: newStatus }).then(() => {
      toast.success(`任务状态已更新`);
      fetchTasks();
    }).catch((err: any) => toast.error(err?.message || "操作失败"));
  };

  const filtered = tasks.filter(t => {
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    if (searchText && !t.title?.includes(searchText)) return false;
    return true;
  });

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "DONE") return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[#0088ff]" /> 开发任务
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">任务由产品经理从需求拆解分派，开发完成后流转至测试</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-[#0088ff] text-white" : "text-muted-foreground"}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("kanban")} className={`p-2 ${viewMode === "kanban" ? "bg-[#0088ff] text-white" : "text-muted-foreground"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {hasPermission("task:create") && (
            <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
              <Plus className="w-4 h-4 mr-1" /> 新建任务
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索任务..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 bg-muted/50 border-0 rounded-xl" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filtered.map((task, i) => {
            const status = statusConfig[task.status] || statusConfig.TODO;
            const overdue = isOverdue(task.dueDate, task.status);
            const assigneeName = userMap[task.assigneeId] || task.assigneeName || '未指派';
            return (
              <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all duration-300 ${overdue ? "border-red-200" : "border-border/60"}`}>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{task.title}</span>
                      {overdue && <Badge className="text-[9px] bg-red-50 text-red-600 border-red-200">逾期</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{assigneeName}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.actualHours || 0}/{task.estimatedHours}h</span>
                      <span>截止: {task.dueDate}</span>
                    </div>
                  </div>
                  {hasPermission("task:status") ? (
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                      <SelectTrigger className="w-28 h-7 text-xs" style={{ borderColor: status.color, color: status.color }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={task.status}>{statusConfig[task.status]?.label || task.status}</SelectItem>
                        {/* 开发侧流转：仅非QA角色可见（后端限定任务负责人本人） */}
                        {role !== "qa" && task.status === "TODO" && <SelectItem value="IN_PROGRESS">开发中</SelectItem>}
                        {role !== "qa" && task.status === "IN_PROGRESS" && <SelectItem value="SELF_TESTING">自测中</SelectItem>}
                        {role !== "qa" && task.status === "SELF_TESTING" && <><SelectItem value="TESTING">测试中</SelectItem><SelectItem value="IN_PROGRESS">退回开发</SelectItem></>}
                        {/* 测试侧流转：仅QA可见，与后端「仅QA且非本人负责」规则一致 */}
                        {role === "qa" && task.status === "TESTING" && <><SelectItem value="DONE">测试通过(完成)</SelectItem><SelectItem value="IN_PROGRESS">退回开发</SelectItem></>}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="text-xs" style={{ backgroundColor: status.color + '20', color: status.color, borderColor: status.color }}>{status.label}</Badge>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Object.entries(statusConfig).map(([statusKey, statusCfg]) => (
            <div key={statusKey} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusCfg.color }} />
                <span className="text-xs font-medium">{statusCfg.label}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{filtered.filter(t => t.status === statusKey).length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {filtered.filter(t => t.status === statusKey).map((task) => (
                  <div key={task.id} className="bg-white rounded-lg border border-border/60 p-3 text-xs hover:shadow-sm transition-shadow">
                    <p className="font-medium line-clamp-2">{task.title}</p>
                    <p className="text-muted-foreground mt-1">{userMap[task.assigneeId] || task.assigneeName || '未指派'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新建开发任务</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-lg">
              任务由产品经理从需求拆解，需指定开发负责人和预估工时
            </div>
            <div className="space-y-2">
              <Label>所属项目 <span className="text-red-500">*</span></Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({...form, projectId: v})}>
                <SelectTrigger><SelectValue placeholder="选择所属项目" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.projectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>关联需求 <span className="text-red-500">*</span></Label>
              <Select value={form.requirementId} onValueChange={(v) => setForm({...form, requirementId: v})}>
                <SelectTrigger><SelectValue placeholder="选择关联需求（仅显示评审通过的需求）" /></SelectTrigger>
                <SelectContent>
                  {requirements.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">暂无可拆解的需求（需评审通过后才能拆解任务）</div>
                  )}
                  {requirements.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.title} [{r.status}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">只有评审通过进入开发阶段的需求才能拆解任务</p>
            </div>
            <div className="space-y-2">
              <Label>任务标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="请输入任务标题" />
            </div>
            <div className="space-y-2">
              <Label>任务描述 <span className="text-red-500">*</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="详细描述任务内容和技术方案" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>指派开发 <span className="text-red-500">*</span></Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({...form, assigneeId: v})}>
                  <SelectTrigger><SelectValue placeholder="选择开发人员" /></SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.roleCode === 'dev').map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.nickname} ({u.roleName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>预估工时(h) <span className="text-red-500">*</span></Label>
                <Input type="number" value={form.estimatedHours} onChange={(e) => setForm({...form, estimatedHours: e.target.value})} placeholder="小时" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优先级 <span className="text-red-500">*</span></Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">高</SelectItem>
                    <SelectItem value="MEDIUM">中</SelectItem>
                    <SelectItem value="LOW">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>任务类型 <span className="text-red-500">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEATURE">功能开发</SelectItem>
                    <SelectItem value="BUGFIX">Bug修复</SelectItem>
                    <SelectItem value="REFACTOR">重构优化</SelectItem>
                    <SelectItem value="TECH_DEBT">技术债务</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>截止日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>验收标准(DoD) <span className="text-red-500">*</span></Label>
              <Textarea value={form.acceptanceCriteria} onChange={(e) => setForm({...form, acceptanceCriteria: e.target.value})}
                placeholder="请明确列出任务完成的判定标准：&#10;1. 代码已提交并通过Code Review&#10;2. 单元测试覆盖率达标&#10;3. 接口文档已更新" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">创建任务</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
