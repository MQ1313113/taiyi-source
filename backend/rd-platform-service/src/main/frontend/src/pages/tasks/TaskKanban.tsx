import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { taskApi, userApi } from "@/services/api";
import { toast } from "sonner";

// 与后端任务状态机严格对齐
const columns = [
  { id: "TODO", label: "待开发", color: "#6b7280" },
  { id: "IN_PROGRESS", label: "开发中", color: "#0088ff" },
  { id: "SELF_TESTING", label: "自测中", color: "#8b5cf6" },
  { id: "TESTING", label: "测试中", color: "#f59e0b" },
  { id: "DONE", label: "已完成", color: "#10b981" },
];

export default function TaskKanban() {
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [dragId, setDragId] = useState<number | null>(null);

  const load = () => {
    taskApi.list({ page: 1, size: 100 }).then((res: any) => {
      setTasks(res.data?.records || res.data || []);
    }).catch(() => setTasks([]));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    userApi.listWithRoles().then((res: any) => {
      const map: Record<number, string> = {};
      (res.data || []).forEach((u: any) => { map[u.id] = u.nickname || u.username; });
      setNames(map);
    }).catch(() => {});
  }, []);

  const priorityColor: Record<string, string> = { HIGH: "#ef4444", P0: "#ef4444", P1: "#f59e0b", MEDIUM: "#f59e0b", LOW: "#10b981" };
  const nameOf = (id: number) => names[id] || (id ? `#${id}` : "-");

  const onDrop = (colId: string) => {
    if (dragId == null) return;
    const task = tasks.find(t => t.id === dragId);
    setDragId(null);
    if (!task || task.status === colId) return;
    // 交由后端做状态机与角色校验；非法流转会返回错误提示
    taskApi.changeStatus(task.id, { status: colId }).then(() => {
      toast.success("任务状态已更新");
      load();
    }).catch((e: any) => { toast.error(e?.message || "该流转不被允许"); load(); });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#0088ff]" /> 任务看板
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">拖拽卡片到目标列更新任务状态（流转与权限由后端校验）</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/app/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 列表视图
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4 min-h-[600px]">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
              className="bg-muted/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-medium">{col.label}</span>
                </div>
                <Badge variant="outline" className="text-[9px]">{colTasks.length}</Badge>
              </div>
              {colTasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onClick={() => setLocation(`/app/tasks/${task.id}`)}
                  className="bg-white rounded-lg border border-border/60 p-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
                  <p className="text-xs font-medium leading-relaxed">{task.taskName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#0088ff] to-[#0066cc] flex items-center justify-center text-white text-[8px]">
                        {(nameOf(task.assigneeId) || "?").charAt(0)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{nameOf(task.assigneeId)}</span>
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColor[task.priority] || "#6b7280" }} />
                  </div>
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
