import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layers, Plus, Calendar, Target, Users, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sprintApi, projectApi } from "@/services/api";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "规划中", color: "#6b7280" },
  ACTIVE: { label: "进行中", color: "#0088ff" },
  IN_PROGRESS: { label: "进行中", color: "#0088ff" },
  COMPLETED: { label: "已完成", color: "#10b981" },
  CANCELLED: { label: "已取消", color: "#ef4444" },
};

export default function SprintBoard() {
  const { hasPermission } = useRole();
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });
  const [projectId, setProjectId] = useState<number>(0);

  // 动态获取项目ID
  useEffect(() => {
    projectApi.list().then((res: any) => {
      const projects = res?.data?.records || res?.data || [];
      if (projects.length > 0) setProjectId(projects[0].id);
    }).catch(() => {});
  }, []);

  const fetchSprints = () => {
    setLoading(true);
    sprintApi.list({ page: 1, size: 20 }).then((res: any) => {
      const records = res.data?.records || res.data || [];
      setSprints(records.map((s: any) => ({
        ...s,
        name: s.sprintName || s.name,
        totalStoryPoints: s.totalStoryPoints || 0,
        completedStoryPoints: s.completedStoryPoints || 0,
        taskCount: s.taskCount || 0,
        completedTaskCount: s.completedTaskCount || 0,
      })));
    }).catch(() => {
      setSprints([]);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { fetchSprints(); }, []);

  const handleCreate = () => {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error("请填写迭代名称和起止日期"); return;
    }
    sprintApi.create({
      sprintName: form.name,
      goal: form.goal,
      startDate: form.startDate,
      endDate: form.endDate,
      projectId: projectId || 1,
    }).then(() => {
      toast.success("迭代已创建");
      setShowCreate(false);
      setLoading(true);
      sprintApi.list({ page: 1, size: 20 }).then((res: any) => {
        const records = res.data?.records || res.data || [];
        setSprints(records.map((s: any) => ({ ...s, name: s.sprintName || s.name, totalStoryPoints: s.totalStoryPoints || 0, completedStoryPoints: s.completedStoryPoints || 0, taskCount: s.taskCount || 0, completedTaskCount: s.completedTaskCount || 0 })));
      }).finally(() => setLoading(false));
    }).catch((err: any) => toast.error(err?.message || "创建失败"));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0088ff]" /> 迭代管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理Sprint周期，跟踪迭代进度和目标达成</p>
        </div>
        {hasPermission("sprint:create") && (
          <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 新建迭代
          </Button>
        )}
      </div>

      {/* Sprint Cards */}
      <div className="space-y-4">
        {sprints.map((sprint, i) => {
          const status = statusConfig[sprint.status] || statusConfig.PLANNING;
          const progress = sprint.totalStoryPoints > 0 ? Math.round((sprint.completedStoryPoints / sprint.totalStoryPoints) * 100) : 0;
          return (
            <motion.div key={sprint.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-xl border p-6 hover:shadow-md transition-all duration-300 ${sprint.status === "ACTIVE" ? "border-[#0088ff]/40 ring-1 ring-[#0088ff]/10" : "border-border/60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{sprint.name}</h3>
                    <Badge style={{ backgroundColor: `${status.color}15`, color: status.color }}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{sprint.goal}</p>
                </div>
                <div className="flex gap-2">
                  {hasPermission("sprint:manage") && sprint.status === "PLANNING" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs text-[#0088ff] border-[#0088ff]/30"
                      onClick={() => { sprintApi.start(sprint.id).then(() => { toast.success("迭代已启动"); fetchSprints(); }).catch((e: any) => toast.error(e?.message || "启动失败")); }}>
                      <Play className="w-3 h-3 mr-1" />启动
                    </Button>
                  )}
                  {hasPermission("sprint:manage") && (sprint.status === "ACTIVE" || sprint.status === "IN_PROGRESS") && (
                    <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300"
                      onClick={() => { sprintApi.complete(sprint.id).then(() => { toast.success("迭代已完成"); fetchSprints(); }).catch((e: any) => toast.error(e?.message || "完成失败")); }}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />完成
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{sprint.startDate} ~ {sprint.endDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span>Story Points: {sprint.completedStoryPoints}/{sprint.totalStoryPoints}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>任务: {sprint.completedTaskCount}/{sprint.taskCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-xs font-medium">{progress}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建迭代</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>迭代名称 <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="如: Sprint 2026-W25" />
            </div>
            <div className="space-y-2">
              <Label>迭代目标</Label>
              <Textarea value={form.goal} onChange={(e) => setForm({...form, goal: e.target.value})} placeholder="描述本迭代的核心目标" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>结束日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">创建迭代</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
