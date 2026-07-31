import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { FileText, ArrowLeft, ArrowRight, Plus, ListChecks, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { requirementApi, taskApi, userApi } from "@/services/api";
import { toast } from "sonner";
import { useRole, type RoleType } from "@/contexts/RoleContext";

// 需求状态机（与后端 BizConstants 转移矩阵严格一致）
const statusConfig: Record<string, { label: string; color: string; next: string[] }> = {
  DRAFT: { label: "草稿", color: "#6b7280", next: ["REVIEWING"] },
  REVIEWING: { label: "评审中", color: "#f59e0b", next: ["APPROVED", "REJECTED"] },
  DEVELOPING: { label: "开发中", color: "#8b5cf6", next: ["DEVELOPED"] },
  DEVELOPED: { label: "开发完成", color: "#a855f7", next: ["TESTING"] },
  TESTING: { label: "测试中", color: "#06b6d4", next: ["TESTED", "DEVELOPING"] },
  TESTED: { label: "测试通过", color: "#0ea5e9", next: ["RELEASING", "TESTING"] },
  RELEASING: { label: "发布中", color: "#059669", next: ["CLOSED"] },
  CLOSED: { label: "已关闭", color: "#374151", next: [] },
  CANCELLED: { label: "已取消", color: "#ef4444", next: [] },
};

// 动作语义：REVIEWING=提交评审(走submit-review)、APPROVED/REJECTED=评审(走review)、
// DEVELOPED=标记开发完成、TESTED/RELEASING/CLOSED=受控状态流转
const transitionLabels: Record<string, string> = {
  REVIEWING: "提交评审", APPROVED: "评审通过", REJECTED: "评审驳回",
  DEVELOPED: "标记开发完成", TESTED: "测试通过", RELEASING: "进入发布", CLOSED: "验收上线",
  DEVELOPING: "退回开发", TESTING: "退回测试",
};

// 可作为开发负责人的角色
export default function RequirementDetail() {
  const [, params] = useRoute("/app/requirements/:id");
  const [, setLocation] = useLocation();
  const { hasPermission, role } = useRole();
  const [requirement, setRequirement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [targetStatus, setTargetStatus] = useState("");
  const [showReviewerPick, setShowReviewerPick] = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

  // 拆解任务相关
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    taskName: "", description: "", priority: "P1",
    assigneeId: "", estimatedHours: "", startDate: "", dueDate: "",
  });

  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const reqId = parseInt(params?.id || "0");

  // 统一加载带角色的用户列表（用于下拉过滤 + 姓名映射）
  const ensureUsers = () => {
    if (users.length > 0) return Promise.resolve();
    return userApi.listWithRoles().then((res: any) => {
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.list || res?.data?.records || []);
      setUsers(list);
      const map: Record<string, string> = {};
      list.forEach((u: any) => { map[String(u.id)] = u.nickname || u.username; });
      setUserMap(map);
    }).catch(() => {});
  };

  const loadAll = () => {
    if (!reqId) return;
    ensureUsers();
    requirementApi.detail(reqId).then((res: any) => setRequirement(res.data))
      .catch(() => setRequirement(null)).finally(() => setLoading(false));
    taskApi.list({ requirementId: reqId, pageSize: 100 }).then((res: any) => {
      const list = res?.data?.list || res?.data?.records || res?.data || [];
      setTasks(Array.isArray(list) ? list : []);
    }).catch(() => setTasks([]));
  };

  useEffect(() => { loadAll(); }, [params?.id]);

  // 打开拆解弹窗时拉取可指派成员
  const openBreakdown = () => {
    setShowBreakdown(true);
    ensureUsers();
  };

  // 仅开发角色可被指派为任务负责人
  const devUsers = users.filter((u) => u.roleCode === "dev");
  // 评审人：产品经理，且排除创建人本人
  const reviewerCandidates = users.filter(
    (u) => (u.roleCode === "pm") &&
      String(u.id) !== String(requirement?.createdBy) &&
      String(u.id) !== String(requirement?.ownerId)
  );

  const handleTransition = (nextStatus: string) => {
    // 提交评审：必须选择评审人后调专用 submit-review 接口
    if (nextStatus === "REVIEWING") {
      openReviewerDialog();
      return;
    }
    // 评审通过/驳回：走专用 review 接口
    if (nextStatus === "APPROVED" || nextStatus === "REJECTED") {
      setTargetStatus(nextStatus);
      setShowReview(true);
      return;
    }
    // 标记开发完成走受控正向接口
    if (nextStatus === "DEVELOPED") {
      requirementApi.markDeveloped(reqId).then(() => {
        toast.success("已标记开发完成");
        loadAll();
      }).catch((err: any) => toast.error(err?.message || "操作失败"));
      return;
    }
    // TESTED / RELEASING / CLOSED 等受控状态流转
    requirementApi.changeStatus(reqId, { status: nextStatus, comment: "" }).then((res: any) => {
      toast.success(res?.message || `状态已变更为: ${statusConfig[nextStatus]?.label}`);
      loadAll();
    }).catch((err: any) => toast.error(err?.message || "操作失败"));
  };

  // 打开选择评审人弹窗
  const openReviewerDialog = () => {
    setShowReviewerPick(true);
    ensureUsers();
  };

  // 提交评审：调用专用 submit-review 接口（携带评审人）
  const handleSubmitReview = () => {
    if (selectedReviewers.length === 0) { toast.error("请至少选择一位评审人"); return; }
    setSubmitting(true);
    requirementApi.submitReview(reqId, { reviewerIds: selectedReviewers.map(Number) }).then((res: any) => {
      toast.success(res?.message || "已提交评审");
      setShowReviewerPick(false);
      setSelectedReviewers([]);
      loadAll();
    }).catch((err: any) => toast.error(err?.message || "提交评审失败"))
      .finally(() => setSubmitting(false));
  };

  const handleReviewSubmit = () => {
    if (!reviewComment.trim()) { toast.error("请填写评审意见"); return; }
    if (targetStatus === "REJECTED" && reviewComment.trim().length < 20) {
      toast.error("驳回原因不少于20字"); return;
    }
    const result = targetStatus === "APPROVED" ? "APPROVED" : "REJECTED";
    requirementApi.review(reqId, { result, comment: reviewComment }).then((res: any) => {
      toast.success(res?.message || (result === "APPROVED" ? "评审通过" : "评审驳回"));
      setShowReview(false);
      setReviewComment("");
      loadAll();
    }).catch((err: any) => toast.error(err?.message || "操作失败"));
  };

  const submitTask = () => {
    // 表单关键字段必填校验（标准模板，防止记录不完整）
    if (!taskForm.taskName.trim()) { toast.error("请填写任务名称"); return; }
    if (!taskForm.assigneeId) { toast.error("请指派开发负责人"); return; }
    if (!taskForm.estimatedHours || Number(taskForm.estimatedHours) <= 0) { toast.error("请填写预估工时"); return; }
    if (!taskForm.startDate) { toast.error("请选择开始日期"); return; }
    if (!taskForm.dueDate) { toast.error("请选择截止日期"); return; }
    if (!taskForm.description.trim()) { toast.error("请填写任务描述"); return; }
    setSubmitting(true);
    taskApi.create({
      requirementId: reqId,
      projectId: requirement.projectId,
      sprintId: requirement.sprintId,
      taskName: taskForm.taskName.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      assigneeId: Number(taskForm.assigneeId),
      estimatedHours: Number(taskForm.estimatedHours),
      startDate: taskForm.startDate,
      dueDate: taskForm.dueDate,
    }).then(() => {
      toast.success("任务已创建并通知负责人");
      // 连续拆解：保留弹窗，清空名称/负责人/描述，便于继续添加
      setTaskForm({ ...taskForm, taskName: "", description: "", assigneeId: "", estimatedHours: "" });
      loadAll();
    }).catch((err: any) => toast.error(err?.message || "创建任务失败")).finally(() => setSubmitting(false));
  };

  if (loading || !requirement) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;

  const currentStatus = statusConfig[requirement.status] || statusConfig.DRAFT;
  // 状态流转按钮的角色可见性，与后端 changeStatus 门禁严格对齐（FE-REQ-01）
  // 注意：RoleContext 中开发角色标识为 "developer"
  const transitionRoles: Record<string, RoleType[]> = {
    REVIEWING: ["pm", "sys_admin"],            // 提交评审
    APPROVED: ["pm", "sys_admin"], // 评审通过
    REJECTED: ["pm", "sys_admin"], // 评审驳回
    DEVELOPED: ["developer", "dev", "sys_admin"], // 标记开发完成
    TESTED: ["qa", "sys_admin"],               // 测试通过
    RELEASING: ["pm", "sys_admin"], // 进入发布
    CLOSED: ["pm", "sys_admin"],    // 验收上线
    DEVELOPING: ["qa", "sys_admin"],  // 退回开发（测试退回）
    TESTING: ["pm", "sys_admin"],     // 退回测试（验收退回）
  };
  const nextStatuses = currentStatus.next.filter(
    (ns: string) => !transitionRoles[ns] || transitionRoles[ns].includes(role)
  );
  // 拥有任务创建权限者（产品经理）在评审通过后的开发阶段可拆解任务
  const canBreakdown = hasPermission("task:create") &&
    ["DEVELOPING", "DEVELOPED"].includes(requirement.status);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/app/requirements")} className="rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{requirement.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge style={{ backgroundColor: `${currentStatus.color}15`, color: currentStatus.color }}>
              {currentStatus.label}
            </Badge>
            <span className="text-xs text-muted-foreground">#{requirement.id}</span>
          </div>
        </div>
      </div>

      {/* Status Machine Visualization */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-border/60 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3">状态流转</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {["DRAFT","REVIEWING","DEVELOPING","DEVELOPED","TESTING","TESTED","RELEASING","CLOSED"].map((key, idx, arr) => {
            const cfg = statusConfig[key];
            return (
            <div key={key} className="flex items-center gap-1">
              <div className={`px-2 py-1 rounded text-[10px] font-medium border ${requirement.status === key ? 'ring-2 ring-offset-1' : 'opacity-50'}`}
                style={{ borderColor: cfg.color, color: cfg.color }}>
                {cfg.label}
              </div>
              {idx !== arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
            </div>
          );})}
        </div>
      </motion.div>

      {/* Requirement Details */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-border/60 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">优先级:</span> <span className="font-medium ml-2">{requirement.priority}</span></div>
          <div><span className="text-muted-foreground">负责人:</span> <span className="font-medium ml-2">{requirement.assigneeName || userMap[String(requirement.ownerId)] || requirement.ownerId || "未指定"}</span></div>
          <div><span className="text-muted-foreground">创建人:</span> <span className="font-medium ml-2">{requirement.createdByName || userMap[String(requirement.createdBy)] || requirement.createdBy || "系统"}</span></div>
          <div><span className="text-muted-foreground">期望完成:</span> <span className="font-medium ml-2">{requirement.expectedCompletionDate}</span></div>
        </div>
        <div className="border-t border-border/40 pt-4">
          <h4 className="text-sm font-semibold mb-2">功能描述</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{requirement.description || "暂无描述"}</p>
        </div>
        <div className="border-t border-border/40 pt-4">
          <h4 className="text-sm font-semibold mb-2">验收标准(AC)</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{requirement.acceptanceCriteria || "暂无"}</p>
        </div>
        {requirement.businessValue && (
          <div className="border-t border-border/40 pt-4">
            <h4 className="text-sm font-semibold mb-2">业务价值</h4>
            <p className="text-sm text-muted-foreground">{requirement.businessValue}</p>
          </div>
        )}
      </motion.div>

      {/* 已拆解任务列表 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-border/60 p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-blue-600" />
            开发任务（{tasks.length}）
          </h4>
          {canBreakdown && (
            <Button size="sm" onClick={openBreakdown} className="h-8 text-xs bg-[#0088ff] hover:bg-[#0066cc] text-white">
              <Plus className="w-3 h-3 mr-1" /> 拆解任务
            </Button>
          )}
        </div>
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {canBreakdown ? "尚未拆解任务，点击右上角“拆解任务”开始" : "尚未拆解任务"}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate">{t.taskName}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{t.priority || "P1"}</Badge>
                  <Badge variant="outline" className="text-xs">{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Action Buttons */}
      {nextStatuses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-3 justify-end">
          {nextStatuses.map((ns) => (
            <Button key={ns} onClick={() => handleTransition(ns)}
              className={ns === "REJECTED" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#0088ff] hover:bg-[#0066cc] text-white"}>
              {transitionLabels[ns] || ns}
            </Button>
          ))}
        </motion.div>
      )}

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{targetStatus === "APPROVED" ? "评审通过" : "评审驳回"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              R1规则：创建人不能是唯一评审人，需至少一位非创建人参与评审
            </div>
            <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
              placeholder="请输入评审意见（必填）" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)}>取消</Button>
            <Button onClick={handleReviewSubmit}
              className={targetStatus === "APPROVED" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}>
              确认{targetStatus === "APPROVED" ? "通过" : "驳回"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 选择评审人弹窗（提交评审） */}
      <Dialog open={showReviewerPick} onOpenChange={setShowReviewerPick}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交评审 · 选择评审人</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[55vh] overflow-y-auto">
            <div className="text-xs text-muted-foreground">
              R1规则：创建人不能作为唯一评审人；请选择至少一位非创建人参与评审。
            </div>
            {users.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">加载成员中...</div>
            ) : (
              <div className="space-y-1">
                {reviewerCandidates.length === 0 && (
                  <div className="text-sm text-muted-foreground py-2 text-center">暂无可选评审人（需产品经理且非创建人）</div>
                )}
                {reviewerCandidates.map((u) => {
                  const idStr = String(u.id);
                  const checked = selectedReviewers.includes(idStr);
                  return (
                    <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedReviewers([...selectedReviewers, idStr]);
                          else setSelectedReviewers(selectedReviewers.filter((x) => x !== idStr));
                        }} />
                      <span>{u.nickname || u.username}</span>
                      {u.roleName && <span className="text-xs text-muted-foreground">({u.roleName})</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewerPick(false)}>取消</Button>
            <Button disabled={submitting} onClick={handleSubmitReview} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">
              确认提交评审
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拆解任务表单弹窗（标准模板，关键字段必填） */}
      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-blue-600" /> 拆解开发任务
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>任务名称 <span className="text-red-500">*</span></Label>
              <Input value={taskForm.taskName} onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                placeholder="如：完成积分兑换接口开发" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>开发负责人 <span className="text-red-500">*</span></Label>
                <select className="w-full h-9 border rounded-md px-2 text-sm"
                  value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                  <option value="">请选择</option>
                  {devUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.nickname || u.username}（{u.roleName || "开发"}）</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>优先级 <span className="text-red-500">*</span></Label>
                <select className="w-full h-9 border rounded-md px-2 text-sm"
                  value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>预估工时(h) <span className="text-red-500">*</span></Label>
                <Input type="number" value={taskForm.estimatedHours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })} placeholder="如 8" />
              </div>
              <div>
                <Label>开始日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label>截止日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>任务描述 <span className="text-red-500">*</span></Label>
              <Textarea rows={3} value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="清晰描述任务范围、交付物与技术要点" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBreakdown(false)}>关闭</Button>
            <Button disabled={submitting} onClick={submitTask} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">
              <Plus className="w-4 h-4 mr-1" /> 创建并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
