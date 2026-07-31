import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wrench, Plus, Search, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { techDebtApi, projectApi } from "@/services/api";
import { toast } from "sonner";

const typeConfig: Record<string, { label: string; color: string }> = {
  CODE: { label: "代码债务", color: "#ef4444" },
  ARCHITECTURE: { label: "架构债务", color: "#8b5cf6" },
  TEST: { label: "测试债务", color: "#f59e0b" },
  DOCUMENTATION: { label: "文档债务", color: "#0088ff" },
  DEPENDENCY: { label: "依赖债务", color: "#10b981" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  IDENTIFIED: { label: "已识别", color: "#6b7280" },
  OPEN: { label: "待处理", color: "#6b7280" },
  PLANNED: { label: "已排期", color: "#0088ff" },
  IN_PROGRESS: { label: "处理中", color: "#f59e0b" },
  RESOLVED: { label: "已解决", color: "#10b981" },
};

export default function TechDebtList() {
  const { hasPermission } = useRole();
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "CODE", severity: "MEDIUM", estimatedHours: "", impact: "" });
  const [projectId, setProjectId] = useState<number>(0);

  useEffect(() => {
    projectApi.list().then((res: any) => {
      const projects = res?.data?.records || res?.data || [];
      if (projects.length > 0) setProjectId(projects[0].id);
    }).catch(() => {});
  }, []);

  const fetchDebts = () => {
    setLoading(true);
    techDebtApi.list({ page: 1, size: 50 }).then((res: any) => {
      setDebts(res.data?.records || res.data || []);
    }).catch(() => {
      setDebts([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDebts(); }, []);

  const handleCreate = () => {
    if (!form.title || !form.description || !form.impact || !form.estimatedHours) {
      toast.error("请填写所有必填字段"); return;
    }
    techDebtApi.create({
      title: form.title,
      description: form.description,
      type: form.type,
      riskLevel: form.severity || 'MEDIUM',
      estimatedHours: parseInt(form.estimatedHours),
      projectId: projectId || 1
    }).then(() => {
      toast.success("技术债务已记录");
      setShowCreate(false);
      fetchDebts();
    }).catch((err: any) => toast.error(err?.message || "创建失败"));
  };

  const totalHours = debts.reduce((sum, d) => sum + (d.estimatedHours || 0), 0);
  const resolvedCount = debts.filter(d => d.status === "RESOLVED").length;
  const healthScore = debts.length > 0 ? Math.round(((debts.length - debts.filter(d => d.severity === "HIGH").length) / debts.length) * 100) : 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" /> 技术债务
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">追踪和管理技术债务，保障系统长期健康</p>
        </div>
        {hasPermission("debt:create") && (
          <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 记录债务
          </Button>
        )}
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">健康度</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{healthScore}%</p>
          <Progress value={healthScore} className="h-1.5 mt-2" />
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">总债务项</p>
          <p className="text-2xl font-bold text-[#0088ff] mt-1">{debts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">预估工时</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{totalHours}h</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-4">
          <p className="text-xs text-muted-foreground">已解决</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Debt List */}
      <div className="space-y-2">
        {debts.map((debt, i) => {
          const type = typeConfig[debt.type] || typeConfig.CODE;
          const status = statusConfig[debt.status] || statusConfig.IDENTIFIED;
          return (
            <motion.div key={debt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-border/60 p-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                  <Wrench className="w-4 h-4" style={{ color: type.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{debt.title}</span>
                    <Badge className="text-[9px]" style={{ backgroundColor: `${type.color}15`, color: type.color }}>{type.label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">预估 {debt.estimatedHours}h</span>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: status.color, color: status.color }}>{status.label}</Badge>
                {hasPermission("debt:manage") && debt.status !== "RESOLVED" && (
                  <div className="flex gap-1">
                    {(debt.status === "PENDING" || debt.status === "IDENTIFIED" || debt.status === "OPEN") && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { techDebtApi.schedule(debt.id, { sprintId: 1 }).then(() => { toast.success("已排入迭代"); fetchDebts(); }).catch((e: any) => toast.error(e?.message || "排期失败")); }}>
                        排期
                      </Button>
                    )}
                    {(debt.status === "SCHEDULED" || debt.status === "IN_PROGRESS" || debt.status === "PLANNED") && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300"
                        onClick={() => { techDebtApi.resolve(debt.id).then(() => { toast.success("已解决"); fetchDebts(); }).catch((e: any) => toast.error(e?.message || "解决失败")); }}>
                        解决
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>记录技术债务</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>债务标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="简明描述技术债务" />
            </div>
            <div className="space-y-2">
              <Label>详细描述 <span className="text-red-500">*</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="描述债务的具体情况和产生原因" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>债务类型 <span className="text-red-500">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>预估工时(h) <span className="text-red-500">*</span></Label>
                <Input type="number" value={form.estimatedHours} onChange={(e) => setForm({...form, estimatedHours: e.target.value})} placeholder="小时" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>风险等级 <span className="text-red-500">*</span></Label>
              <Select value={form.severity} onValueChange={(v) => setForm({...form, severity: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">高</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="LOW">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>影响范围 <span className="text-red-500">*</span></Label>
              <Textarea value={form.impact} onChange={(e) => setForm({...form, impact: e.target.value})} placeholder="描述不解决该债务的潜在影响" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-amber-500 hover:bg-amber-600 text-white">记录债务</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
