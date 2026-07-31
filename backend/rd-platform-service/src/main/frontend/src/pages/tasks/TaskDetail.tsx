import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, User, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待开发", color: "#6b7280" },
  IN_PROGRESS: { label: "开发中", color: "#0088ff" },
  CODE_REVIEW: { label: "代码审查", color: "#8b5cf6" },
  TESTING: { label: "测试中", color: "#f59e0b" },
  COMPLETED: { label: "已完成", color: "#10b981" },
};

export default function TaskDetail() {
  const [, setLocation] = useLocation();
  const task = {
    id: 1, title: "实现JWT登录接口", description: "实现基于JWT的用户认证接口，包括登录、刷新Token、登出功能",
    status: "IN_PROGRESS", priority: "HIGH", assigneeName: "张三", requirementTitle: "用户登录功能优化",
    estimatedHours: 8, actualHours: 5, progress: 60, createdAt: "2026-06-05", deadline: "2026-06-12",
    subtasks: [
      { title: "JWT工具类开发", done: true },
      { title: "登录接口实现", done: true },
      { title: "Token刷新接口", done: false },
      { title: "登出接口", done: false },
    ],
  };

  const status = statusConfig[task.status] || statusConfig.PENDING;

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/app/tasks")} className="text-sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回任务列表
      </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-border/60 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold">{task.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          </div>
          <Badge style={{ backgroundColor: `${status.color}15`, color: status.color }}>{status.label}</Badge>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">负责人:</span>
            <span className="font-medium">{task.assigneeName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">预估:</span>
            <span className="font-medium">{task.estimatedHours}h / 实际: {task.actualHours}h</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">截止:</span>
            <span className="font-medium">{task.deadline}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">关联需求:</span>
            <span className="font-medium text-[#0088ff]">{task.requirementTitle}</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">完成进度</span>
            <span className="text-sm text-muted-foreground">{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-border/60 p-6">
        <h3 className="text-sm font-semibold mb-4">子任务清单</h3>
        <div className="space-y-2">
          {task.subtasks.map((sub, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${sub.done ? "bg-green-50/50" : "bg-muted/30"}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${sub.done ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>
                {sub.done && <span className="text-xs">✓</span>}
              </div>
              <span className={`text-sm ${sub.done ? "line-through text-muted-foreground" : ""}`}>{sub.title}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
