import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, User, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocation, useRoute } from "wouter";
import { taskApi, userApi } from "@/services/api";
import FlowPath from "@/components/FlowPath";

// 与后端任务状态机严格对齐：TODO/IN_PROGRESS/SELF_TESTING/TESTING/DONE
const statusConfig: Record<string, { label: string; color: string }> = {
  TODO: { label: "待开发", color: "#6b7280" },
  IN_PROGRESS: { label: "开发中", color: "#0088ff" },
  SELF_TESTING: { label: "自测中", color: "#8b5cf6" },
  TESTING: { label: "测试中", color: "#f59e0b" },
  DONE: { label: "已完成", color: "#10b981" },
};

export default function TaskDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/tasks/:id");
  const taskId = parseInt(params?.id || "0");
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<number, string>>({});

  useEffect(() => {
    setLoading(true);
    taskApi.detail(taskId).then((res: any) => setTask(res.data)).catch(() => setTask(null)).finally(() => setLoading(false));
  }, [taskId]);
  useEffect(() => {
    userApi.listWithRoles().then((res: any) => {
      const map: Record<number, string> = {};
      (res.data || []).forEach((u: any) => { map[u.id] = u.nickname || u.username; });
      setNames(map);
    }).catch(() => {});
  }, []);

  if (loading) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;
  if (!task) return <div className="p-6 text-center text-muted-foreground">任务不存在或无权访问</div>;

  const status = statusConfig[task.status] || statusConfig.TODO;
  const est = Number(task.estimatedHours) || 0;
  const act = Number(task.actualHours) || 0;
  const ratio = est > 0 ? Math.min(100, Math.round((act / est) * 100)) : 0;
  const nameOf = (id: number) => names[id] || (id ? `用户#${id}` : "-");

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/app/tasks")} className="text-sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回任务列表
      </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-border/60 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold">{task.taskName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{task.description || "无描述"}</p>
          </div>
          <Badge style={{ backgroundColor: `${status.color}15`, color: status.color }}>{status.label}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" /> 负责人: {nameOf(task.assigneeId)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4 text-muted-foreground" /> 优先级: {task.priority || "-"}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" /> 截止: {task.dueDate || "-"}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" /> 工时: {act}h / {est}h
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>工时进度（实际/预估）</span><span>{ratio}%</span>
          </div>
          <Progress value={ratio} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-muted-foreground">
          <div>关联需求ID: {task.requirementId || "-"}</div>
          <div>所属迭代ID: {task.sprintId || "未纳入迭代"}</div>
          <div>创建时间: {task.createdAt || "-"}</div>
          <div>完成时间: {task.completedAt || "-"}</div>
        </div>
      </motion.div>

      {task.acceptanceCriteria && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-border/60 p-6">
          <h3 className="text-sm font-semibold mb-2">验收标准</h3>
          <pre className="text-sm whitespace-pre-wrap font-sans">{task.acceptanceCriteria}</pre>
        </motion.div>
      )}

      <FlowPath entityType="TASK" entityId={taskId} />
    </div>
  );
}
