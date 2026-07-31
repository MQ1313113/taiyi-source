import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TestTube2, Plus, Search, CheckCircle2, XCircle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { testCaseApi, requirementApi, projectApi } from "@/services/api";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import ImportDialog from "@/components/ImportDialog";
import { Upload } from "lucide-react";

// 可编写用例的需求状态（进入开发及之后，草稿/评审中不可）
const CASE_ALLOWED_REQ_STATUS = ["DEVELOPING", "DEVELOPED", "TESTING", "TESTED", "RELEASING"];
// 拆分 AC 文本为可选条目
function splitAC(ac?: string): string[] {
  if (!ac) return [];
  return ac.split(/\r?\n|；|;/).map((s) => s.trim()).filter((s) => s.length > 0);
}

const resultConfig: Record<string, { label: string; color: string; icon: any }> = {
  PASS: { label: "通过", color: "#10b981", icon: CheckCircle2 },
  FAIL: { label: "失败", color: "#ef4444", icon: XCircle },
  BLOCKED: { label: "阻塞", color: "#f59e0b", icon: Clock },
  NOT_RUN: { label: "未执行", color: "#6b7280", icon: Clock },
};

export default function TestCaseList() {
  const { role } = useRole();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState({
    title: "", module: "", precondition: "", steps: "", expectedResult: "", priority: "MEDIUM", type: "FUNCTIONAL",
    requirementId: "", acRef: "",
  });
  const [reqOptions, setReqOptions] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setShowCreate(true);
    requirementApi.list({ pageSize: 200 }).then((res: any) => {
      const list = res?.data?.records || res?.data?.list || res?.data || [];
      const arr = (Array.isArray(list) ? list : []).filter((r: any) => CASE_ALLOWED_REQ_STATUS.includes(r.status));
      setReqOptions(arr);
    }).catch(() => setReqOptions([]));
  };

  const onSelectReq = (rid: string) => {
    const req = reqOptions.find((r) => String(r.id) === rid) || null;
    setSelectedReq(req);
    setForm((f) => ({ ...f, requirementId: rid, acRef: "" }));
  };

  const fetchCases = () => {
    setLoading(true);
    testCaseApi.list({ page: 1, size: 50 }).then((res: any) => {
      const records = res.data?.records || res.data || [];
      setCases(records.map((c: any) => ({
        ...c,
        title: c.caseName || c.title,
        module: c.moduleName || c.module
      })));
    }).catch(() => {
      setCases([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCases(); }, []);

  const handleCreate = () => {
    if (!form.requirementId) { toast.error("请选择关联需求"); return; }
    if (!form.acRef) { toast.error("请选择关联的验收标准(AC)"); return; }
    if (!form.title || !form.module || !form.steps || !form.expectedResult || !form.precondition) {
      toast.error("请填写所有必填字段（标题、模块、前置条件、步骤、预期结果）"); return;
    }
    testCaseApi.create({
      caseName: form.title,
      moduleName: form.module,
      precondition: form.precondition,
      steps: form.steps,
      expectedResult: form.expectedResult,
      priority: form.priority,
      requirementId: Number(form.requirementId),
      acRef: form.acRef,
      projectId: selectedProjectId ? parseInt(selectedProjectId) : (selectedReq?.projectId || 1)
    }).then(() => {
      toast.success("测试用例创建成功");
      setShowCreate(false);
      setForm({ title: "", module: "", precondition: "", steps: "", expectedResult: "", priority: "MEDIUM", type: "FUNCTIONAL", requirementId: "", acRef: "" });
      setSelectedReq(null);
      fetchCases();
    }).catch((err: any) => toast.error(err?.message || "创建失败"));
  };

  const filtered = cases.filter(c => !searchText || c.title?.includes(searchText) || c.module?.includes(searchText));

  // Stats
  const passCount = cases.filter(c => c.result === "PASS").length;
  const passRate = cases.length > 0 ? Math.round((passCount / cases.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TestTube2 className="w-5 h-5 text-[#0088ff]" /> 测试用例库
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">所有用户可新增用例，删除/修改需产品经理审批</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="rounded-lg">
            <Upload className="w-4 h-4 mr-1" /> 批量导入
          </Button>
          <Button onClick={openCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg">
            <Plus className="w-4 h-4 mr-1" /> 新增用例
          </Button>
        </div>
      </div>
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="批量导入测试用例"
        templateFileName="testcase_import_template.csv"
        tips={[
          "项目名称、关联需求标题请填写系统中已存在的内容，测试用例必须关联需求",
          "关联的需求需已评审通过并进入开发阶段（草稿/评审中的需求不允许提前编写用例）",
          "必须填写“关联验收标准AC”，确保用例可追溯到需求的某条 AC",
          "优先级填 P0/P1/P2/P3；某一行失败不影响其他行",
        ]}
        downloadTemplate={() => testCaseApi.downloadImportTemplate()}
        importFile={(f) => testCaseApi.importFile(f)}
        onImported={fetchCases}
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-[#0088ff]">{cases.length}</p>
          <p className="text-[11px] text-muted-foreground">总用例数</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-green-600">{passCount}</p>
          <p className="text-[11px] text-muted-foreground">通过</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-red-500">{cases.filter(c => c.result === "FAIL").length}</p>
          <p className="text-[11px] text-muted-foreground">失败</p>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{passRate}%</p>
          <p className="text-[11px] text-muted-foreground">通过率</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="搜索用例..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 bg-muted/50 border-0 rounded-xl" />
      </div>

      {/* Case List */}
      <div className="space-y-2">
        {filtered.map((tc, i) => {
          const result = resultConfig[tc.result] || resultConfig.NOT_RUN;
          const ResultIcon = result.icon;
          return (
            <motion.div key={tc.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-border/60 p-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <ResultIcon className="w-4 h-4 shrink-0" style={{ color: result.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{tc.title}</span>
                    {tc.locked && <Lock className="w-3 h-3 text-amber-500" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{tc.module}</span>
                </div>
                <Badge className="text-[10px]" style={{ backgroundColor: `${result.color}15`, color: result.color }}>{result.label}</Badge>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>新增测试用例</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>所属项目 <span className="text-red-500">*</span></Label>
              <select className="w-full h-9 border rounded-md px-2 text-sm"
                value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                <option value="">请选择所属项目</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>关联需求 <span className="text-red-500">*</span></Label>
              <select className="w-full h-9 border rounded-md px-2 text-sm"
                value={form.requirementId} onChange={(e) => onSelectReq(e.target.value)}>
                <option value="">请选择已进入开发阶段的需求</option>
                {reqOptions.map((r) => (
                  <option key={r.id} value={r.id}>#{r.id} {r.title}</option>
                ))}
              </select>
              {reqOptions.length === 0 && (
                <p className="text-[11px] text-amber-600">暂无可关联需求（需评审通过进入开发阶段后才能编写用例）</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>关联验收标准(AC) <span className="text-red-500">*</span></Label>
              <select className="w-full h-9 border rounded-md px-2 text-sm"
                value={form.acRef} onChange={(e) => setForm({ ...form, acRef: e.target.value })} disabled={!selectedReq}>
                <option value="">{selectedReq ? "请选择一条AC" : "请先选择需求"}</option>
                {splitAC(selectedReq?.acceptanceCriteria).map((ac, idx) => (
                  <option key={idx} value={ac}>{ac.length > 50 ? ac.slice(0, 50) + "..." : ac}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>用例标题 <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="模块-场景-预期" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>所属模块 <span className="text-red-500">*</span></Label>
                <Input value={form.module} onChange={(e) => setForm({...form, module: e.target.value})} placeholder="如: 用户认证" />
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
            <div className="space-y-2">
              <Label>前置条件 <span className="text-red-500">*</span></Label>
              <Textarea value={form.precondition} onChange={(e) => setForm({...form, precondition: e.target.value})} placeholder="执行用例前需要满足的条件" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>测试步骤 <span className="text-red-500">*</span></Label>
              <Textarea value={form.steps} onChange={(e) => setForm({...form, steps: e.target.value})} placeholder="1. 步骤一&#10;2. 步骤二&#10;3. 步骤三" rows={4} />
            </div>
            <div className="space-y-2">
              <Label>预期结果 <span className="text-red-500">*</span></Label>
              <Textarea value={form.expectedResult} onChange={(e) => setForm({...form, expectedResult: e.target.value})} placeholder="期望的正确输出或行为" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">创建用例</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
