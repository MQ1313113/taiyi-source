import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bug, Plus, Search, AlertTriangle, CheckCircle2, Wrench, ShieldCheck, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bugApi, userApi, projectApi } from "@/services/api";
import { toast } from "sonner";

const severityConfig: Record<string, { label: string; color: string }> = {
  BLOCKER: { label: "阻塞", color: "#dc2626" },
  CRITICAL: { label: "严重", color: "#ea580c" },
  HIGH: { label: "高", color: "#ea580c" },
  MAJOR: { label: "主要", color: "#d97706" },
  MEDIUM: { label: "中", color: "#d97706" },
  MINOR: { label: "次要", color: "#65a30d" },
  LOW: { label: "低", color: "#65a30d" },
  TRIVIAL: { label: "建议", color: "#6b7280" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  NEW: { label: "新建", color: "#6b7280" },
  OPEN: { label: "待确认", color: "#3b82f6" },
  CONFIRMED: { label: "已确认", color: "#0ea5e9" },
  FIXING: { label: "修复中", color: "#f59e0b" },
  FIXED: { label: "已修复", color: "#8b5cf6" },
  VERIFIED: { label: "已验证", color: "#10b981" },
  CLOSED: { label: "已关闭", color: "#374151" },
  REJECTED: { label: "已拒绝", color: "#ef4444" },
  REOPENED: { label: "重新打开", color: "#dc2626" },
};

// Bug状态流转: OPEN -> CONFIRMED -> FIXING -> FIXED -> VERIFIED -> CLOSED
const nextActions: Record<string, { status: string; label: string; icon: any; color: string }[]> = {
  OPEN: [
    { status: "CONFIRMED", label: "确认Bug", icon: CheckCircle2, color: "#0ea5e9" },
    { status: "REJECTED", label: "拒绝", icon: XCircle, color: "#ef4444" },
  ],
  CONFIRMED: [
    { status: "FIXING", label: "开始修复", icon: Wrench, color: "#f59e0b" },
  ],
  FIXING: [
    { status: "FIXED", label: "标记已修复", icon: CheckCircle2, color: "#8b5cf6" },
  ],
  FIXED: [
    { status: "VERIFIED", label: "验证通过", icon: ShieldCheck, color: "#10b981" },
    { status: "REOPENED", label: "验证失败(重开)", icon: RotateCcw, color: "#dc2626" },
  ],
  VERIFIED: [
    { status: "CLOSED", label: "关闭", icon: CheckCircle2, color: "#374151" },
  ],
  REJECTED: [
    { status: "REOPENED", label: "重新打开", icon: RotateCcw, color: "#dc2626" },
  ],
  REOPENED: [
    { status: "CONFIRMED", label: "重新确认", icon: CheckCircle2, color: "#0ea5e9" },
  ],
};

export default function BugList() {
  const { hasPermission } = useRole();
  const [bugs, setBugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", stepsToReproduce: "", expectedResult: "", actualResult: "",
    severity: "MAJOR", assigneeId: "", moduleName: "", projectId: "",
    environment: "", frequency: "ALWAYS", affectedScope: "",
  });
  const [projects, setProjects] = useState<any[]>([]);

  const fetchBugs = () => {
    setLoading(true);
    bugApi.list({ page: 1, size: 50 }).then((res: any) => {
      setBugs(res.data?.records || res.data || []);
    }).catch(() => {
      setBugs([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBugs();
    // 获取带角色的用户列表
    userApi.listWithRoles().then((res: any) => {
      setUsers((res.data || []).filter((u: any) => u.roleCode !== 'sys_admin' && u.roleCode !== 'admin'));
    }).catch(() => {});
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  // 构建用户名映射
  const userMap: Record<number, string> = {};
  users.forEach((u: any) => { userMap[u.id] = u.nickname || u.username; });

  const handleCreate = () => {
    if (!form.projectId || !form.title || !form.stepsToReproduce || !form.expectedResult || !form.actualResult || !form.assigneeId || !form.severity || !form.moduleName || !form.environment || !form.affectedScope) {
      toast.error("请填写所有必填字段（所属项目、标题、复现步骤、预期结果、实际结果、严重程度、所属模块、负责人、测试环境、影响范围）"); return;
    }
    bugApi.create({
      title: form.title,
      description: form.stepsToReproduce,
      expectedResult: form.expectedResult,
      actualResult: form.actualResult,
      severity: form.severity,
      priority: form.severity === 'BLOCKER' || form.severity === 'HIGH' ? 'HIGH' : form.severity === 'MEDIUM' || form.severity === 'MAJOR' ? 'MEDIUM' : 'LOW',
      moduleName: form.moduleName,
      environment: form.environment,
      frequency: form.frequency,
      affectedScope: form.affectedScope,
      assigneeId: parseInt(form.assigneeId),
      projectId: parseInt(form.projectId),
    }).then(() => {
      toast.success("Bug已提交，等待负责人确认（R3交叉确认规则）");
      setShowCreate(false);
      setForm({ title: "", description: "", stepsToReproduce: "", expectedResult: "", actualResult: "", severity: "MAJOR", assigneeId: "", moduleName: "", projectId: "", environment: "", frequency: "ALWAYS", affectedScope: "" });
      fetchBugs();
    }).catch((err: any) => toast.error(err?.message || "提交失败"));
  };

  const handleStatusChange = (bugId: number, newStatus: string) => {
    bugApi.changeStatus(bugId, { status: newStatus }).then(() => {
      toast.success("Bug状态已更新");
      fetchBugs();
    }).catch((err: any) => toast.error(err?.message || "操作失败"));
  };

  const filtered = bugs.filter(b => {
    if (filterSeverity !== "ALL" && b.severity !== filterSeverity) return false;
    if (searchText && !b.title?.includes(searchText)) return false;
    return true;
  });

  const openCount = bugs.filter(b => !["CLOSED", "VERIFIED", "REJECTED"].includes(b.status)).length;
  const fixedCount = bugs.filter(b => ["FIXED", "VERIFIED", "CLOSED"].includes(b.status)).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" /> 缺陷管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">R3规则：Bug修复人不能是验证关闭人</p>
        </div>
        {hasPermission("bug:create") && (
          <Button onClick={() => setShowCreate(true)} className="bg-red-500 hover:bg-red-600 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 提交Bug
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-[#0088ff]">{bugs.length}</p>
          <p className="text-[11px] text-muted-foreground">总Bug数</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-red-500">{openCount}</p>
          <p className="text-[11px] text-muted-foreground">待处理</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-green-600">{fixedCount}</p>
          <p className="text-[11px] text-muted-foreground">已修复</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{bugs.length > 0 ? Math.round((fixedCount / bugs.length) * 100) : 0}%</p>
          <p className="text-[11px] text-muted-foreground">修复率</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索Bug..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 bg-muted/50 border-0 rounded-xl" />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部</SelectItem>
            <SelectItem value="BLOCKER">阻塞</SelectItem>
            <SelectItem value="HIGH">高</SelectItem>
            <SelectItem value="MAJOR">主要</SelectItem>
            <SelectItem value="MINOR">次要</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bug List */}
      <div className="space-y-2">
        {filtered.map((bug, i) => {
          const severity = severityConfig[bug.severity] || severityConfig.MAJOR;
          const status = statusConfig[bug.status] || statusConfig.NEW;
          const allActions = nextActions[bug.status] || [];
          const currentUserId = JSON.parse(localStorage.getItem('taiyi_user') || '{}').id;
          const actions = allActions.filter(action => {
            // 确认/拒绝/重新确认/重新打开: 需要bug:confirm权限
            if (["CONFIRMED", "REJECTED", "REOPENED"].includes(action.status)) return hasPermission("bug:confirm") || hasPermission("bug:close");
            // 开始修复/标记已修复: 必须是负责人本人
            if (["FIXING", "FIXED"].includes(action.status)) return bug.assigneeId === currentUserId;
            // 验证/关闭: 需要bug:close权限
            if (["VERIFIED", "CLOSED"].includes(action.status)) return hasPermission("bug:close");
            return true;
          });
          const assigneeName = userMap[bug.assigneeId] || bug.assigneeName || `ID:${bug.assigneeId}`;
          return (
            <motion.div key={bug.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-border/60 p-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: severity.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{bug.title}</span>
                    <Badge className="text-[9px]" style={{ backgroundColor: `${severity.color}15`, color: severity.color }}>{severity.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>模块: {bug.moduleName || '-'}</span>
                    <span>指派: {assigneeName}</span>
                    <span>{bug.createdAt?.substring(0, 10)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: status.color, color: status.color }}>
                  {status.label}
                </Badge>
                {/* Action Buttons */}
                <div className="flex gap-1 shrink-0">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button key={action.status} size="sm" variant="ghost"
                        className="h-7 px-2 text-xs"
                        style={{ color: action.color }}
                        onClick={() => handleStatusChange(bug.id, action.status)}>
                        <Icon className="w-3 h-3 mr-1" />{action.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">暂无缺陷记录</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>提交Bug（全字段必填）</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>R3规则：Bug修复完成后，需由非修复人进行验证关闭。提交时需指定负责人。</span>
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
              <Label>Bug标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="简明描述Bug现象" />
            </div>
            <div className="space-y-2">
              <Label>复现步骤 <span className="text-red-500">*</span></Label>
              <Textarea value={form.stepsToReproduce} onChange={(e) => setForm({...form, stepsToReproduce: e.target.value})}
                placeholder="1. 打开XX页面&#10;2. 点击XX按钮&#10;3. 输入XX内容&#10;4. 观察到..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>预期结果 <span className="text-red-500">*</span></Label>
                <Textarea value={form.expectedResult} onChange={(e) => setForm({...form, expectedResult: e.target.value})} placeholder="应该出现的正确行为" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>实际结果 <span className="text-red-500">*</span></Label>
                <Textarea value={form.actualResult} onChange={(e) => setForm({...form, actualResult: e.target.value})} placeholder="实际出现的错误行为" rows={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>严重程度 <span className="text-red-500">*</span></Label>
                <Select value={form.severity} onValueChange={(v) => setForm({...form, severity: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLOCKER">阻塞(Blocker)</SelectItem>
                    <SelectItem value="HIGH">高(High)</SelectItem>
                    <SelectItem value="MAJOR">主要(Major)</SelectItem>
                    <SelectItem value="MINOR">次要(Minor)</SelectItem>
                    <SelectItem value="TRIVIAL">建议(Trivial)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>所属模块 <span className="text-red-500">*</span></Label>
                <Input value={form.moduleName} onChange={(e) => setForm({...form, moduleName: e.target.value})} placeholder="如: 用户模块、支付模块" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>指派负责人 <span className="text-red-500">*</span></Label>
              <Select value={form.assigneeId} onValueChange={(v) => setForm({...form, assigneeId: v})}>
                <SelectTrigger><SelectValue placeholder="选择负责人" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.roleCode === 'dev').map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.nickname} ({u.roleName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>测试环境 <span className="text-red-500">*</span></Label>
                <Input value={form.environment} onChange={(e) => setForm({...form, environment: e.target.value})} placeholder="如: Chrome 120 / iOS 17" />
              </div>
              <div className="space-y-2">
                <Label>复现频率 <span className="text-red-500">*</span></Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({...form, frequency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALWAYS">必现(100%)</SelectItem>
                    <SelectItem value="OFTEN">高频(&gt;50%)</SelectItem>
                    <SelectItem value="SOMETIMES">偶现(10%-50%)</SelectItem>
                    <SelectItem value="RARELY">难以复现(&lt;10%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>影响范围 <span className="text-red-500">*</span></Label>
              <Textarea value={form.affectedScope} onChange={(e) => setForm({...form, affectedScope: e.target.value})} placeholder="描述该Bug影响的用户群体、功能模块和业务流程" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-red-500 hover:bg-red-600 text-white">提交Bug</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
