import { useEffect, useState } from "react";
import { useDashboardAutoRefresh } from "@/hooks/useDashboardAutoRefresh";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Inbox, ChevronRight, AlertTriangle, Scissors, FileText, Plus } from "lucide-react";
import {
  dashboardApi,
  requirementApi,
  taskApi,
  bugApi,
  submitTestApi,
  userApi,
  ticketApi,
} from "@/services/api";
import TriageDialog from "@/components/tickets/TriageDialog";
import { PRIORITY_OPTIONS } from "@/components/PrioritySelectItems";
import { copyText } from "@/lib/clipboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface TodoItem {
  type: string;
  typeLabel?: string;
  bizId: number;
  bizCode?: string;
  projectName?: string;
  privateProject?: boolean;
  title: string;
  priority?: string;
  status?: string;
  source?: string;
  category?: string;
  severity?: string;
  estimatedHours?: number;
  fromUser?: string;
  createdAt?: string;
  dueDate?: string;
  dueLabel?: string;
  scoreExplain?: string;
  actions: string[];
}

// 动作显示元数据：label、按钮风格、是否需要填写必填意见、最少字数
const ACTION_META: Record<
  string,
  { label: string; variant?: "default" | "outline" | "destructive"; needComment?: boolean; minLen?: number }
> = {
  SUBMIT_REVIEW: { label: "发起评审", variant: "default" },
  TRIAGE: { label: "分诊", variant: "default" },
  REVIEW_APPROVE: { label: "评审通过", variant: "default" },
  REVIEW_REJECT: { label: "评审驳回", variant: "destructive", needComment: true, minLen: 20 },
  CREATE_TASK: { label: "拆解任务", variant: "default" },
  MARK_DEVELOPED: { label: "标记开发完成", variant: "default" },
  TASK_START: { label: "开始任务", variant: "default" },
  TASK_SELF_TEST: { label: "提交自测", variant: "default" },
  TASK_SUBMIT_TEST: { label: "提交测试", variant: "default" },
  TASK_TEST_PASS: { label: "测试通过", variant: "default" },
  TASK_TEST_REJECT: { label: "测试打回", variant: "destructive" },
  TASK_DONE: { label: "完成任务", variant: "default" },
  BUG_CONFIRM: { label: "确认缺陷", variant: "default" },
  BUG_START_FIX: { label: "开始修复", variant: "default" },
  BUG_FIXED: { label: "修复完成", variant: "default" },
  BUG_VERIFY: { label: "验证通过", variant: "default" },
  BUG_REOPEN: { label: "打回重开", variant: "destructive", needComment: true, minLen: 10 },
  ST_APPROVE: { label: "提测通过", variant: "default" },
  ST_REJECT: { label: "提测驳回", variant: "destructive", needComment: true, minLen: 10 },
  PROMOTE: { label: "转报团队", variant: "outline" },
  VIEW: { label: "查看详情", variant: "outline" },
};

// 状态码中文映射：避免工作台直接显示英文状态码
const DEBT_STATUS: Record<string, string> = { OPEN: "未排期", SCHEDULED: "已排期" };
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿", REVIEWING: "评审中", DEVELOPING: "开发中", DEVELOPED: "开发完成",
  TESTING: "测试中", TESTED: "测试通过", RELEASING: "发布中", CLOSED: "已关闭", CANCELLED: "已取消",
  TODO: "待开发", IN_PROGRESS: "开发中", SELF_TESTING: "自测中", DONE: "已完成",
  OPEN: "待确认", CONFIRMED: "已确认", FIXING: "修复中", FIXED: "已修复",
  VERIFIED: "已验证", REOPENED: "已重开", PENDING: "待审批", APPROVED: "已通过", REJECTED: "已驳回",
  PENDING_TRIAGE: "待分诊", DISPATCHED: "已分派", PROCESSING: "处理中", RESOLVED: "已解决",
};

const PRIORITY_COLOR: Record<string, string> = {
  P0: "bg-red-100 text-red-700",
  P1: "bg-orange-100 text-orange-700",
  P2: "bg-blue-100 text-blue-700",
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-orange-100 text-orange-700",
  LOW: "bg-gray-100 text-gray-600",
};

// 待办类型标签配色（标签文案由后端 typeLabel 下发，此处只管颜色分族）
const typeColor = (type: string): string => {
  if (type.startsWith("REQUIREMENT")) return "bg-purple-100 text-purple-700";
  if (type.startsWith("BUG")) return "bg-red-100 text-red-700";
  if (type.startsWith("TICKET")) return "bg-amber-100 text-amber-700";
  if (type === "SUBMIT_TEST_APPROVE") return "bg-cyan-100 text-cyan-700";
  if (type === "RELEASE_SMOKE") return "bg-green-100 text-green-700";
  if (type === "TECH_DEBT") return "bg-gray-100 text-gray-600";
  if (type === "CONFIG_MISSING") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700"; // TASK 等
};

const SEVERITY_LABEL: Record<string, string> = {
  BLOCKER: "阻塞", CRITICAL: "严重", HIGH: "高", MAJOR: "主要",
  MEDIUM: "中", MINOR: "次要", LOW: "低", TRIVIAL: "建议",
};

const TICKET_CATEGORY_LABEL: Record<string, string> = {
  BUG: "缺陷", REQUIREMENT: "需求", AFTERSALES: "售后", OTHER: "其他",
};

// 创建时间 → 等待时长（今天/昨天/N天前）
const waitingLabel = (iso?: string): string | null => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days}天前`;
};

export default function MyTodoPanel() {
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // 需要填写意见的动作弹窗
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<{ item: TodoItem; action: string } | null>(null);

  // 可选用户（按角色过滤用）
  const [devUsers, setDevUsers] = useState<any[]>([]);
  const [reviewerUsers, setReviewerUsers] = useState<any[]>([]);

  // 拆解任务弹窗
  const [splitOpen, setSplitOpen] = useState(false);
  const [triageTicket, setTriageTicket] = useState<any | null>(null);
  const [splitReq, setSplitReq] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    taskName: "", description: "", priority: "P1",
    assigneeId: "", estimatedHours: "", startDate: "", dueDate: "",
  });

  // 发起评审弹窗
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewReqId, setReviewReqId] = useState<number | null>(null);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    dashboardApi
      .myTodo()
      .then((res: any) => {
        setItems(res?.data?.items || []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  // 一键复制周报:本周完成(团队/单人分组)+质量工作+进行中,直接粘贴到汇报群
  const copyWeekly = async () => {
    try {
      const res: any = await dashboardApi.myWeek();
      const text = res?.data?.reportText || "";
      await copyText(text);
      toast.success(`周报已复制(完成${res?.data?.doneCount ?? 0}项/${res?.data?.totalHours ?? 0}h)`, { description: "可直接粘贴到汇报群或周报文档" });
    } catch (e: any) {
      toast.error(e?.message || "生成周报失败");
    }
  };

  // 自动刷新：定时轮询 + 收到通知立即刷新（静默模式,不闪加载态）
  useDashboardAutoRefresh(() => load(true));

  useEffect(() => {
    load();
    // 预加载用户列表，供拆解任务与发起评审选择
    userApi.listWithRoles().then((res: any) => {
      const users = res?.data || [];
      setDevUsers(users.filter((u: any) => u.roleCode === "dev"));
      setReviewerUsers(users.filter((u: any) => u.roleCode === "pm"));
    }).catch(() => {});
  }, []);

  // 跳转到详情页（仅"查看详情"动作使用）
  const goDetail = (item: TodoItem) => {
    switch (item.type) {
      case "REQUIREMENT_SUBMIT_REVIEW":
      case "REQUIREMENT_REVIEW":
      case "REQUIREMENT_BREAKDOWN":
      case "REQUIREMENT_DEVELOPED":
        setLocation(`/app/requirements/${item.bizId}`);
        break;
      case "TASK":
        setLocation(`/app/tasks`);
        break;
      case "BUG_FIX":
      case "BUG_VERIFY":
        setLocation(`/app/bugs`);
        break;
      case "SUBMIT_TEST_APPROVE":
        setLocation(`/app/submit-test`);
        break;
      case "TECH_DEBT":
        setLocation(`/app/debt`);
        break;
      case "RELEASE_SMOKE":
        setLocation(`/app/releases`);
        break;
      case "CONFIG_MISSING":
        setLocation(`/app/settings`);
        break;
      case "TICKET_TRIAGE":
      case "TICKET_HANDLE":
        // 直达工单详情:详情页带分诊面板与状态推进,点开即可处理
        setLocation(item.bizId ? `/app/tickets/${item.bizId}` : `/app/tickets`);
        break;
      default:
        break;
    }
  };

  // 打开拆解任务弹窗：先拉取需求详情补齐 projectId/sprintId 上下文
  const openSplit = async (item: TodoItem) => {
    try {
      const res: any = await requirementApi.detail(item.bizId);
      setSplitReq(res?.data || null);
      setTaskForm({ taskName: "", description: "", priority: "P1", assigneeId: "", estimatedHours: "", startDate: "", dueDate: "" });
      setSplitOpen(true);
    } catch {
      toast.error("加载需求信息失败，请重试");
    }
  };

  // 提交拆解任务（真实调用 taskApi.create，字段全部必填）
  const submitSplit = async () => {
    if (!splitReq) return;
    if (!taskForm.taskName.trim()) { toast.error("请填写任务名称"); return; }
    if (!taskForm.assigneeId) { toast.error("请选择开发负责人"); return; }
    if (!taskForm.estimatedHours || Number(taskForm.estimatedHours) <= 0) { toast.error("请填写预估工时"); return; }
    if (!taskForm.startDate) { toast.error("请选择开始日期"); return; }
    if (!taskForm.dueDate) { toast.error("请选择截止日期"); return; }
    if (!taskForm.description.trim()) { toast.error("请填写任务描述"); return; }
    setSubmitting(true);
    try {
      await taskApi.create({
        requirementId: splitReq.id,
        projectId: splitReq.projectId,
        sprintId: splitReq.sprintId,
        taskName: taskForm.taskName.trim(),
        description: taskForm.description.trim(),
        priority: taskForm.priority,
        assigneeId: Number(taskForm.assigneeId),
        estimatedHours: Number(taskForm.estimatedHours),
        startDate: taskForm.startDate,
        dueDate: taskForm.dueDate,
      });
      toast.success("任务已创建并通知负责人");
      // 连续拆解：保留弹窗，清空名称/负责人/描述/工时
      setTaskForm({ ...taskForm, taskName: "", description: "", assigneeId: "", estimatedHours: "" });
      load();
    } catch (err: any) {
      toast.error(err?.message || "创建任务失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 打开发起评审弹窗
  const openReview = (item: TodoItem) => {
    setReviewReqId(item.bizId);
    setSelectedReviewers([]);
    setReviewOpen(true);
  };

  const toggleReviewer = (id: string) => {
    setSelectedReviewers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 提交发起评审（真实调用 submitReview）
  const submitReview = async () => {
    if (reviewReqId == null) return;
    if (selectedReviewers.length === 0) { toast.error("请至少选择一位评审人"); return; }
    setSubmitting(true);
    try {
      await requirementApi.submitReview(reviewReqId, { reviewerIds: selectedReviewers.map(Number) });
      toast.success("已提交评审");
      setReviewOpen(false);
      setSelectedReviewers([]);
      load();
    } catch (err: any) {
      toast.error(err?.message || "提交评审失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 执行不需要填写意见的动作
  const runAction = async (item: TodoItem, action: string) => {
    if (action === "VIEW") {
      goDetail(item);
      return;
    }
    if (action === "TRIAGE") {
      // 工单分诊:拉详情后在工作台内弹窗就地处理,不跳转页面
      ticketApi.detail(item.bizId).then((res: any) => setTriageTicket(res.data))
        .catch((e: any) => toast.error(e?.message || "工单加载失败"));
      return;
    }
    if (action === "PROMOTE") {
      // 单人项目任务转报团队:生成需求类工单,PM 分诊后走正式流程
      taskApi.promote(item.bizId).then(() => {
        toast.success("已提报为需求工单", { description: "PM 分诊后将转入团队正式流程,进展会通知您" });
        load(true);
      }).catch((e: any) => toast.error(e?.message || "转报失败"));
      return;
    }
    const meta = ACTION_META[action];
    if (meta?.needComment) {
      // 涉及质量判断的动作必须填写必填意见，绝不静默提交
      setPending({ item, action });
      setComment("");
      setCommentOpen(true);
      return;
    }
    // 拆解任务：在工作台内打开完整表单弹窗，不跳转页面
    if (action === "CREATE_TASK") {
      openSplit(item);
      return;
    }
    // 发起评审：在工作台内打开选择评审人弹窗，不跳转页面
    if (action === "SUBMIT_REVIEW") {
      openReview(item);
      return;
    }
    await dispatch(item, action, undefined);
  };

  // 真正调用后端业务接口
  const dispatch = async (item: TodoItem, action: string, commentText?: string) => {
    setSubmitting(true);
    try {
      switch (action) {
        case "REVIEW_APPROVE":
          await requirementApi.review(item.bizId, { result: "APPROVED" });
          break;
        case "REVIEW_REJECT":
          await requirementApi.review(item.bizId, { result: "REJECTED", comment: commentText });
          break;
        case "MARK_DEVELOPED":
          await requirementApi.markDeveloped(item.bizId);
          break;
        case "TASK_START":
          await taskApi.changeStatus(item.bizId, { status: "IN_PROGRESS" });
          break;
        case "TASK_SELF_TEST":
          await taskApi.changeStatus(item.bizId, { status: "SELF_TESTING" });
          break;
        case "TASK_SUBMIT_TEST":
          await taskApi.changeStatus(item.bizId, { status: "TESTING" });
          break;
        case "TASK_TEST_PASS":
          await taskApi.changeStatus(item.bizId, { status: "DONE" });
          break;
        case "TASK_TEST_REJECT":
          await taskApi.changeStatus(item.bizId, { status: "IN_PROGRESS" });
          break;
        case "TASK_DONE":
          await taskApi.changeStatus(item.bizId, { status: "DONE" });
          break;
        case "BUG_CONFIRM":
          await bugApi.changeStatus(item.bizId, { status: "CONFIRMED" });
          break;
        case "BUG_START_FIX":
          await bugApi.changeStatus(item.bizId, { status: "FIXING" });
          break;
        case "BUG_FIXED":
          await bugApi.changeStatus(item.bizId, { status: "FIXED" });
          break;
        case "BUG_VERIFY":
          await bugApi.changeStatus(item.bizId, { status: "VERIFIED" });
          break;
        case "BUG_REOPEN":
          await bugApi.changeStatus(item.bizId, { status: "REOPENED", comment: commentText });
          break;
        case "ST_APPROVE":
          await submitTestApi.approve(item.bizId);
          break;
        case "ST_REJECT":
          await submitTestApi.reject(item.bizId, { reason: commentText });
          break;
        default:
          break;
      }
      toast.success(`${ACTION_META[action]?.label || "操作"}成功`);
      setCommentOpen(false);
      setPending(null);
      load(); // 局部刷新待办
    } catch (e: any) {
      toast.error(e?.message || "操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmComment = () => {
    if (!pending) return;
    const meta = ACTION_META[pending.action];
    if (meta?.needComment && comment.trim().length < (meta.minLen || 10)) {
      toast.error(`请填写不少于 ${meta.minLen || 10} 字的说明`);
      return;
    }
    dispatch(pending.item, pending.action, comment.trim());
  };

  const totalHours = Number(taskForm.estimatedHours) || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">我的待办</h3>
          <Badge className="bg-blue-100 text-blue-700">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyWeekly} className="text-sm text-gray-400 hover:text-blue-600">
            复制周报
          </button>
          <button onClick={load} className="text-sm text-gray-400 hover:text-blue-600">
            刷新
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">加载中...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            暂无待处理事项，保持得很好！
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.type}-${item.bizId}-${idx}`}
              title={item.scoreExplain}
              className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                {/* 第一行:类型标签 + 优先级 + 标题 + 外部/严重级标记 */}
                <div className="flex items-center gap-2 min-w-0">
                  {item.typeLabel && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${typeColor(item.type)}`}>
                      {item.typeLabel}
                    </span>
                  )}
                  {item.priority && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                        PRIORITY_COLOR[item.priority] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.priority}
                    </span>
                  )}
                  <span className="text-sm text-gray-800 truncate">{item.title}</span>
                  {item.source === "EXTERNAL" && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">外部</span>
                  )}
                  {item.severity && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">
                      {SEVERITY_LABEL[item.severity] || item.severity}
                    </span>
                  )}
                </div>
                {/* 第二行:单号 · 项目 · 状态 · 分类 · 相关人 · 等待时长 · 工时 · 截止 */}
                <div className="mt-1 flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] text-gray-400">
                  {item.bizCode && <span className="font-mono">{item.bizCode}</span>}
                  {item.projectName && (
                    <span className={item.privateProject ? "text-purple-500" : ""}>
                      {item.privateProject ? "单人·" : ""}{item.projectName.length > 12 ? item.projectName.slice(0, 12) + "…" : item.projectName}
                    </span>
                  )}
                  {item.status && (
                    <span>
                      {(item.type === "TECH_DEBT" ? DEBT_STATUS[item.status] : undefined) || STATUS_LABEL[item.status] || item.status}
                    </span>
                  )}
                  {item.category && item.type.startsWith("TICKET") && (
                    <span>{TICKET_CATEGORY_LABEL[item.category] || item.category}类</span>
                  )}
                  {item.fromUser && <span>来自 {item.fromUser}</span>}
                  {waitingLabel(item.createdAt) && <span>创建于{waitingLabel(item.createdAt)}</span>}
                  {item.estimatedHours != null && Number(item.estimatedHours) > 0 && (
                    <span>预估{Number(item.estimatedHours)}h</span>
                  )}
                  {item.dueLabel && (
                    <span
                      className={
                        item.dueLabel.startsWith("已逾期")
                          ? "text-red-500 font-medium"
                          : item.dueLabel === "今日到期"
                            ? "text-orange-500 font-medium"
                            : ""
                      }
                    >
                      {item.type.startsWith("TICKET") ? "SLA " : ""}{item.dueLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* 仅渲染后端授权的动作按钮，从源头杜绝越权 */}
                {item.actions.map((action) => {
                  const meta = ACTION_META[action];
                  if (!meta) return null;
                  if (action === "VIEW") {
                    return (
                      <button
                        key={action}
                        onClick={() => goDetail(item)}
                        className="text-xs text-gray-400 hover:text-blue-600 flex items-center"
                      >
                        详情 <ChevronRight className="w-3 h-3" />
                      </button>
                    );
                  }
                  return (
                    <Button
                      key={action}
                      size="sm"
                      variant={meta.variant || "default"}
                      disabled={submitting}
                      onClick={() => runAction(item, action)}
                      className="h-7 text-xs"
                    >
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 必填意见弹窗：驳回/打回类动作 */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {pending ? ACTION_META[pending.action]?.label : ""} · 请填写说明
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              说明（必填，不少于
              {pending ? ACTION_META[pending.action]?.minLen || 10 : 10}字）
            </Label>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="请清晰描述原因，以便对方准确理解并跟进..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" disabled={submitting} onClick={confirmComment}>
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拆解任务弹窗：工作台内原地完成，真实创建任务 */}
      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-purple-600" />
              拆解任务
            </DialogTitle>
            <DialogDescription>
              {splitReq ? `需求：${splitReq.title}` : ""} · 字段均为必填，负责人仅限开发人员
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>任务名称 <span className="text-red-500">*</span></Label>
              <Input value={taskForm.taskName} onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })} placeholder="请输入任务名称" />
            </div>
            <div>
              <Label>任务描述 <span className="text-red-500">*</span></Label>
              <Textarea rows={3} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="请描述任务内容与交付要求" />
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
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.v} value={o.v}>{o.label} — {o.desc}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>预估工时 <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" value={taskForm.estimatedHours} onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })} placeholder="小时" />
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
            <div className="text-xs text-gray-500">预估工时：{totalHours} 小时</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitOpen(false)}>关闭</Button>
            <Button disabled={submitting} onClick={submitSplit} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-1" />创建任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发起评审弹窗：工作台内选择评审人原地提交 */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              发起评审
            </DialogTitle>
            <DialogDescription>请选择评审人（产品经理），可多选</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            {reviewerUsers.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">暂无可选评审人</div>
            ) : (
              reviewerUsers.map((u) => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedReviewers.includes(String(u.id))
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedReviewers.includes(String(u.id))}
                    onChange={() => toggleReviewer(String(u.id))}
                  />
                  <span className="text-sm font-medium">{u.nickname || u.username}</span>
                  <Badge variant="outline" className="text-[10px]">{u.roleName || u.roleCode}</Badge>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>取消</Button>
            <Button disabled={submitting} onClick={submitReview}>提交评审</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 工单分诊弹窗:待办项"分诊"按钮就地处理 */}
      <TriageDialog ticket={triageTicket} open={!!triageTicket}
        onOpenChange={(v) => !v && setTriageTicket(null)} onDone={() => load()} />
    </div>
  );
}
