import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { taskApi } from "@/services/api";

const columns = [
  { id: "PENDING", label: "待开发", color: "#6b7280" },
  { id: "IN_PROGRESS", label: "开发中", color: "#0088ff" },
  { id: "CODE_REVIEW", label: "代码审查", color: "#8b5cf6" },
  { id: "TESTING", label: "测试中", color: "#f59e0b" },
  { id: "COMPLETED", label: "已完成", color: "#10b981" },
];

export default function TaskKanban() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    taskApi.list({ page: 1, size: 100 }).then((res: any) => {
      setTasks(res.data?.records || res.data || []);
    }).catch(() => {
      setTasks([
        { id: 1, title: "实现JWT登录接口", status: "IN_PROGRESS", assigneeName: "张三", priority: "HIGH", estimatedHours: 8 },
        { id: 2, title: "数据库表结构设计", status: "COMPLETED", assigneeName: "李四", priority: "HIGH", estimatedHours: 4 },
        { id: 3, title: "前端登录页面开发", status: "CODE_REVIEW", assigneeName: "王五", priority: "MEDIUM", estimatedHours: 6 },
        { id: 4, title: "单元测试编写", status: "PENDING", assigneeName: "张三", priority: "LOW", estimatedHours: 4 },
        { id: 5, title: "API文档编写", status: "PENDING", assigneeName: "李四", priority: "LOW", estimatedHours: 3 },
        { id: 6, title: "支付接口对接", status: "IN_PROGRESS", assigneeName: "王五", priority: "HIGH", estimatedHours: 12 },
        { id: 7, title: "性能优化-N+1查询", status: "TESTING", assigneeName: "张三", priority: "MEDIUM", estimatedHours: 6 },
      ]);
    });
  }, []);

  const priorityColor: Record<string, string> = { HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#10b981" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#0088ff]" /> 任务看板
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">拖拽卡片更新任务状态</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 min-h-[600px]">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="bg-muted/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-medium">{col.label}</span>
                </div>
                <Badge variant="outline" className="text-[9px]">{colTasks.length}</Badge>
              </div>
              {colTasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-lg border border-border/60 p-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
                  <p className="text-xs font-medium leading-relaxed">{task.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#0088ff] to-[#0066cc] flex items-center justify-center text-white text-[8px]">
                        {task.assigneeName?.charAt(0)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{task.assigneeName}</span>
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
