import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Rocket, Plus, CheckCircle2, XCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { releaseOrderApi, requirementApi, projectApi } from "@/services/api";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "#6b7280" },
  RELEASING: { label: "发布中", color: "#0088ff" },
  SMOKE_PENDING: { label: "待冒烟验证", color: "#f59e0b" },
  DONE: { label: "发布完成", color: "#10b981" },
  ROLLED_BACK: { label: "已回滚", color: "#ef4444" },
};

export default function ReleaseOrderList() {
  const { info } = useRole();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [smokeTarget, setSmokeTarget] = useState<any>(null);
  const [smokeResult, setSmokeResult] = useState("");
  const [smokePass, setSmokePass] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [candidateReqs, setCandidateReqs] = useState<any[]>([]);
  const [form, setForm] = useState({ projectId: "", title: "", version: "", content: "", rollbackPlan: "" });
  const [selectedReqIds, setSelectedReqIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isQa = info.id === "qa" || info.id === "sys_admin";
  const isPm = info.id === "pm" || info.id === "sys_admin";

  const load = () => {
    setLoading(true);
    releaseOrderApi.list({ pageNum: 1, pageSize: 50 }).then((res: any) => {
      setOrders(res.data?.records || []);
    }).catch(() => setOrders([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  // 可上发布单的需求:TESTED / RELEASING
  const openCreate = () => {
    setForm({ projectId: "", title: "", version: "", content: "", rollbackPlan: "" });
    setSelectedReqIds([]);
    setCandidateReqs([]);
    setCreateOpen(true);
  };
  const onProjectChange = (pid: string) => {
    setForm(f => ({ ...f, projectId: pid }));
    setSelectedReqIds([]);
    requirementApi.list({ pageSize: 100, projectId: Number(pid) }).then((res: any) => {
      const list = res?.data?.records || [];
      setCandidateReqs(list.filter((r: any) => r.status === "TESTED" || r.status === "RELEASING"));
    }).catch(() => setCandidateReqs([]));
  };

  const handleCreate = async () => {
    if (!form.projectId || !form.title) { toast.error("请填写项目与发布标题"); return; }
    if (selectedReqIds.length === 0) { toast.error("请勾选本次发布搭载的需求"); return; }
    if (form.rollbackPlan.trim().length < 20) { toast.error("回滚方案不少于20字:必须是可执行的回滚步骤"); return; }
    setSubmitting(true);
    try {
      await releaseOrderApi.create({
        projectId: Number(form.projectId), title: form.title, version: form.version,
        content: form.content, rollbackPlan: form.rollbackPlan, requirementIds: selectedReqIds,
      });
      toast.success("发布单已创建");
      setCreateOpen(false); load();
    } catch (e: any) { toast.error(e?.message || "创建失败"); }
    finally { setSubmitting(false); }
  };

  const handleAdvance = async (o: any) => {
    try {
      const res: any = await releaseOrderApi.advance(o.id);
      toast.success(res?.data || "已推进"); load();
    } catch (e: any) { toast.error(e?.message || "操作失败"); }
  };

  const handleSmoke = async () => {
    if (smokeResult.trim().length < 10) { toast.error("冒烟结论不少于10字"); return; }
    try {
      const res: any = await releaseOrderApi.smoke(smokeTarget.id, { pass: smokePass, result: smokeResult });
      toast.success(res?.data || "已提交");
      setSmokeTarget(null); load();
    } catch (e: any) { toast.error(e?.message || "提交失败"); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#0088ff]" /> 发布管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">发布内容清单 + 回滚方案 + 生产冒烟确认——堵住上线最后一公里</p>
        </div>
        {isPm && (
          <Button className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-xl" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> 新建发布单
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">加载中...</p> :
          orders.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">暂无发布单</p> :
          orders.map((o) => {
            const meta = STATUS_META[o.status] || STATUS_META.DRAFT;
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-border/60 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{o.title}</span>
                    {o.version && <Badge variant="outline" className="text-[10px]">{o.version}</Badge>}
                    <Badge className="text-[10px]" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>{meta.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{o.content || "—"}</p>
                  {o.smokeResult && (
                    <p className="text-xs mt-1" style={{ color: o.status === "DONE" ? "#10b981" : "#ef4444" }}>
                      冒烟结论: {o.smokeResult}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isPm && (o.status === "DRAFT" || o.status === "RELEASING") && (
                    <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={() => handleAdvance(o)}>
                      {o.status === "DRAFT" ? "开始发布" : "部署完成,请求冒烟"} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                  {isQa && o.status === "SMOKE_PENDING" && (
                    <Button size="sm" className="rounded-xl h-8 text-xs bg-[#f59e0b] hover:bg-[#d97706] text-white"
                      onClick={() => { setSmokeTarget(o); setSmokeResult(""); setSmokePass(true); }}>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 冒烟确认
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>

      {/* 创建发布单 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[640px] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建发布单</DialogTitle>
            <DialogDescription>选择搭载需求(仅测试通过的可上车),回滚方案必填</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>所属项目 <span className="text-red-500">*</span></Label>
                <Select value={form.projectId} onValueChange={onProjectChange}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="选择项目" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.projectName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>版本号</Label>
                <Input className="rounded-xl h-10" value={form.version} placeholder="如 v3.1.0"
                  onChange={(e) => setForm({ ...form, version: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>发布标题 <span className="text-red-500">*</span></Label>
              <Input className="rounded-xl h-10" value={form.title} placeholder="如: 2026-08 W4 发布(发布管理+缺陷确认流程)"
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>搭载需求 <span className="text-red-500">*</span>(仅显示已测试通过/发布中)</Label>
              {candidateReqs.length === 0 ? (
                <p className="text-xs text-muted-foreground">{form.projectId ? "该项目暂无可发布的需求(需先测试通过)" : "请先选择项目"}</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto border border-border/60 rounded-xl p-2">
                  {candidateReqs.map((r: any) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                      <input type="checkbox" checked={selectedReqIds.includes(r.id)}
                        onChange={(e) => setSelectedReqIds(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                      <span>#{r.id} {r.title}</span>
                      <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>发布内容清单</Label>
              <Textarea className="rounded-xl" rows={2} value={form.content} placeholder="本次发布包含的变更点与影响面"
                onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>回滚方案 <span className="text-red-500">*</span>(≥20字,可执行步骤)</Label>
              <Textarea className="rounded-xl" rows={3} value={form.rollbackPlan}
                placeholder={"1. 停止应用\n2. 回滚 jar 至上一版本 vX.X.X\n3. 执行回滚SQL(如有DDL)\n4. 重启并冒烟核心链路"}
                onChange={(e) => setForm({ ...form, rollbackPlan: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white" disabled={submitting} onClick={handleCreate}>创建发布单</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 冒烟确认 */}
      <Dialog open={!!smokeTarget} onOpenChange={(o) => { if (!o) setSmokeTarget(null); }}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>生产冒烟确认</DialogTitle>
            <DialogDescription>{smokeTarget?.title} — 验证核心链路后记录结论;失败将标记回滚</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button variant={smokePass ? "default" : "outline"} className={`rounded-xl flex-1 ${smokePass ? "bg-[#10b981] hover:bg-[#059669] text-white" : ""}`}
                onClick={() => setSmokePass(true)}><CheckCircle2 className="w-4 h-4 mr-1" />冒烟通过</Button>
              <Button variant={!smokePass ? "default" : "outline"} className={`rounded-xl flex-1 ${!smokePass ? "bg-[#ef4444] hover:bg-[#dc2626] text-white" : ""}`}
                onClick={() => setSmokePass(false)}><XCircle className="w-4 h-4 mr-1" />失败,需回滚</Button>
            </div>
            <div className="space-y-2">
              <Label>冒烟结论 <span className="text-red-500">*</span>(≥10字:验证了哪些核心链路、结果如何)</Label>
              <Textarea className="rounded-xl" rows={3} value={smokeResult}
                placeholder="如: 登录/工作台/需求列表/创建缺陷四条链路均正常,接口P95正常"
                onChange={(e) => setSmokeResult(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setSmokeTarget(null)}>取消</Button>
            <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white" onClick={handleSmoke}>提交结论</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
