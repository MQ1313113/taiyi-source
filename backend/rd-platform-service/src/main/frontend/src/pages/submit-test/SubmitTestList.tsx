import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Plus, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitTestApi, userApi, requirementApi, projectApi } from "@/services/api";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待审批", color: "#f59e0b" },
  APPROVED: { label: "已通过", color: "#10b981" },
  REJECTED: { label: "已驳回", color: "#ef4444" },
  TESTING: { label: "测试中", color: "#0088ff" },
  COMPLETED: { label: "测试完成", color: "#374151" },
};

export default function SubmitTestList() {
  const { hasPermission } = useRole();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", requirementId: "", projectId: "", scope: "", selfTestReport: "", deployBranch: "", testerId: "",
  });

  const fetchRecords = () => {
    setLoading(true);
    submitTestApi.list({ page: 1, size: 50 }).then((res: any) => {
      setRecords(res.data?.records || res.data || []);
    }).catch(() => {
      setRecords([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
    // 获取带角色的用户列表
    userApi.listWithRoles().then((res: any) => {
      setUsers((res.data || []).filter((u: any) => u.roleCode !== 'sys_admin' && u.roleCode !== 'admin'));
    }).catch(() => {});
    // 获取需求列表（只显示已开发完成的需求）
    requirementApi.list({ page: 1, size: 100 }).then((res: any) => {
      const allReqs = res.data?.records || res.data || [];
      // 只保留DEVELOPED状态的需求（只有开发完成的需求才能提测）
      setRequirements(allReqs.filter((r: any) => r.status === "DEVELOPED"));
    }).catch(() => {});
    // 获取项目列表
    projectApi.list({ page: 1, size: 50 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  // 构建用户名映射
  const userMap: Record<number, string> = {};
  users.forEach((u: any) => { userMap[u.id] = u.nickname || u.username; });

  // 筛选测试人员
  const testers = users.filter(u => u.roleCode === 'qa');

  // 根据选中的项目过滤需求
  const filteredRequirements = form.projectId
    ? requirements.filter((r: any) => String(r.projectId) === form.projectId)
    : requirements;

  const handleCreate = () => {
    if (!form.title || !form.requirementId || !form.scope || !form.selfTestReport || !form.deployBranch || !form.testerId) {
      toast.error("请填写所有必填字段（标题、关联需求、测试范围、自测报告、部署分支、测试人员）"); return;
    }
    // 从选中的需求中获取projectId，如果用户选了项目则用选中的，否则从需求中取
    const selectedReq = requirements.find(r => String(r.id) === form.requirementId);
    const projectId = form.projectId ? parseInt(form.projectId) : (selectedReq?.projectId || 1);

    submitTestApi.create({
      requirementId: parseInt(form.requirementId),
      projectId: projectId,
      description: `${form.title}\n测试范围: ${form.scope}\n自测报告: ${form.selfTestReport}\n部署分支: ${form.deployBranch}\n指定测试人员: ${userMap[parseInt(form.testerId)] || form.testerId}`
    }).then(() => {
      toast.success("提测申请已提交，等待测试人员审批");
      setShowCreate(false);
      setForm({ title: "", requirementId: "", projectId: "", scope: "", selfTestReport: "", deployBranch: "", testerId: "" });
      fetchRecords();
    }).catch((err: any) => toast.error(err?.message || "提交失败"));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Send className="w-5 h-5 text-[#0088ff]" /> 提测管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">R2规则：提测需附自测报告，测试人员审批后方可进入测试阶段</p>
        </div>
        {hasPermission("submit:create") && (
          <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 发起提测
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="bg-white rounded-xl border border-border/60 p-3 text-center">
            <p className="text-lg font-bold" style={{ color: cfg.color }}>{records.filter(r => r.status === key).length}</p>
            <p className="text-[11px] text-muted-foreground">{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Records */}
      <div className="space-y-2">
        {records.map((record, i) => {
          const status = statusConfig[record.status] || statusConfig.PENDING;
          const submitterName = userMap[record.submitterId] || `用户${record.submitterId}`;
          return (
            <motion.div key={record.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-border/60 p-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <Send className="w-4 h-4 text-[#0088ff] shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{record.description?.split('\n')[0] || record.title || `提测单 #${record.id}`}</span>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>提交人: {submitterName}</span>
                    <span>需求 ID: {record.requirementId}</span>
                    <span>{record.createdAt}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: status.color, color: status.color }}>{status.label}</Badge>
                {hasPermission("submit:approve") && record.status === "PENDING" && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-600"
                      onClick={() => { submitTestApi.approve(record.id).then(() => { toast.success("提测已通过，进入测试阶段"); fetchRecords(); }).catch((e: any) => toast.error(e?.message || "审批失败")); }}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />通过
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500"
                      onClick={() => { submitTestApi.reject(record.id, { reason: "自测报告不完整，请补充" }).then(() => { toast.success("提测已驳回"); fetchRecords(); }).catch((e: any) => toast.error(e?.message || "驳回失败")); }}>
                      <XCircle className="w-3 h-3 mr-1" />驳回
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {records.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">暂无提测记录</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>发起提测申请</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>R2规则：提测必须附带自测报告，需指定测试人员，审批后方可进入正式测试阶段。仅"已开发完成(DEVELOPED)"状态的需求可提测。</span>
            </div>
            <div className="space-y-2">
              <Label>提测标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="如: 用户登录模块提测" />
            </div>
            <div className="space-y-2">
              <Label>关联项目</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({...form, projectId: v, requirementId: ""})}>
                <SelectTrigger><SelectValue placeholder="选择项目（可选，用于过滤需求）" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.projectName || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>关联需求 <span className="text-red-500">*</span></Label>
              <Select value={form.requirementId} onValueChange={(v) => setForm({...form, requirementId: v})}>
                <SelectTrigger><SelectValue placeholder="选择已开发完成的需求" /></SelectTrigger>
                <SelectContent>
                  {filteredRequirements.length > 0 ? filteredRequirements.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.title}
                    </SelectItem>
                  )) : (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">暂无已开发完成的需求</div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">仅显示"已开发完成(DEVELOPED)"状态的需求</p>
            </div>
            <div className="space-y-2">
              <Label>指定测试人员 <span className="text-red-500">*</span></Label>
              <Select value={form.testerId} onValueChange={(v) => setForm({...form, testerId: v})}>
                <SelectTrigger><SelectValue placeholder="选择测试人员" /></SelectTrigger>
                <SelectContent>
                  {testers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.nickname} ({u.roleName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>测试范围 <span className="text-red-500">*</span></Label>
              <Textarea value={form.scope} onChange={(e) => setForm({...form, scope: e.target.value})} placeholder="描述本次提测涉及的功能范围" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>自测报告 <span className="text-red-500">*</span></Label>
              <Textarea value={form.selfTestReport} onChange={(e) => setForm({...form, selfTestReport: e.target.value})}
                placeholder={"描述自测覆盖的场景和结果，如:\n1. 正常登录 - 通过\n2. 密码错误 - 通过\n3. 账号锁定 - 通过"} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>部署分支 <span className="text-red-500">*</span></Label>
              <Input value={form.deployBranch} onChange={(e) => setForm({...form, deployBranch: e.target.value})} placeholder="如: feature/user-login" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">提交提测</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
