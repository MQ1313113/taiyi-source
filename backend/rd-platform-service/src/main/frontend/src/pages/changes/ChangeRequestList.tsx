import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GitBranch, Plus, Search, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { changeRequestApi, requirementApi, projectApi } from "@/services/api";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待审批(第一重)", color: "#f59e0b" },
  TL_APPROVED: { label: "待复审(第二重)", color: "#8b5cf6" },
  APPROVED: { label: "已批准", color: "#10b981" },
  REJECTED: { label: "已拒绝", color: "#ef4444" },
  IMPLEMENTING: { label: "实施中", color: "#0088ff" },
  COMPLETED: { label: "已完成", color: "#374151" },
};

const impactConfig: Record<string, { label: string; color: string }> = {
  HIGH: { label: "高影响", color: "#ef4444" },
  MEDIUM: { label: "中影响", color: "#f59e0b" },
  LOW: { label: "低影响", color: "#10b981" },
};

export default function ChangeRequestList() {
  const { hasPermission } = useRole();
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", reason: "", impact: "MEDIUM", impactAnalysis: "",
    requirementId: "", projectId: "", type: "SCOPE",
  });

  const [requirements, setRequirements] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const fetchChanges = () => {
    setLoading(true);
    changeRequestApi.list({ page: 1, size: 50 }).then((res: any) => {
      setChanges(res.data?.records || res.data || []);
    }).catch(() => {
      setChanges([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChanges();
    requirementApi.list({ page: 1, size: 100 }).then((res: any) => {
      setRequirements(res.data?.records || res.data || []);
    }).catch(() => {});
    projectApi.list({ page: 1, size: 50 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  // 当选择项目时，过滤该项目下的需求
  const filteredRequirements = form.projectId
    ? requirements.filter((r: any) => String(r.projectId) === form.projectId)
    : requirements;

  const handleCreate = () => {
    if (!form.title || !form.reason || !form.impactAnalysis || !form.requirementId || !form.projectId) {
      toast.error("请填写所有必填字段（包括关联项目和需求）"); return;
    }
    changeRequestApi.create({
      requirementId: parseInt(form.requirementId),
      projectId: parseInt(form.projectId),
      changeContent: form.title,
      changeReason: form.reason,
      impactScope: form.impactAnalysis
    }).then(() => {
      toast.success("变更申请已提交，进入双重审批流程");
      setShowCreate(false);
      setForm({ title: "", reason: "", impact: "MEDIUM", impactAnalysis: "", requirementId: "", projectId: "", type: "SCOPE" });
      fetchChanges();
    }).catch((err: any) => toast.error(err?.message || "提交失败"));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#0088ff]" /> 变更管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">R4规则：变更需产品经理+需求负责人双重审批确认</p>
        </div>
        {hasPermission("change:create") && (
          <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 发起变更
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="bg-white rounded-xl border border-border/60 p-3 text-center">
            <p className="text-lg font-bold" style={{ color: cfg.color }}>{changes.filter(c => c.status === key).length}</p>
            <p className="text-[11px] text-muted-foreground">{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* 审批流程说明 */}
      <div className="text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
        <span>
          <strong>双重审批流程：</strong>
          待审批(第一重) → 产品经理审批通过 → 待复审(第二重) → 需求负责人复审通过 → 已批准。
          申请人不能审批自己的变更，两重审批人不能为同一人。
        </span>
      </div>

      {/* Change List */}
      <div className="space-y-2">
        {changes.map((change, i) => {
          const status = statusConfig[change.status] || statusConfig.PENDING;
          const impact = impactConfig[change.impact || change.impactScope] || impactConfig.MEDIUM;
          // 可审批的状态：PENDING（第一重）或 TL_APPROVED（第二重）
          const canApprove = hasPermission("change:approve") && (change.status === "PENDING" || change.status === "TL_APPROVED");
          return (
            <motion.div key={change.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-border/60 p-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <GitBranch className="w-4 h-4 text-[#0088ff] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{change.changeContent || change.title}</span>
                    <Badge className="text-[9px]" style={{ backgroundColor: `${impact.color}15`, color: impact.color }}>{impact.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>原因: {change.changeReason || change.reason}</span>
                    <span>{change.createdAt}</span>
                    {change.status === "TL_APPROVED" && (
                      <span className="text-purple-600 font-medium">第一重已通过，等待需求负责人复审</span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: status.color, color: status.color }}>{status.label}</Badge>
                {canApprove && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-600"
                      onClick={() => {
                        changeRequestApi.approve(change.id).then((res: any) => {
                          toast.success(res?.message || "审批操作成功");
                          fetchChanges();
                        }).catch((e: any) => toast.error(e?.message || "审批失败"));
                      }}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {change.status === "PENDING" ? "第一重批准" : "复审通过"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500"
                      onClick={() => { changeRequestApi.reject(change.id, { reason: "不符合当前迭代计划" }).then(() => { toast.success("变更已驳回"); fetchChanges(); }).catch((e: any) => toast.error(e?.message || "驳回失败")); }}>
                      <XCircle className="w-3 h-3 mr-1" />驳回
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {changes.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">暂无变更记录</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>发起变更申请</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>R4规则：变更需经产品经理+需求负责人双重审批后方可实施</span>
            </div>
            <div className="space-y-2">
              <Label>变更标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="简明描述变更内容" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>变更类型 <span className="text-red-500">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCOPE">范围变更</SelectItem>
                    <SelectItem value="REQUIREMENT">需求变更</SelectItem>
                    <SelectItem value="SCHEDULE">进度变更</SelectItem>
                    <SelectItem value="TECHNICAL">技术变更</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>影响程度 <span className="text-red-500">*</span></Label>
                <Select value={form.impact} onValueChange={(v) => setForm({...form, impact: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(impactConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>关联项目 <span className="text-red-500">*</span></Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({...form, projectId: v, requirementId: ""})}>
                <SelectTrigger><SelectValue placeholder="选择项目" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="选择关联需求" /></SelectTrigger>
                <SelectContent>
                  {filteredRequirements.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>变更原因 <span className="text-red-500">*</span></Label>
              <Textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} placeholder="详细说明为什么需要变更" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>影响分析 <span className="text-red-500">*</span></Label>
              <Textarea value={form.impactAnalysis} onChange={(e) => setForm({...form, impactAnalysis: e.target.value})}
                placeholder="分析变更对进度、成本、质量的影响" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">提交变更</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
