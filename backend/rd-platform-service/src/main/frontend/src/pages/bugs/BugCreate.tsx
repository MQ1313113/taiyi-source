import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bugApi, userApi, projectApi } from "@/services/api";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function BugCreate() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    title: "", description: "", severity: "MAJOR", priority: "HIGH",
    stepsToReproduce: "", expectedResult: "", actualResult: "",
    environment: "", assigneeId: "", moduleName: "", requirementId: "", projectId: "",
    frequency: "ALWAYS", affectedScope: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    userApi.listWithRoles().then((res: any) => {
      setUsers((res.data || []).filter((u: any) => u.roleCode !== 'sys_admin' && u.roleCode !== 'admin'));
    }).catch(() => {});
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = () => {
    if (!form.projectId || !form.title || !form.description || !form.expectedResult || !form.actualResult || !form.moduleName || !form.assigneeId || !form.environment || !form.affectedScope) {
      toast.error("请填写所有必填字段（所属项目、标题、描述、预期结果、实际结果、所属模块、负责人、测试环境、影响范围）");
      return;
    }
    setSubmitting(true);
    const payload: any = {
      title: form.title,
      description: form.description,
      severity: form.severity,
      priority: form.priority,
      expectedResult: form.expectedResult,
      actualResult: form.actualResult,
      moduleName: form.moduleName,
      environment: form.environment,
      frequency: form.frequency,
      affectedScope: form.affectedScope,
      assigneeId: parseInt(form.assigneeId),
      projectId: parseInt(form.projectId),
    };
    if (form.requirementId) payload.requirementId = parseInt(form.requirementId);
    bugApi.create(payload).then(() => {
      toast.success("Bug已提交，等待开发人员确认（R3交叉确认规则）");
      setLocation("/app/bugs");
    }).catch((err: any) => {
      toast.error(err?.message || "提交失败");
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/app/bugs")} className="text-sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回缺陷列表
      </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-border/60 p-6 max-w-3xl">
        <h1 className="text-lg font-bold flex items-center gap-2 mb-6">
          <Bug className="w-5 h-5 text-red-500" /> 提交缺陷
        </h1>

        <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg flex items-start gap-2 mb-6">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">R3交叉确认规则</p>
            <p className="mt-0.5">Bug修复后需由原提交者验证确认方可关闭，确保修复质量</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>所属项目 <span className="text-red-500">*</span></Label>
            <Select value={form.projectId} onValueChange={(v) => setForm({...form, projectId: v})}>
              <SelectTrigger><SelectValue placeholder="选择所属项目" /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>缺陷标题 <span className="text-red-500">*</span></Label>
            <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
              placeholder="简洁描述Bug现象，如：支付接口超时导致订单重复" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>严重程度 <span className="text-red-500">*</span></Label>
              <Select value={form.severity} onValueChange={(v) => setForm({...form, severity: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOCKER">阻塞(Blocker)</SelectItem>
                  <SelectItem value="CRITICAL">严重(Critical)</SelectItem>
                  <SelectItem value="MAJOR">主要(Major)</SelectItem>
                  <SelectItem value="MINOR">次要(Minor)</SelectItem>
                  <SelectItem value="TRIVIAL">轻微(Trivial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>优先级 <span className="text-red-500">*</span></Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>所属模块 <span className="text-red-500">*</span></Label>
              <Input value={form.moduleName} onChange={(e) => setForm({...form, moduleName: e.target.value})}
                placeholder="如：用户模块、支付模块、积分模块" />
            </div>
            <div className="space-y-2">
              <Label>指派负责人 <span className="text-red-500">*</span></Label>
              <Select value={form.assigneeId} onValueChange={(v) => setForm({...form, assigneeId: v})}>
                <SelectTrigger><SelectValue placeholder="选择负责人" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.roleCode === 'dev' || u.roleCode === 'pm').map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.nickname} ({u.roleName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>缺陷描述(复现步骤) <span className="text-red-500">*</span></Label>
            <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="1. 打开支付页面&#10;2. 选择微信支付&#10;3. 点击确认支付&#10;4. 等待超过30秒&#10;&#10;详细描述Bug的表现和影响范围" rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>预期结果 <span className="text-red-500">*</span></Label>
              <Textarea value={form.expectedResult} onChange={(e) => setForm({...form, expectedResult: e.target.value})}
                placeholder="描述正确的预期行为" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>实际结果 <span className="text-red-500">*</span></Label>
              <Textarea value={form.actualResult} onChange={(e) => setForm({...form, actualResult: e.target.value})}
                placeholder="描述实际观察到的错误行为" rows={2} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>测试环境 <span className="text-red-500">*</span></Label>
              <Input value={form.environment} onChange={(e) => setForm({...form, environment: e.target.value})}
                placeholder="如：Chrome 120 / iOS 17 / Android 14" />
            </div>
            <div className="space-y-2">
              <Label>复现频率 <span className="text-red-500">*</span></Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({...form, frequency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALWAYS">必现(100%)</SelectItem>
                  <SelectItem value="OFTEN">高频(&gt;50%)</SelectItem>
                  <SelectItem value="SOMETIMES">偶现(10%-50%)</SelectItem>
                  <SelectItem value="RARELY">难以复现(&lt;10%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>影响范围 <span className="text-red-500">*</span></Label>
            <Textarea value={form.affectedScope} onChange={(e) => setForm({...form, affectedScope: e.target.value})}
              placeholder="描述该Bug影响的用户群体、功能模块和业务流程" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>关联需求ID</Label>
            <Input value={form.requirementId} onChange={(e) => setForm({...form, requirementId: e.target.value})}
              placeholder="可选，填写关联的需求ID" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={() => setLocation("/app/bugs")}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-red-500 hover:bg-red-600 text-white">
            {submitting ? "提交中..." : "提交缺陷"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
