import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layers, Plus, Calendar, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectApi } from "@/services/api";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "规划中", color: "#6b7280" },
  ACTIVE: { label: "进行中", color: "#0088ff" },
  IN_PROGRESS: { label: "进行中", color: "#0088ff" },
  COMPLETED: { label: "已完成", color: "#10b981" },
  CANCELLED: { label: "已取消", color: "#ef4444" },
};

export default function SprintList() {

  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });
  const [projectId, setProjectId] = useState<number>(0);

  const fetchSprints = () => {
    setLoading(true);
    // 动态获取第一个项目的ID，避免硬编码
    projectApi.list().then((pRes: any) => {
      const projects = pRes?.data?.records || pRes?.data || [];
      const pid = projects.length > 0 ? projects[0].id : 1;
      setProjectId(pid);
      return pid;
    }).catch(() => 1).then((pid: number) => {
    projectApi.sprintList(pid || 1).then((res: any) => {
      const data = res.data;
      const records = Array.isArray(data) ? data : (data?.records || []);
      setSprints(records.map((s: any) => ({
        ...s,
        name: s.sprintName || s.name
      })));
    }).catch(() => {
      setSprints([]);
    }).finally(() => setLoading(false));
    });
  };

  useEffect(() => { fetchSprints(); }, []);

  const handleCreate = () => {
    if (!form.name || !form.goal || !form.startDate || !form.endDate) {
      toast.error("请填写所有必填字段"); return;
    }
    projectApi.sprintCreate(projectId || 1, {
      sprintName: form.name,
      goal: form.goal,
      startDate: form.startDate,
      endDate: form.endDate
    }).then(() => {
      toast.success("迭代创建成功");
      setShowCreate(false);
      setForm({ name: "", goal: "", startDate: "", endDate: "" });
      fetchSprints();
    }).catch((err: any) => toast.error(err?.message || "创建失败"));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0088ff]" /> 迭代管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理项目迭代周期与交付目标</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
          <Plus className="w-4 h-4 mr-1" /> 新建迭代
        </Button>
      </div>

      <div className="space-y-4">
        {sprints.map((sprint, i) => {
          const status = statusConfig[sprint.status] || statusConfig.PLANNING;
          return (
            <motion.div key={sprint.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-border/60 p-5 hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{sprint.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{sprint.goal}</p>
                </div>
                <Badge style={{ backgroundColor: `${status.color}15`, color: status.color }}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {sprint.startDate} ~ {sprint.endDate}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">完成进度</span>
                  <span className="font-medium">{sprint.progress || 0}%</span>
                </div>
                <Progress value={sprint.progress || 0} className="h-2" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建迭代</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>迭代名称 <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="如 Sprint 2026-W25" />
            </div>
            <div className="space-y-2">
              <Label>迭代目标 <span className="text-red-500">*</span></Label>
              <Textarea value={form.goal} onChange={(e) => setForm({...form, goal: e.target.value})} placeholder="本迭代的交付目标" rows={3} />
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
