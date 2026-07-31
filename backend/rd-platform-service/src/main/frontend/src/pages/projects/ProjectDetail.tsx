import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  FolderKanban, ArrowLeft, Users, Plus, Trash2, Settings2,
  BarChart3, FileText, Code2, Bug, TestTube2, Layers, Edit2, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { projectApi, userApi } from "@/services/api";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const gearColors: Record<string, string> = { L1: "#10b981", L2: "#0088ff", L3: "#8b5cf6", LIGHTWEIGHT: "#10b981", STANDARD: "#0088ff", FULL: "#8b5cf6" };
const gearLabels: Record<string, string> = { L1: "轻量档 L1", L2: "标准档 L2", L3: "完整档 L3", LIGHTWEIGHT: "轻量档 L1", STANDARD: "标准档 L2", FULL: "完整档 L3" };
const statusLabels: Record<string, string> = { PLANNING: "规划中", ACTIVE: "进行中", PAUSED: "已暂停", CLOSED: "已结束" };
const statusColors: Record<string, string> = { PLANNING: "#6b7280", ACTIVE: "#10b981", PAUSED: "#f59e0b", CLOSED: "#6b7280" };
const roleLabels: Record<string, string> = { pm: "产品经理", dev: "开发", qa: "测试", sys_admin: "管理员", PM: "产品经理" };

const reqStatusLabels: Record<string, string> = { DRAFT: "草稿", SUBMITTED: "已提交", REVIEWING: "评审中", APPROVED: "已通过", DEVELOPING: "开发中", TESTING: "测试中", DONE: "已完成", REJECTED: "已拒绝" };
const taskStatusLabels: Record<string, string> = { TODO: "待处理", IN_PROGRESS: "进行中", DONE: "已完成", CLOSED: "已关闭", BLOCKED: "已阻塞" };
const bugStatusLabels: Record<string, string> = { OPEN: "待处理", CONFIRMED: "已确认", FIXING: "修复中", FIXED: "已修复", VERIFIED: "已验证", CLOSED: "已关闭", REJECTED: "已拒绝" };
const sprintStatusLabels: Record<string, string> = { NOT_STARTED: "未开始", IN_PROGRESS: "进行中", COMPLETED: "已完成" };
const sprintStatusColors: Record<string, string> = { NOT_STARTED: "#6b7280", IN_PROGRESS: "#0088ff", COMPLETED: "#10b981" };

type TabKey = "overview" | "requirements" | "tasks" | "bugs" | "tests" | "sprints" | "members" | "settings";

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: "overview", label: "概览", icon: BarChart3 },
  { key: "requirements", label: "需求", icon: FileText },
  { key: "tasks", label: "任务", icon: Code2 },
  { key: "bugs", label: "缺陷", icon: Bug },
  { key: "tests", label: "测试", icon: TestTube2 },
  { key: "sprints", label: "迭代", icon: Layers },
  { key: "members", label: "成员", icon: Users },
  { key: "settings", label: "设置", icon: Settings2 },
];

export default function ProjectDetail() {
  const [, params] = useRoute("/app/projects/:id");
  const [, setLocation] = useLocation();
  const { role } = useRole();
  const projectId = parseInt(params?.id || "0");

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Statistics
  const [stats, setStats] = useState<any>(null);

  // Members
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ userId: "" });
  const [removeTarget, setRemoveTarget] = useState<any>(null);

  // Sprints
  const [sprints, setSprints] = useState<any[]>([]);
  const [showSprintCreate, setShowSprintCreate] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });

  // Related data
  const [requirements, setRequirements] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [bugs, setBugs] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);

  // Settings
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ projectName: "", description: "", startDate: "", endDate: "" });
  const [showGear, setShowGear] = useState(false);
  const [gearVal, setGearVal] = useState("L2");

  const loadProject = () => {
    if (!projectId) return;
    projectApi.detail(projectId).then((res: any) => {
      const p = res.data;
      setProject({ ...p, name: p?.projectName || p?.name, gear: p?.gearLevel || p?.gear });
      setGearVal(p?.gearLevel || "L2");
      setEditForm({
        projectName: p?.projectName || "",
        description: p?.description || "",
        startDate: p?.startDate || "",
        endDate: p?.endDate || ""
      });
    }).catch(() => setProject(null)).finally(() => setLoading(false));
  };

  const loadStats = () => {
    projectApi.statistics(projectId).then((res: any) => setStats(res.data)).catch(() => {});
  };

  const loadMembers = () => {
    projectApi.listMembers(projectId).then((res: any) => setMembers(Array.isArray(res?.data) ? res.data : [])).catch(() => setMembers([]));
    userApi.listWithRoles().then((res: any) => setAllUsers(Array.isArray(res?.data) ? res.data : [])).catch(() => setAllUsers([]));
  };

  const loadSprints = () => {
    projectApi.sprintList(projectId).then((res: any) => setSprints(Array.isArray(res?.data) ? res.data : [])).catch(() => setSprints([]));
  };

  const loadRequirements = () => {
    projectApi.listRequirements(projectId, { pageNum: 1, pageSize: 50 }).then((res: any) => {
      setRequirements(res.data?.records || []);
    }).catch(() => setRequirements([]));
  };

  const loadTasks = () => {
    projectApi.listTasks(projectId, { pageNum: 1, pageSize: 50 }).then((res: any) => {
      setTasks(res.data?.records || []);
    }).catch(() => setTasks([]));
  };

  const loadBugs = () => {
    projectApi.listBugs(projectId, { pageNum: 1, pageSize: 50 }).then((res: any) => {
      setBugs(res.data?.records || []);
    }).catch(() => setBugs([]));
  };

  const loadTestCases = () => {
    projectApi.listTestCases(projectId, { pageNum: 1, pageSize: 50 }).then((res: any) => {
      setTestCases(res.data?.records || []);
    }).catch(() => setTestCases([]));
  };

  useEffect(() => {
    loadProject();
    loadStats();
    loadMembers();
    loadSprints();
  }, [params?.id]);

  useEffect(() => {
    if (activeTab === "requirements") loadRequirements();
    else if (activeTab === "tasks") loadTasks();
    else if (activeTab === "bugs") loadBugs();
    else if (activeTab === "tests") loadTestCases();
    else if (activeTab === "sprints") loadSprints();
    else if (activeTab === "members") loadMembers();
  }, [activeTab]);

  // Member actions
  const memberIds = new Set(members.map((m) => String(m.userId)));
  const candidates = allUsers.filter((u) => !memberIds.has(String(u.id)));

  const handleAddMember = () => {
    if (!addForm.userId) { toast.error("请选择成员"); return; }
    projectApi.addMember(projectId, { userId: Number(addForm.userId) })
      .then(() => { toast.success("成员添加成功"); setShowAdd(false); setAddForm({ userId: "" }); loadMembers(); loadStats(); })
      .catch((err: any) => toast.error(err?.response?.data?.message || "添加失败"));
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    projectApi.removeMember(projectId, removeTarget.userId ?? removeTarget.id)
      .then(() => { toast.success("成员已移除"); setRemoveTarget(null); loadMembers(); loadStats(); })
      .catch((err: any) => { toast.error(err?.response?.data?.message || "移除失败"); setRemoveTarget(null); });
  };

  // Sprint actions
  const handleCreateSprint = () => {
    if (!sprintForm.name || !sprintForm.startDate || !sprintForm.endDate) {
      toast.error("请填写所有必填字段"); return;
    }
    projectApi.sprintCreate(projectId, {
      sprintName: sprintForm.name, goal: sprintForm.goal,
      startDate: sprintForm.startDate, endDate: sprintForm.endDate
    }).then(() => {
      toast.success("迭代创建成功"); setShowSprintCreate(false);
      setSprintForm({ name: "", goal: "", startDate: "", endDate: "" });
      loadSprints(); loadStats();
    }).catch((err: any) => toast.error(err?.response?.data?.message || "创建失败"));
  };

  const handleSprintStatusChange = (sprintId: number, newStatus: string) => {
    projectApi.sprintStatus(projectId, sprintId, { status: newStatus })
      .then(() => { toast.success("迭代状态已更新"); loadSprints(); loadStats(); })
      .catch((err: any) => toast.error(err?.response?.data?.message || "操作失败"));
  };

  // Project edit
  const handleEditProject = () => {
    if (!editForm.projectName) { toast.error("项目名称不能为空"); return; }
    projectApi.update(projectId, { ...editForm, ownerId: project?.ownerId || 1 })
      .then(() => { toast.success("项目信息已更新"); setShowEdit(false); loadProject(); })
      .catch((err: any) => toast.error(err?.response?.data?.message || "更新失败"));
  };

  const handleChangeGear = () => {
    projectApi.changeGear(projectId, { gearLevel: gearVal })
      .then(() => { toast.success("档位已调整"); setShowGear(false); loadProject(); })
      .catch((err: any) => toast.error(err?.response?.data?.message || "调整失败"));
  };

  const handleChangeStatus = (newStatus: string) => {
    projectApi.changeStatus(projectId, { status: newStatus })
      .then(() => { toast.success("项目状态已更新"); loadProject(); })
      .catch((err: any) => toast.error(err?.response?.data?.message || "操作失败"));
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">加载中...</div>;
  if (!project) return <div className="p-6 text-sm text-muted-foreground">项目不存在</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/app/projects")} className="rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#0088ff]" /> {project.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge style={{ backgroundColor: `${gearColors[project.gear]}15`, color: gearColors[project.gear] }}>
              {gearLabels[project.gear] || project.gear}
            </Badge>
            <Badge variant="outline" style={{ borderColor: statusColors[project.status], color: statusColors[project.status] }}>
              {statusLabels[project.status] || project.status}
            </Badge>
            {project.startDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{project.startDate} ~ {project.endDate || "未定"}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "border-[#0088ff] text-[#0088ff]" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === "overview" && <OverviewTab stats={stats} project={project} />}
        {activeTab === "requirements" && <DataListTab data={requirements} type="requirement" />}
        {activeTab === "tasks" && <DataListTab data={tasks} type="task" />}
        {activeTab === "bugs" && <DataListTab data={bugs} type="bug" />}
        {activeTab === "tests" && <DataListTab data={testCases} type="testCase" />}
        {activeTab === "sprints" && (
          <SprintsTab sprints={sprints} onCreateClick={() => setShowSprintCreate(true)} onStatusChange={handleSprintStatusChange} />
        )}
        {activeTab === "members" && (
          <MembersTab members={members} onAdd={() => setShowAdd(true)} onRemove={setRemoveTarget} />
        )}
        {activeTab === "settings" && (
          <SettingsTab project={project} role={role}
            onEdit={() => setShowEdit(true)} onGear={() => setShowGear(true)} onStatusChange={handleChangeStatus} />
        )}
      </motion.div>

      {/* Dialogs */}
      {/* Add Member */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加项目成员</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>选择成员 <span className="text-red-500">*</span></Label>
            <select className="w-full h-9 border rounded-md px-2 text-sm" value={addForm.userId} onChange={(e) => setAddForm({ userId: e.target.value })}>
              <option value="">请选择</option>
              {candidates.map((u) => <option key={u.id} value={u.id}>{u.nickname || u.username}（{roleLabels[u.roleCode] || u.roleName || u.roleCode}）</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={handleAddMember} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirm */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>移除项目成员</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确认将 <span className="font-medium text-foreground">{removeTarget?.nickname || removeTarget?.username}</span> 从本项目中移除？
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>取消</Button>
            <Button onClick={confirmRemove} className="bg-red-500 hover:bg-red-600 text-white">确认移除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sprint */}
      <Dialog open={showSprintCreate} onOpenChange={setShowSprintCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建迭代</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>迭代名称 <span className="text-red-500">*</span></Label>
              <Input value={sprintForm.name} onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })} placeholder="如：Sprint 1" /></div>
            <div><Label>迭代目标</Label>
              <Textarea value={sprintForm.goal} onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })} placeholder="本迭代要达成的目标" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>开始日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={sprintForm.startDate} onChange={(e) => setSprintForm({ ...sprintForm, startDate: e.target.value })} /></div>
              <div><Label>结束日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={sprintForm.endDate} onChange={(e) => setSprintForm({ ...sprintForm, endDate: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSprintCreate(false)}>取消</Button>
            <Button onClick={handleCreateSprint} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">创建迭代</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑项目信息</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>项目名称 <span className="text-red-500">*</span></Label>
              <Input value={editForm.projectName} onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })} /></div>
            <div><Label>项目描述</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>开始日期</Label><Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} /></div>
              <div><Label>结束日期</Label><Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button onClick={handleEditProject} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Gear */}
      <Dialog open={showGear} onOpenChange={setShowGear}>
        <DialogContent>
          <DialogHeader><DialogTitle>调整框架档位</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">档位决定流程节点行为与表单必填字段级别</p>
            <select className="w-full h-9 border rounded-md px-2 text-sm" value={gearVal} onChange={(e) => setGearVal(e.target.value)}>
              <option value="L1">轻量档 L1 - 适合小型项目</option>
              <option value="L2">标准档 L2 - 适合中型项目</option>
              <option value="L3">完整档 L3 - 适合大型项目</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGear(false)}>取消</Button>
            <Button onClick={handleChangeGear} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">确认调整</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Sub-components ==========

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border/60 p-4 space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color || "#0088ff" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function OverviewTab({ stats, project }: { stats: any; project: any }) {
  if (!stats) return <div className="text-sm text-muted-foreground py-8 text-center">加载统计数据中...</div>;
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="需求总数" value={stats.requirementTotal || 0} color="#8b5cf6" />
        <StatCard label="任务总数" value={stats.taskTotal || 0} sub={`完成率 ${stats.taskCompletionRate || 0}%`} color="#0088ff" />
        <StatCard label="缺陷总数" value={stats.bugTotal || 0} sub={`未关闭 ${stats.bugOpenCount || 0}`} color="#ef4444" />
        <StatCard label="测试用例" value={stats.testCaseTotal || 0} sub={`通过率 ${stats.testCasePassRate || 0}%`} color="#10b981" />
        <StatCard label="迭代" value={stats.sprintTotal || 0} sub={`进行中 ${stats.sprintActive || 0}`} color="#f59e0b" />
        <StatCard label="成员" value={stats.memberCount || 0} color="#6b7280" />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusDistribution title="需求状态分布" data={stats.requirementByStatus} labels={reqStatusLabels} color="#8b5cf6" />
        <StatusDistribution title="任务状态分布" data={stats.taskByStatus} labels={taskStatusLabels} color="#0088ff" />
        <StatusDistribution title="缺陷状态分布" data={stats.bugByStatus} labels={bugStatusLabels} color="#ef4444" />
        <StatusDistribution title="测试执行状态" data={stats.testCaseByStatus} labels={{ PASSED: "通过", FAILED: "失败", NOT_RUN: "未执行", BLOCKED: "阻塞" }} color="#10b981" />
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-xl border border-border/60 p-5">
        <h4 className="text-sm font-semibold mb-2">项目描述</h4>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description || "暂无描述"}</p>
      </div>
    </div>
  );
}

function StatusDistribution({ title, data, labels, color }: { title: string; data: any; labels: Record<string, string>; color: string }) {
  if (!data || Object.keys(data).length === 0) return null;
  const total = Object.values(data as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
  return (
    <div className="bg-white rounded-xl border border-border/60 p-4">
      <h5 className="text-xs font-semibold mb-3">{title}</h5>
      <div className="space-y-2">
        {Object.entries(data as Record<string, number>).map(([key, count]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-muted-foreground truncate">{labels[key] || key}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%`, backgroundColor: color, opacity: 0.7 }} />
            </div>
            <span className="w-8 text-right font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataListTab({ data, type }: { data: any[]; type: string }) {
  const getStatusLabel = (status: string) => {
    if (type === "requirement") return reqStatusLabels[status] || status;
    if (type === "task") return taskStatusLabels[status] || status;
    if (type === "bug") return bugStatusLabels[status] || status;
    return status;
  };
  const getTitle = (item: any) => {
    if (type === "requirement") return item.title || item.reqTitle;
    if (type === "task") return item.taskName || item.title;
    if (type === "bug") return item.title || item.bugTitle;
    if (type === "testCase") return item.caseName || item.title;
    return item.title || item.name;
  };
  const getStatus = (item: any) => {
    if (type === "testCase") return item.executionStatus || "NOT_RUN";
    return item.status || "UNKNOWN";
  };

  if (data.length === 0) {
    const typeLabels: Record<string, string> = { requirement: "需求", task: "任务", bug: "缺陷", testCase: "测试用例" };
    return <div className="text-sm text-muted-foreground py-12 text-center">该项目暂无{typeLabels[type] || "数据"}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-border/60 divide-y divide-border/40">
      <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground grid grid-cols-12 gap-2">
        <span className="col-span-1">ID</span>
        <span className="col-span-7">标题</span>
        <span className="col-span-2">状态</span>
        <span className="col-span-2">创建时间</span>
      </div>
      {data.map((item) => (
        <div key={item.id} className="px-4 py-2.5 text-sm grid grid-cols-12 gap-2 hover:bg-muted/20 transition-colors">
          <span className="col-span-1 text-muted-foreground">#{item.id}</span>
          <span className="col-span-7 font-medium truncate">{getTitle(item)}</span>
          <span className="col-span-2">
            <Badge variant="outline" className="text-[10px]">{getStatusLabel(getStatus(item))}</Badge>
          </span>
          <span className="col-span-2 text-xs text-muted-foreground">{item.createdAt?.slice(0, 10) || "-"}</span>
        </div>
      ))}
      <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/20">共 {data.length} 条记录</div>
    </div>
  );
}

function SprintsTab({ sprints, onCreateClick, onStatusChange }: { sprints: any[]; onCreateClick: () => void; onStatusChange: (id: number, status: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">迭代列表（{sprints.length}）</h4>
        <Button size="sm" onClick={onCreateClick} className="h-8 text-xs bg-[#0088ff] hover:bg-[#0066cc] text-white">
          <Plus className="w-3 h-3 mr-1" /> 新建迭代
        </Button>
      </div>
      {sprints.length === 0 ? (
        <div className="text-sm text-muted-foreground py-12 text-center">暂无迭代，点击上方按钮创建</div>
      ) : (
        <div className="space-y-3">
          {sprints.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-semibold">{s.sprintName}</h5>
                  <Badge style={{ backgroundColor: `${sprintStatusColors[s.status]}15`, color: sprintStatusColors[s.status] }}>
                    {sprintStatusLabels[s.status] || s.status}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {s.status === "NOT_STARTED" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(s.id, "IN_PROGRESS")}>开始</Button>
                  )}
                  {s.status === "IN_PROGRESS" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(s.id, "COMPLETED")}>完成</Button>
                  )}
                </div>
              </div>
              {s.goal && <p className="text-xs text-muted-foreground mb-2">{s.goal}</p>}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {s.startDate} ~ {s.endDate}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MembersTab({ members, onAdd, onRemove }: { members: any[]; onAdd: () => void; onRemove: (m: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> 项目成员（{members.length}）</h4>
        <Button size="sm" onClick={onAdd} className="h-8 text-xs bg-[#0088ff] hover:bg-[#0066cc] text-white">
          <Plus className="w-3 h-3 mr-1" /> 添加成员
        </Button>
      </div>
      {members.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">暂无成员</div>
      ) : (
        <div className="bg-white rounded-xl border border-border/60 divide-y divide-gray-50">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0088ff]/10 flex items-center justify-center text-[#0088ff] text-xs font-medium">
                  {(m.nickname || m.username || "?").charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{m.nickname || m.username}</div>
                  <div className="text-xs text-muted-foreground">{roleLabels[m.roleCode] || m.roleCode}</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 h-7" onClick={() => onRemove(m)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ project, role, onEdit, onGear, onStatusChange }: { project: any; role: string; onEdit: () => void; onGear: () => void; onStatusChange: (s: string) => void }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl border border-border/60 p-5 space-y-4">
        <h4 className="text-sm font-semibold">基本信息</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">项目名称：</span><span className="font-medium">{project.name}</span></div>
          <div><span className="text-muted-foreground">项目编码：</span><span className="font-medium">{project.projectCode || "-"}</span></div>
          <div><span className="text-muted-foreground">开始日期：</span><span className="font-medium">{project.startDate || "-"}</span></div>
          <div><span className="text-muted-foreground">结束日期：</span><span className="font-medium">{project.endDate || "-"}</span></div>
          <div><span className="text-muted-foreground">框架档位：</span><span className="font-medium">{gearLabels[project.gear] || project.gear}</span></div>
          <div><span className="text-muted-foreground">项目状态：</span><span className="font-medium">{statusLabels[project.status] || project.status}</span></div>
        </div>
        <div className="border-t pt-3">
          <span className="text-sm text-muted-foreground">描述：</span>
          <p className="text-sm mt-1">{project.description || "暂无"}</p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onEdit}><Edit2 className="w-3.5 h-3.5 mr-1" /> 编辑信息</Button>
          {role === "sys_admin" && <Button size="sm" variant="outline" onClick={onGear}><Settings2 className="w-3.5 h-3.5 mr-1" /> 调整档位</Button>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/60 p-5 space-y-3">
        <h4 className="text-sm font-semibold">状态管理</h4>
        <p className="text-xs text-muted-foreground">当前状态：<Badge variant="outline" style={{ borderColor: statusColors[project.status], color: statusColors[project.status] }}>{statusLabels[project.status]}</Badge></p>
        <div className="flex gap-2 flex-wrap">
          {project.status !== "ACTIVE" && <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => onStatusChange("ACTIVE")}>启动项目</Button>}
          {project.status === "ACTIVE" && <Button size="sm" variant="outline" className="text-amber-600 border-amber-200" onClick={() => onStatusChange("PAUSED")}>暂停项目</Button>}
          {project.status !== "CLOSED" && <Button size="sm" variant="outline" className="text-gray-600 border-gray-200" onClick={() => onStatusChange("CLOSED")}>结束项目</Button>}
          {project.status === "CLOSED" && <Button size="sm" variant="outline" className="text-blue-600 border-blue-200" onClick={() => onStatusChange("PLANNING")}>重新规划</Button>}
        </div>
      </div>
    </div>
  );
}
