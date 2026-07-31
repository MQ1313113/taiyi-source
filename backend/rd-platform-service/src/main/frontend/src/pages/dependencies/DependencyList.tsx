import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dependencyApi } from "@/services/api";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待确认", color: "#f59e0b" },
  CONFIRMED: { label: "已确认", color: "#0088ff" },
  IN_PROGRESS: { label: "进行中", color: "#8b5cf6" },
  RESOLVED: { label: "已解决", color: "#10b981" },
  BLOCKED: { label: "阻塞中", color: "#ef4444" },
};

export default function DependencyList() {
  const { hasPermission, role } = useRole();
  const canCreate = role === "pm" || role === "sys_admin";
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", fromTeam: "", toTeam: "", expectedDate: "", priority: "MEDIUM" });

  const fetchDeps = () => {
    setLoading(true);
    dependencyApi.list({ page: 1, size: 50 }).then((res: any) => {
      setDependencies(res.data?.records || res.data || []);
    }).catch(() => {
      setDependencies([]);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { fetchDeps(); }, []);

  const handleCreate = () => {
    if (!form.title || !form.fromTeam || !form.toTeam || !form.expectedDate) {
      toast.error("请填写所有必填字段"); return;
    }
    dependencyApi.create({
      requirementId: 1,
      projectId: 1,
      dependencyDesc: form.title + (form.description ? ': ' + form.description : ''),
      externalTeam: form.toTeam,
      expectedResolveDate: form.expectedDate
    }).then(() => {
      toast.success("依赖关系已创建");
      setShowCreate(false);
      fetchDeps();
    }).catch((err: any) => toast.error(err?.message || "创建失败"));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#0088ff]" /> 跨团队依赖
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理团队间的协作依赖，避免阻塞和延期</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 新建依赖
          </Button>
        )}
      </div>

      {/* Dependency List */}
      <div className="space-y-3">
        {dependencies.map((dep, i) => {
          const status = statusConfig[dep.status] || statusConfig.PENDING;
          const isOverdue = new Date(dep.expectedDate) < new Date() && dep.status !== "RESOLVED";
          return (
            <motion.div key={dep.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all duration-300 ${isOverdue ? "border-red-200" : "border-border/60"}`}>
              <div className="flex items-center gap-4">
                <Link2 className="w-4 h-4 text-[#0088ff] shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{dep.dependencyDesc || dep.title}</span>
                    {isOverdue && <Badge className="text-[9px] bg-red-50 text-red-600">逾期</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[9px]">{dep.externalTeam || dep.fromTeam}</Badge>
                    <span>→</span>
                    <Badge variant="outline" className="text-[9px]">本团队</Badge>
                    <span className="ml-2">期望: {dep.expectedResolveDate || dep.expectedDate}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: status.color, color: status.color }}>{status.label}</Badge>
                {hasPermission("dep:manage") && dep.status !== "RESOLVED" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300 shrink-0"
                    onClick={() => { dependencyApi.resolve(dep.id).then(() => { toast.success("依赖已解决"); fetchDeps(); }).catch((e: any) => toast.error(e?.message || "解决失败")); }}>
                    标记解决
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建跨团队依赖</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>依赖标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="描述依赖内容" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>需求方团队 <span className="text-red-500">*</span></Label>
                <Input value={form.fromTeam} onChange={(e) => setForm({...form, fromTeam: e.target.value})} placeholder="如: 订单团队" />
              </div>
              <div className="space-y-2">
                <Label>提供方团队 <span className="text-red-500">*</span></Label>
                <Input value={form.toTeam} onChange={(e) => setForm({...form, toTeam: e.target.value})} placeholder="如: 用户团队" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>期望完成日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.expectedDate} onChange={(e) => setForm({...form, expectedDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">高</SelectItem>
                    <SelectItem value="MEDIUM">中</SelectItem>
                    <SelectItem value="LOW">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>详细描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="详细描述依赖内容和交付物" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">创建依赖</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
