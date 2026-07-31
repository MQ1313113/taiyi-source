/**
 * 太一研发管理平台 - 通用弹窗组件库
 * 设计风格：白玉晨曦（Dawn Grid）
 * 包含：工时填报、代码提交、任务状态变更、分派任务、评审意见、测试执行、Bug验证等Dialog
 */
import { useState, useEffect } from "react";
import {
  userApi,
  taskApi as taskApiSvc,
  bugApi as bugApiSvc,
  techDebtApi,
  changeRequestApi,
  testCaseApi,
  submitTestApi,
  projectApi,
  requirementApi,
} from "@/services/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Clock, GitCommit, Play, Send, Users, CheckCircle2, XCircle,
  AlertTriangle, FileText, Code2, TestTube2, Bug, Calendar,
  Timer, Scissors, UserPlus, ThumbsUp, ThumbsDown, Loader2, Plus
} from "lucide-react";
import { toast } from "sonner";

// ===================== 工时填报弹窗 =====================
interface LogHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogHoursDialog({ open, onOpenChange }: LogHoursDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    task: "",
    hours: "",
    date: new Date().toISOString().split("T")[0],
    type: "",
    description: "",
  });
  const [taskItems, setTaskItems] = useState<any[]>([]);
  useEffect(() => {
    if (open) {
      taskApiSvc.list({ page: 1, size: 50 }).then((taskRes: any) => {
        const tasks = (taskRes.data?.records || taskRes.data || []).map((t: any) => ({ id: String(t.id), title: t.title || t.taskName || '' }));
        setTaskItems(tasks);
      }).catch(() => setTaskItems([]));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData.task || !formData.hours || !formData.type) {
      toast.error("请填写必填项", { description: "任务、工时和工作类型为必填" });
      return;
    }
    setSubmitting(true);
    try {
      await taskApiSvc.logHours(Number(formData.task), { actualHours: Number(formData.hours) });
      toast.success("工时已提交", {
        description: `${formData.date} · ${formData.hours}小时`,
      });
      onOpenChange(false);
      setFormData({ task: "", hours: "", date: new Date().toISOString().split("T")[0], type: "", description: "" });
    } catch (e: any) {
      toast.error(e?.message || "工时提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#0088ff]/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#0088ff]" />
            </div>
            填写工时
          </DialogTitle>
          <DialogDescription>
            记录今日工作内容和耗时，数据将同步至效能度量模块
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 关联任务 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              关联任务 <span className="text-[#ef4444]">*</span>
            </Label>
            <Select value={formData.task} onValueChange={(v) => setFormData({ ...formData, task: v })}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="选择关联任务" />
              </SelectTrigger>
              <SelectContent>
                {taskItems.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>{item.id} {item.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* 工时 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                工时（小时）<span className="text-[#ef4444]">*</span>
              </Label>
              <Input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                placeholder="如: 4"
                className="rounded-xl h-10"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              />
            </div>
            {/* 日期 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">日期</Label>
              <Input
                type="date"
                className="rounded-xl h-10"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            {/* 工作类型 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                工作类型 <span className="text-[#ef4444]">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">开发编码</SelectItem>
                  <SelectItem value="debug">调试修复</SelectItem>
                  <SelectItem value="review">代码评审</SelectItem>
                  <SelectItem value="meeting">会议沟通</SelectItem>
                  <SelectItem value="document">文档撰写</SelectItem>
                  <SelectItem value="research">技术调研</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 工作描述 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">工作描述</Label>
            <Textarea
              placeholder="简要描述今日完成的工作内容..."
              className="rounded-xl resize-none h-20"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#0088ff] hover:bg-[#0077e6] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交工时
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 代码提交弹窗 =====================
interface CodeCommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CodeCommitDialog({ open, onOpenChange }: CodeCommitDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    relatedId: "",
    branch: "",
    commitMsg: "",
    reviewers: "",
    type: "",
  });
  const [reviewerList, setReviewerList] = useState<any[]>([]);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  useEffect(() => {
    if (open) {
      userApi.listWithRoles().then((res: any) => {
        const users = res.data || [];
        setReviewerList(users.filter((u: any) => u.roleCode === 'dev' || u.roleCode === 'pm'));
      }).catch(() => {});
      Promise.all([
        taskApiSvc.list({ page: 1, size: 20 }).catch(() => ({ data: { records: [] } })),
        bugApiSvc.list({ page: 1, size: 20 }).catch(() => ({ data: { records: [] } })),
      ]).then(([taskRes, bugRes]) => {
        const tasks = (taskRes.data?.records || taskRes.data || []).map((t: any) => ({ id: `T-${t.id}`, title: t.title || t.taskName || '' }));
        const bugs = (bugRes.data?.records || bugRes.data || []).map((b: any) => ({ id: `BUG-${b.id}`, title: b.title || '' }));
        setRelatedItems([...tasks.slice(0, 5), ...bugs.slice(0, 5)]);
      });
    }
  }, [open]);

  const handleSubmit = () => {
    if (!formData.relatedId || !formData.branch || !formData.commitMsg || !formData.type) {
      toast.error("请填写必填项", { description: "关联项、分支、提交信息和类型为必填" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("代码提交记录已关联", {
        description: `${formData.type}: ${formData.commitMsg.slice(0, 30)}...`,
      });
      onOpenChange(false);
      setFormData({ relatedId: "", branch: "", commitMsg: "", reviewers: "", type: "" });
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center">
              <GitCommit className="w-4 h-4 text-[#8b5cf6]" />
            </div>
            代码提交
          </DialogTitle>
          <DialogDescription>
            关联代码提交到任务或Bug，便于追踪代码变更
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {/* 关联项 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                关联任务/Bug <span className="text-[#ef4444]">*</span>
              </Label>
              <Select value={formData.relatedId} onValueChange={(v) => setFormData({ ...formData, relatedId: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择关联项" />
                </SelectTrigger>
                <SelectContent>
                  {relatedItems.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>{item.id} {item.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 提交类型 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                提交类型 <span className="text-[#ef4444]">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feat">feat: 新功能</SelectItem>
                  <SelectItem value="fix">fix: Bug修复</SelectItem>
                  <SelectItem value="refactor">refactor: 重构</SelectItem>
                  <SelectItem value="perf">perf: 性能优化</SelectItem>
                  <SelectItem value="test">test: 测试</SelectItem>
                  <SelectItem value="docs">docs: 文档</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 分支 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              分支名称 <span className="text-[#ef4444]">*</span>
            </Label>
            <Input
              placeholder="如: feature/payment-callback"
              className="rounded-xl h-10 font-mono text-sm"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
            />
          </div>

          {/* Commit Message */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              提交信息 <span className="text-[#ef4444]">*</span>
            </Label>
            <Textarea
              placeholder="feat(payment): 实现微信支付回调接口..."
              className="rounded-xl resize-none h-20 font-mono text-sm"
              value={formData.commitMsg}
              onChange={(e) => setFormData({ ...formData, commitMsg: e.target.value })}
            />
          </div>

          {/* Code Reviewer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">代码评审人</Label>
              <Select value={formData.reviewers} onValueChange={(v) => setFormData({ ...formData, reviewers: v })}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="选择评审人（可选）" />
              </SelectTrigger>
              <SelectContent>
                {reviewerList.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.nickname || u.username}（{u.roleName || u.roleCode}）</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Git Status */}
          <div className="p-3 rounded-xl bg-[#8b5cf6]/5 border border-[#8b5cf6]/10">
            <div className="flex items-center gap-2 text-sm">
              <Code2 className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-muted-foreground">最近提交:</span>
              <span className="font-mono text-xs">a3f2c1d</span>
              <span className="text-xs text-muted-foreground">· 2小时前</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交记录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 任务状态变更确认弹窗 =====================
interface TaskStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  currentStatus: string;
  targetStatus: string;
  action: "accept" | "selftest" | "submit" | "start_fix" | "mark_fixed";
}

export function TaskStatusDialog({ open, onOpenChange, taskId, taskTitle, currentStatus, targetStatus, action }: TaskStatusDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [remark, setRemark] = useState("");

  const actionConfig = {
    accept: { label: "接受任务", color: "#0088ff", icon: Play, desc: "确认接受此任务并开始开发" },
    selftest: { label: "进入自测", color: "#8b5cf6", icon: Code2, desc: "标记开发完成，进入自测阶段" },
    submit: { label: "提交提测", color: "#22c55e", icon: Send, desc: "自测通过，提交给QA进行测试" },
    start_fix: { label: "开始修复", color: "#f97316", icon: Bug, desc: "确认开始修复此Bug" },
    mark_fixed: { label: "标记修复", color: "#22c55e", icon: CheckCircle2, desc: "Bug已修复，等待QA验证" },
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  const handleConfirm = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(config.label, {
        description: `${taskId} 状态变更: ${currentStatus} → ${targetStatus}`,
      });
      onOpenChange(false);
      setRemark("");
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
              <Icon className="w-4 h-4" style={{ color: config.color }} />
            </div>
            {config.label}
          </DialogTitle>
          <DialogDescription>{config.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Info */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#0088ff]">{taskId}</span>
            </div>
            <p className="text-sm font-medium">{taskTitle}</p>
          </div>

          {/* Status Flow */}
          <div className="flex items-center justify-center gap-3 py-2">
            <Badge variant="outline" className="text-xs">{currentStatus}</Badge>
            <div className="flex items-center gap-1">
              <div className="w-6 h-[2px] rounded" style={{ backgroundColor: config.color }} />
              <div className="w-0 h-0 border-l-[6px] border-y-[4px] border-y-transparent" style={{ borderLeftColor: config.color }} />
            </div>
            <Badge className="text-xs border-0 text-white" style={{ backgroundColor: config.color }}>
              {targetStatus}
            </Badge>
          </div>

          {/* Remark */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">备注说明（可选）</Label>
            <Textarea
              placeholder="如有需要补充的信息请在此填写..."
              className="rounded-xl resize-none h-16"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl text-white"
            style={{ backgroundColor: config.color }}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            确认{config.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 分派任务弹窗 =====================
interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  taskTitle?: string;
}

export function AssignTaskDialog({ open, onOpenChange, taskId = "", taskTitle = "" }: AssignTaskDialogProps) {
  const [selectedMember, setSelectedMember] = useState("");
  const [priority, setPriority] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  useEffect(() => {
    if (open) {
      // 负责人只列开发人员
      userApi.listWithRoles().then((res: any) => {
        const users = (res.data || []).filter((u: any) => u.roleCode === 'dev');
        setTeamMembers(users.map((u: any) => ({
          id: String(u.id),
          name: u.nickname || u.username,
          role: u.roleName || "开发人员",
          avatar: (u.nickname || u.username || "").charAt(0),
        })));
      }).catch(() => {});
      // 无 taskId 时加载任务供选择
      if (!taskId) {
        taskApiSvc.list({ page: 1, size: 100 }).then((res: any) => {
          const list = res?.data?.records || res?.data?.list || res?.data || [];
          setTaskList(Array.isArray(list) ? list : []);
        }).catch(() => setTaskList([]));
      }
      setSelectedTaskId(taskId ? String(taskId) : "");
      setSelectedMember("");
      setPriority("");
      setDeadline("");
    }
  }, [open, taskId]);

  const effectiveTaskId = taskId ? String(taskId) : selectedTaskId;
  const currentTask = taskList.find((t: any) => String(t.id) === effectiveTaskId);

  const handleSubmit = async () => {
    if (!effectiveTaskId) { toast.error("请选择要分派的任务"); return; }
    if (!selectedMember) { toast.error("请选择负责人"); return; }
    setSubmitting(true);
    try {
      await taskApiSvc.update(Number(effectiveTaskId), {
        taskName: currentTask?.taskName || taskTitle || "任务",
        description: currentTask?.description,
        priority: priority || currentTask?.priority,
        dueDate: deadline || currentTask?.dueDate,
        assigneeId: Number(selectedMember),
      });
      const member = teamMembers.find((m) => m.id === selectedMember);
      toast.success("任务已分派", { description: `已分派给 ${member?.name}` });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "分派任务失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#f97316]/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[#f97316]" />
            </div>
            分派任务
          </DialogTitle>
          <DialogDescription>
            选择开发负责人并分派任务
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Info / Selection */}
          {taskId ? (
            <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
              <span className="text-sm font-medium">{taskTitle || currentTask?.taskName}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">选择任务 <span className="text-[#ef4444]">*</span></Label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择要分派的任务" />
                </SelectTrigger>
                <SelectContent>
                  {taskList.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">暂无任务</div>}
                  {taskList.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.taskName || t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Team Members */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              选择负责人 <span className="text-[#ef4444]">*</span>
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedMember === member.id
                      ? "border-[#0088ff] bg-[#0088ff]/5 shadow-sm"
                      : "border-border/60 hover:border-[#0088ff]/30"
                  }`}
                  onClick={() => setSelectedMember(member.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0088ff]/20 to-[#0088ff]/5 flex items-center justify-center">
                    <span className="text-xs font-medium text-[#0088ff]">{member.avatar}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{member.name}</span>
                      <Badge variant="outline" className="text-[10px] h-4">{member.role}</Badge>
                    </div>
                  </div>
                  {selectedMember === member.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#0088ff]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">优先级</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 - 紧急</SelectItem>
                  <SelectItem value="P1">P1 - 高</SelectItem>
                  <SelectItem value="P2">P2 - 中</SelectItem>
                  <SelectItem value="P3">P3 - 低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Deadline */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">截止日期</Label>
              <Input
                type="date"
                className="rounded-xl h-10"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#ff5500] hover:bg-[#e64d00] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            确认分派
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 评审意见弹窗 =====================
interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: string;
  itemTitle?: string;
  reviewType?: "需求评审" | "技术评审" | "变更审批";
}

export function ReviewDialog({ open, onOpenChange, itemId = "REQ-048", itemTitle = "订单退款流程优化", reviewType = "技术评审" }: ReviewDialogProps) {
  const [result, setResult] = useState<"approve" | "reject" | "">("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!result || !comment) {
      toast.error("请选择评审结果并填写意见");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (result === "approve") {
        toast.success(`${reviewType}通过`, { description: `${itemId} ${itemTitle} 已通过评审` });
      } else {
        toast.error(`${reviewType}驳回`, { description: `${itemId} ${itemTitle} 已驳回，请修改后重新提交` });
      }
      onOpenChange(false);
      setResult("");
      setComment("");
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#0088ff]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#0088ff]" />
            </div>
            {reviewType}
          </DialogTitle>
          <DialogDescription>
            请对 {itemId} 进行评审并填写意见
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Info */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#0088ff]">{itemId}</span>
              <Badge variant="secondary" className="text-[10px]">{reviewType}</Badge>
            </div>
            <p className="text-sm font-medium">{itemTitle}</p>
          </div>

          {/* Review Result */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              评审结果 <span className="text-[#ef4444]">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  result === "approve"
                    ? "border-[#22c55e] bg-[#22c55e]/5"
                    : "border-border/60 hover:border-[#22c55e]/30"
                }`}
                onClick={() => setResult("approve")}
              >
                <ThumbsUp className={`w-5 h-5 ${result === "approve" ? "text-[#22c55e]" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${result === "approve" ? "text-[#22c55e]" : ""}`}>通过</span>
              </div>
              <div
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  result === "reject"
                    ? "border-[#ef4444] bg-[#ef4444]/5"
                    : "border-border/60 hover:border-[#ef4444]/30"
                }`}
                onClick={() => setResult("reject")}
              >
                <ThumbsDown className={`w-5 h-5 ${result === "reject" ? "text-[#ef4444]" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${result === "reject" ? "text-[#ef4444]" : ""}`}>驳回</span>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              评审意见 <span className="text-[#ef4444]">*</span>
            </Label>
            <Textarea
              placeholder={result === "reject" ? "请说明驳回原因和修改建议..." : "请填写评审意见..."}
              className="rounded-xl resize-none h-24"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className={`rounded-xl text-white ${
              result === "approve" ? "bg-[#22c55e] hover:bg-[#16a34a]" :
              result === "reject" ? "bg-[#ef4444] hover:bg-[#dc2626]" :
              "bg-[#0088ff] hover:bg-[#0077e6]"
            }`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交评审
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 测试执行弹窗 =====================
interface TestExecuteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestExecuteDialog({ open, onOpenChange }: TestExecuteDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [execStatus, setExecStatus] = useState<string>("");
  const [actualResult, setActualResult] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      testCaseApi.list({ pageSize: 100 }).then((res: any) => {
        const list = res?.data?.records || res?.data?.list || res?.data || [];
        setTestCases(Array.isArray(list) ? list : []);
      }).catch(() => setTestCases([]));
      setSelectedId(""); setExecStatus(""); setActualResult(""); setEvidenceUrl("");
    }
  }, [open]);

  const selectedCase = testCases.find((t: any) => String(t.id) === selectedId);
  const isP0P1 = selectedCase && (selectedCase.priority === "P0" || selectedCase.priority === "P1");

  const handleSubmitAll = async () => {
    if (!selectedId) { toast.error("请选择要执行的用例"); return; }
    if (!execStatus) { toast.error("请选择执行结果"); return; }
    if (actualResult.trim().length < 10) { toast.error("实际结果必填且不少于10个字"); return; }
    if (isP0P1 && !evidenceUrl.trim()) { toast.error("P0/P1用例执行必须上传证据(截图/日志URL)"); return; }
    setSubmitting(true);
    try {
      await testCaseApi.execute(Number(selectedId), {
        executionStatus: execStatus,
        actualResult: actualResult.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
      });
      toast.success("执行结果已记录");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "执行结果提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl border-border/60 shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
              <TestTube2 className="w-4 h-4 text-[#22c55e]" />
            </div>
            执行测试
          </DialogTitle>
          <DialogDescription>
            选择用例并记录真实执行结果（实际结果≥1０字，P0/P1需证据）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">选择测试用例 <span className="text-[#ef4444]">*</span></Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="选择要执行的用例" />
              </SelectTrigger>
              <SelectContent>
                {testCases.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">暂无测试用例</div>
                )}
                {testCases.map((tc: any) => (
                  <SelectItem key={tc.id} value={String(tc.id)}>[{tc.priority}] {tc.caseName || tc.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">执行结果 <span className="text-[#ef4444]">*</span></Label>
            <Select value={execStatus} onValueChange={setExecStatus}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="选择执行结果" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PASSED">通过</SelectItem>
                <SelectItem value="FAILED">失败</SelectItem>
                <SelectItem value="BLOCKED">阻塞</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">实际结果 <span className="text-[#ef4444]">*</span></Label>
            <Textarea
              placeholder="详述实际执行结果（不少于10个字）..."
              className="rounded-xl resize-none h-20"
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              执行证据URL {isP0P1 && <span className="text-[#ef4444]">*</span>}
              {isP0P1 && <span className="text-xs text-muted-foreground ml-1">(P0/P1必填)</span>}
            </Label>
            <Input
              placeholder="截图或日志链接..."
              className="rounded-xl h-10"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white"
            onClick={handleSubmitAll}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交结果
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== Bug验证弹窗 =====================
interface BugVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bugId?: string;
  bugTitle?: string;
}

export function BugVerifyDialog({ open, onOpenChange, bugId = "BUG-0234", bugTitle = "支付成功后订单状态未更新" }: BugVerifyDialogProps) {
  const [result, setResult] = useState<"pass" | "reject" | "">("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 从 bugId 中提取数字ID（兼容 "BUG-123" 与 "123"）
  const numericBugId = Number(String(bugId).replace(/[^0-9]/g, ""));

  const handleSubmit = async () => {
    if (!result || !comment.trim()) {
      toast.error("请选择验证结果并填写说明");
      return;
    }
    if (!numericBugId) { toast.error("缺陷ID无效"); return; }
    setSubmitting(true);
    try {
      // 验证通过 -> VERIFIED；打回 -> REOPENED
      await bugApiSvc.changeStatus(numericBugId, { status: result === "pass" ? "VERIFIED" : "REOPENED" });
      if (result === "pass") {
        toast.success("Bug验证通过", { description: `缺陷已标记为已验证` });
      } else {
        toast.success("已打回重新修复", { description: `缺陷已重新打开` });
      }
      onOpenChange(false);
      setResult("");
      setComment("");
    } catch (e: any) {
      toast.error(e?.message || "验证提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
              <Bug className="w-4 h-4 text-[#f59e0b]" />
            </div>
            Bug验证
          </DialogTitle>
          <DialogDescription>
            验证 {bugId} 的修复结果
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Bug Info */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#ef4444]">{bugId}</span>
              <Badge variant="secondary" className="text-[10px]">严重</Badge>
            </div>
            <p className="text-sm font-medium">{bugTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">修复人: - · 修复时间: -</p>
          </div>

          {/* Verification Result */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              验证结果 <span className="text-[#ef4444]">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  result === "pass"
                    ? "border-[#22c55e] bg-[#22c55e]/5"
                    : "border-border/60 hover:border-[#22c55e]/30"
                }`}
                onClick={() => setResult("pass")}
              >
                <CheckCircle2 className={`w-5 h-5 ${result === "pass" ? "text-[#22c55e]" : "text-muted-foreground"}`} />
                <div>
                  <span className={`text-sm font-medium ${result === "pass" ? "text-[#22c55e]" : ""}`}>验证通过</span>
                  <p className="text-[10px] text-muted-foreground">Bug已修复，关闭</p>
                </div>
              </div>
              <div
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  result === "reject"
                    ? "border-[#ef4444] bg-[#ef4444]/5"
                    : "border-border/60 hover:border-[#ef4444]/30"
                }`}
                onClick={() => setResult("reject")}
              >
                <XCircle className={`w-5 h-5 ${result === "reject" ? "text-[#ef4444]" : "text-muted-foreground"}`} />
                <div>
                  <span className={`text-sm font-medium ${result === "reject" ? "text-[#ef4444]" : ""}`}>打回修复</span>
                  <p className="text-[10px] text-muted-foreground">未修复，重新开发</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              验证说明 <span className="text-[#ef4444]">*</span>
            </Label>
            <Textarea
              placeholder={result === "reject" ? "请描述未通过原因和复现步骤..." : "请描述验证过程和结果..."}
              className="rounded-xl resize-none h-20"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Environment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">验证环境</Label>
            <Select defaultValue="staging">
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staging">预发布环境 (staging)</SelectItem>
                <SelectItem value="dev">开发环境 (dev)</SelectItem>
                <SelectItem value="production">生产环境 (production)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className={`rounded-xl text-white ${
              result === "pass" ? "bg-[#22c55e] hover:bg-[#16a34a]" :
              result === "reject" ? "bg-[#ef4444] hover:bg-[#dc2626]" :
              "bg-[#0088ff] hover:bg-[#0077e6]"
            }`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交验证
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 任务拆解弹窗 =====================
interface SplitTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reqId?: string;
  reqTitle?: string;
}

export function SplitTaskDialog({ open, onOpenChange, reqId = "", reqTitle = "" }: SplitTaskDialogProps) {
  const [tasks, setTasks] = useState([
    { title: "", assignee: "", hours: "", dueDate: "" },
    { title: "", assignee: "", hours: "", dueDate: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>("");

  useEffect(() => {
    if (open) {
      // 只列开发人员（任务必须指派给 dev）
      userApi.listWithRoles().then((res: any) => {
        const users = res.data || [];
        setDevelopers(users.filter((u: any) => u.roleCode === 'dev'));
      }).catch(() => {});
      // 加载可拆解的需求（开发中/评审通过等）
      requirementApi.list({ page: 1, size: 100 }).then((res: any) => {
        const list = res?.data?.records || res?.data?.list || res?.data || [];
        setReqs(Array.isArray(list) ? list : []);
      }).catch(() => setReqs([]));
      setSelectedReqId(reqId ? String(reqId) : "");
      setTasks([{ title: "", assignee: "", hours: "", dueDate: "" }, { title: "", assignee: "", hours: "", dueDate: "" }]);
    }
  }, [open, reqId]);

  const effectiveReqId = reqId ? String(reqId) : selectedReqId;
  const selectedReq = reqs.find((r: any) => String(r.id) === effectiveReqId);

  const addTask = () => {
    setTasks([...tasks, { title: "", assignee: "", hours: "", dueDate: "" }]);
  };

  const updateTask = (index: number, field: string, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const handleSubmit = async () => {
    if (!effectiveReqId) { toast.error("请选择要拆解的需求"); return; }
    if (!selectedReq?.projectId) { toast.error("该需求缺少所属项目信息，无法拆解"); return; }
    const filledTasks = tasks.filter((t) => t.title.trim());
    if (filledTasks.length === 0) { toast.error("请至少填写一个子任务"); return; }
    for (const t of filledTasks) {
      if (!t.assignee) { toast.error(`任务「${t.title}」未指派开发`); return; }
      if (!t.dueDate) { toast.error(`任务「${t.title}」未填截止日期`); return; }
    }
    setSubmitting(true);
    try {
      for (const t of filledTasks) {
        await taskApiSvc.create({
          requirementId: Number(effectiveReqId),
          projectId: Number(selectedReq.projectId),
          sprintId: selectedReq.sprintId || undefined,
          taskName: t.title.trim(),
          assigneeId: Number(t.assignee),
          estimatedHours: t.hours ? Number(t.hours) : undefined,
          dueDate: t.dueDate,
        });
      }
      toast.success("任务拆解完成", { description: `已创建 ${filledTasks.length} 个子任务` });
      onOpenChange(false);
      setTasks([{ title: "", assignee: "", hours: "", dueDate: "" }, { title: "", assignee: "", hours: "", dueDate: "" }]);
    } catch (e: any) {
      toast.error(e?.message || "创建任务失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] rounded-2xl border-border/60 shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#8b5cf6]" />
            </div>
            任务拆解
          </DialogTitle>
          <DialogDescription>
            将需求拆解为可执行的开发任务（真实创建）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Requirement Info / Selection */}
          {reqId ? (
            <div className="p-3 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{reqTitle || selectedReq?.title}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">选择需求 <span className="text-[#ef4444]">*</span></Label>
              <Select value={selectedReqId} onValueChange={setSelectedReqId}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择要拆解的需求" />
                </SelectTrigger>
                <SelectContent>
                  {reqs.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">暂无需求</div>}
                  {reqs.map((r: any) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sub Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">子任务列表</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#0088ff]" onClick={addTask}>
                <Plus className="w-3 h-3 mr-1" />添加任务
              </Button>
            </div>
            {tasks.map((task, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-border/60">
                <span className="col-span-1 text-xs text-muted-foreground text-center">{index + 1}</span>
                <Input
                  placeholder="任务标题"
                  className="col-span-4 rounded-lg h-8 text-sm"
                  value={task.title}
                  onChange={(e) => updateTask(index, "title", e.target.value)}
                />
                <Select value={task.assignee} onValueChange={(v) => updateTask(index, "assignee", v)}>
                  <SelectTrigger className="col-span-3 rounded-lg h-8 text-xs">
                    <SelectValue placeholder="开发" />
                  </SelectTrigger>
                  <SelectContent>
                    {developers.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.nickname || u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="工时"
                  type="number"
                  className="col-span-2 rounded-lg h-8 text-xs"
                  value={task.hours}
                  onChange={(e) => updateTask(index, "hours", e.target.value)}
                />
                <Input
                  type="date"
                  className="col-span-2 rounded-lg h-8 text-[10px]"
                  value={task.dueDate}
                  onChange={(e) => updateTask(index, "dueDate", e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="p-3 rounded-xl bg-[#8b5cf6]/5 border border-[#8b5cf6]/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">预估总工时:</span>
              <span className="font-medium text-[#8b5cf6]">
                {tasks.reduce((sum, t) => sum + (Number(t.hours) || 0), 0)} 小时
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            确认拆解
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 新建技术债务弹窗 =====================
interface CreateDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDebtDialog({ open, onOpenChange }: CreateDebtDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    type: "",
    severity: "",
    module: "",
    description: "",
  });
  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => {
    if (open) {
      projectApi.list({ pageSize: 100 }).then((res: any) => {
        const list = res?.data?.records || res?.data?.list || res?.data || [];
        setProjects(Array.isArray(list) ? list : []);
      }).catch(() => setProjects([]));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData.projectId || !formData.title || !formData.type || !formData.severity || !formData.description.trim()) {
      toast.error("请填写必填项", { description: "所属项目、标题、类型、风险等级、描述为必填" });
      return;
    }
    setSubmitting(true);
    try {
      await techDebtApi.create({
        projectId: Number(formData.projectId),
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        riskLevel: formData.severity,
      });
      toast.success("技术债务已创建", { description: formData.title });
      onOpenChange(false);
      setFormData({ projectId: "", title: "", type: "", severity: "", module: "", description: "" });
    } catch (e: any) {
      toast.error(e?.message || "创建技术债务失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            </div>
            新建技术债务
          </DialogTitle>
          <DialogDescription>
            记录需要后续处理的技术债务项
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              所属项目 <span className="text-[#ef4444]">*</span>
            </Label>
            <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="选择所属项目" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.projectName || p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              标题 <span className="text-[#ef4444]">*</span>
            </Label>
            <Input
              placeholder="如: 支付模块缺少单元测试覆盖"
              className="rounded-xl h-10"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                类型 <span className="text-[#ef4444]">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code_quality">代码质量</SelectItem>
                  <SelectItem value="architecture">架构设计</SelectItem>
                  <SelectItem value="test_coverage">测试覆盖</SelectItem>
                  <SelectItem value="performance">性能优化</SelectItem>
                  <SelectItem value="security">安全漏洞</SelectItem>
                  <SelectItem value="dependency">依赖升级</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                严重程度 <span className="text-[#ef4444]">*</span>
              </Label>
              <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">所属模块</Label>
              <Select value={formData.module} onValueChange={(v) => setFormData({ ...formData, module: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">支付模块</SelectItem>
                  <SelectItem value="order">订单模块</SelectItem>
                  <SelectItem value="user">用户中心</SelectItem>
                  <SelectItem value="product">商品模块</SelectItem>
                  <SelectItem value="notification">通知模块</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">详细描述</Label>
            <Textarea
              placeholder="描述技术债务的具体情况、影响范围和建议解决方案..."
              className="rounded-xl resize-none h-24"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建债务
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 发起提测弹窗 =====================
interface SubmitTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitTestDialog({ open, onOpenChange }: SubmitTestDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requirementId: "",
    environment: "",
    description: "",
  });
  const [availableReqs, setAvailableReqs] = useState<any[]>([]);
  useEffect(() => {
    if (open) {
      requirementApi.list({ pageSize: 100, status: "DEVELOPED" }).then((res: any) => {
        const list = res?.data?.records || res?.data?.list || res?.data || [];
        setAvailableReqs((Array.isArray(list) ? list : []).filter((r: any) => r.status === "DEVELOPED"));
      }).catch(() => setAvailableReqs([]));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData.requirementId) {
      toast.error("请选择提测需求");
      return;
    }
    const req = availableReqs.find((r: any) => String(r.id) === formData.requirementId);
    if (!req) { toast.error("请选择有效需求"); return; }
    setSubmitting(true);
    try {
      await submitTestApi.create({
        requirementId: Number(formData.requirementId),
        projectId: req.projectId,
        sprintId: req.sprintId,
        description: formData.description,
      });
      toast.success("提测申请已提交", { description: "已提交待审批" });
      onOpenChange(false);
      setFormData({ requirementId: "", environment: "", description: "" });
    } catch (e: any) {
      toast.error(e?.message || "提测失败，请检查提测前置条件");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
              <TestTube2 className="w-4 h-4 text-[#22c55e]" />
            </div>
            发起提测
          </DialogTitle>
          <DialogDescription>
            选择已完成开发的任务提交给QA团队进行测试
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 需求选择 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              选择提测需求 <span className="text-[#ef4444]">*</span>
            </Label>
            <Select value={formData.requirementId} onValueChange={(v) => setFormData({ ...formData, requirementId: v })}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="选择开发完成的需求" />
              </SelectTrigger>
              <SelectContent>
                {availableReqs.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">暂无开发完成待提测的需求</div>
                )}
                {availableReqs.map((r: any) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">提测需满足前置条件：用例已全部锁定、AC覆盖100%、任务均已自测、异常用例占比≥25%</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">提测说明</Label>
            <Textarea
              placeholder="描述本次提测的范围、注意事项..."
              className="rounded-xl resize-none h-16"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交提测
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== 需求变更弹窗 =====================
interface ChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeRequestDialog({ open, onOpenChange }: ChangeRequestDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requirement: "",
    reason: "",
    impact: "",
    description: "",
  });
  const [reqList, setReqList] = useState<any[]>([]);
  useEffect(() => {
    if (open) {
      requirementApi.list({ pageSize: 100 }).then((res: any) => {
        const list = res?.data?.records || res?.data?.list || res?.data || [];
        setReqList(Array.isArray(list) ? list : []);
      }).catch(() => setReqList([]));
    }
  }, [open]);

  const REASON_LABEL: Record<string, string> = {
    business: "业务需求调整", technical: "技术方案变更", scope: "范围变更", priority: "优先级调整",
  };
  const IMPACT_LABEL: Record<string, string> = {
    low: "低 - 不影响排期", medium: "中 - 需延期1-2天", high: "高 - 需重新排期",
  };

  const handleSubmit = async () => {
    if (!formData.requirement || !formData.reason || !formData.impact || !formData.description.trim()) {
      toast.error("请填写必填项", { description: "变更需求、原因、影响范围、描述为必填" });
      return;
    }
    const req = reqList.find((r: any) => String(r.id) === formData.requirement);
    if (!req) { toast.error("请选择有效需求"); return; }
    setSubmitting(true);
    try {
      await changeRequestApi.create({
        requirementId: Number(formData.requirement),
        projectId: req.projectId,
        changeContent: formData.description.trim(),
        changeReason: REASON_LABEL[formData.reason] || formData.reason,
        impactScope: IMPACT_LABEL[formData.impact] || formData.impact,
      });
      toast.success("变更申请已提交", { description: "已进入产品经理审批流程" });
      onOpenChange(false);
      setFormData({ requirement: "", reason: "", impact: "", description: "" });
    } catch (e: any) {
      toast.error(e?.message || "提交变更失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#f97316]/10 flex items-center justify-center">
              <GitCommit className="w-4 h-4 text-[#f97316]" />
            </div>
            发起需求变更
          </DialogTitle>
          <DialogDescription>
            提交需求变更申请，将通知相关审批人
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              变更需求 <span className="text-[#ef4444]">*</span>
            </Label>
            <Select value={formData.requirement} onValueChange={(v) => setFormData({ ...formData, requirement: v })}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="选择要变更的需求" />
              </SelectTrigger>
              <SelectContent>
                {reqList.map((r: any) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                变更原因 <span className="text-[#ef4444]">*</span>
              </Label>
              <Select value={formData.reason} onValueChange={(v) => setFormData({ ...formData, reason: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择原因" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">业务需求调整</SelectItem>
                  <SelectItem value="technical">技术方案变更</SelectItem>
                  <SelectItem value="scope">范围变更</SelectItem>
                  <SelectItem value="priority">优先级调整</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">影响范围</Label>
              <Select value={formData.impact} onValueChange={(v) => setFormData({ ...formData, impact: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="选择影响" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低 - 不影响排期</SelectItem>
                  <SelectItem value="medium">中 - 需延期1-2天</SelectItem>
                  <SelectItem value="high">高 - 需重新排期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              变更描述 <span className="text-[#ef4444]">*</span>
            </Label>
            <Textarea
              placeholder="详细描述变更内容、原因和期望结果..."
              className="rounded-xl resize-none h-24"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交变更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ===================== 提交Bug弹窗（真实接口） =====================
interface SubmitBugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SubmitBugDialog({ open, onOpenChange, onSuccess }: SubmitBugDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [devs, setDevs] = useState<any[]>([]);
  const [form, setForm] = useState({
    projectId: "", title: "", severity: "MAJOR", priority: "HIGH",
    moduleName: "", assigneeId: "", description: "",
    expectedResult: "", actualResult: "", environment: "", requirementId: "",
  });

  useEffect(() => {
    if (open) {
      projectApi.list({ page: 1, size: 100 }).then((res: any) => {
        const list = res?.data?.records || res?.data?.list || res?.data || [];
        setProjects(Array.isArray(list) ? list : []);
      }).catch(() => setProjects([]));
      userApi.listWithRoles().then((res: any) => {
        setDevs((res.data || []).filter((u: any) => u.roleCode === 'dev' || u.roleCode === 'pm'));
      }).catch(() => setDevs([]));
      setForm({
        projectId: "", title: "", severity: "MAJOR", priority: "HIGH",
        moduleName: "", assigneeId: "", description: "",
        expectedResult: "", actualResult: "", environment: "", requirementId: "",
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.projectId) { toast.error("请选择所属项目"); return; }
    if (!form.title || !form.description || !form.expectedResult || !form.actualResult || !form.moduleName || !form.assigneeId) {
      toast.error("请填写所有必填字段（标题、描述、预期结果、实际结果、所属模块、负责人）");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        projectId: Number(form.projectId),
        title: form.title,
        description: form.description,
        severity: form.severity,
        priority: form.priority,
        expectedResult: form.expectedResult,
        actualResult: form.actualResult,
        moduleName: form.moduleName,
        assigneeId: Number(form.assigneeId),
      };
      if (form.requirementId) payload.requirementId = Number(form.requirementId);
      await bugApiSvc.create(payload);
      toast.success("Bug已提交，等待开发人员确认（R3交叉确认规则）");
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl border-border/60 shadow-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
              <Bug className="w-4 h-4 text-[#ef4444]" />
            </div>
            提交缺陷
          </DialogTitle>
          <DialogDescription>记录缺陷详情，提交后由开发人员确认（R3交叉确认规则）</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">所属项目 <span className="text-[#ef4444]">*</span></Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="选择项目" /></SelectTrigger>
                <SelectContent>
                  {projects.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">暂无项目</div>}
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.projectName || p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">所属模块 <span className="text-[#ef4444]">*</span></Label>
              <Input className="rounded-xl h-10" value={form.moduleName}
                onChange={(e) => setForm({ ...form, moduleName: e.target.value })}
                placeholder="如：支付模块" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">缺陷标题 <span className="text-[#ef4444]">*</span></Label>
            <Input className="rounded-xl h-10" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="简洁描述Bug现象" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">严重程度 <span className="text-[#ef4444]">*</span></Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOCKER">阻塞</SelectItem>
                  <SelectItem value="CRITICAL">严重</SelectItem>
                  <SelectItem value="MAJOR">主要</SelectItem>
                  <SelectItem value="MINOR">次要</SelectItem>
                  <SelectItem value="TRIVIAL">轻微</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">优先级 <span className="text-[#ef4444]">*</span></Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">高</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="LOW">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">指派负责人 <span className="text-[#ef4444]">*</span></Label>
              <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent>
                  {devs.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.nickname || u.username} ({u.roleName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">缺陷描述(复现步骤) <span className="text-[#ef4444]">*</span></Label>
            <Textarea className="rounded-xl resize-none h-20" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="详细描述复现步骤与影响范围" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">预期结果 <span className="text-[#ef4444]">*</span></Label>
              <Textarea className="rounded-xl resize-none h-16" value={form.expectedResult}
                onChange={(e) => setForm({ ...form, expectedResult: e.target.value })}
                placeholder="正确的预期行为" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">实际结果 <span className="text-[#ef4444]">*</span></Label>
              <Textarea className="rounded-xl resize-none h-16" value={form.actualResult}
                onChange={(e) => setForm({ ...form, actualResult: e.target.value })}
                placeholder="实际观察到的错误行为" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">关联需求ID（可选）</Label>
            <Input className="rounded-xl h-10" value={form.requirementId}
              onChange={(e) => setForm({ ...form, requirementId: e.target.value })}
              placeholder="可选" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>取消</Button>
          <Button className="rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white"
            onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            提交缺陷
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
