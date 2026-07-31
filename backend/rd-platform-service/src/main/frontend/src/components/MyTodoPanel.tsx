import { useEffect, useState } from "react";
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
} from "@/services/api";
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
  bizId: number;
  title: string;
  priority?: string;
  status?: string;
  actions: string[];
}

// 动作显示元数据：label、按钮风格、是否需要填写必填意见、最少字数
const ACTION_META: Record<
  string,
  { label: string; variant?: "default" | "outline" | "destructive"; needComment?: boolean; minLen?: number }
> = {
  SUBMIT_REVIEW: { label: "发起评审", variant: "default" },
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
  VIEW: { label: "查看详情", variant: "outline" },
};

// 状态码中文映射：避免工作台直接显示英文状态码
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿", REVIEWING: "评审中", DEVELOPING: "开发中", DEVELOPED: "开发完成",
  TESTING: "测试中", TESTED: "测试通过", RELEASING: "发布中", CLOSED: "已关闭", CANCELLED: "已取消",
  TODO: "待开发", IN_PROGRESS: "开发中", SELF_TESTING: "自测中", DONE: "已完成",
  OPEN: "待确认", CONFIRMED: "已确认", FIXING: "修复中", FIXED: "已修复",
  VERIFIED: "已验证", REOPENED: "已重开", PENDING: "待审批", APPROVED: "已通过", REJECTED: "已驳回",
};

const PRIORITY_COLOR: Record<string, string> = {
  P0: "bg-red-100 text-red-700",
  P1: "bg-orange-100 text-orange-700",
  P2: "bg-blue-100 text-blue-700",
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-orange-100 text-orange-700",
  LOW: "bg-gray-100 text-gray-600",
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
  const [splitReq, setSplitReq] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    taskName: "", description: "", priority: "P1",
    assigneeId: "", estimatedHours: "", startDate: "", dueDate: "",
  });

  // 发起评审弹窗
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewReqId, setReviewReqId] = useState<number | null>(null);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    dashboardApi
      .myTodo()
      .then((res: any) => {
        setItems(res?.data?.items || []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

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
        <button onClick={load} className="text-sm text-gray-400 hover:text-blue-600">
          刷新
        </button>
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
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
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
                {item.status && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {STATUS_LABEL[item.status] || item.status}
                  </Badge>
                )}
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
                  <option value="P0">P0 - 紧急</option>
                  <option value="P1">P1 - 高</option>
                  <option value="P2">P2 - 中</option>
                  <option value="P3">P3 - 低</option>
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
    </div>
  );
}
