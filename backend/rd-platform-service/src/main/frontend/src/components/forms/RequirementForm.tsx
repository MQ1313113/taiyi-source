import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { requirementApi, userApi, projectApi } from "@/services/api";
import { toast } from "sonner";
import { useProject, type FrameworkLevel } from "@/contexts/ProjectContext";

// 字段分级定义
const fieldLevels = {
  title: "L1", projectId: "L1", priority: "L1", acceptanceCriteria: "L1",
  businessValue: "L2", description: "L2", relatedSprint: "L2", prototypeUrl: "L2",
  nonFunctionalReq: "L3", dataRequirement: "L3",
};

const levelRequired: Record<FrameworkLevel, string[]> = {
  L1: ["L1"],
  L2: ["L1", "L2"],
  L3: ["L1", "L2", "L3"],
};

interface RequirementFormProps {
  // 提交成功回调：asDraft 表示是否保存为草稿，newId 为新建需求 id
  onSuccess?: (asDraft: boolean, newId?: number) => void;
  // 取消回调（弹窗模式用于关闭弹窗）
  onCancel?: () => void;
  // 是否显示顶部档位说明横幅（弹窗模式可隐藏以节省空间）
  showBanner?: boolean;
  // 是否为弹窗内嵌模式（去掉外层 padding 与最大宽度）
  embedded?: boolean;
}

export default function RequirementForm({ onSuccess, onCancel, showBanner = true, embedded = false }: RequirementFormProps) {
  const { currentLevel } = useProject();
  const [form, setForm] = useState({
    title: "", projectId: "", priority: "MEDIUM", acceptanceCriteria: "",
    businessValue: "", description: "", relatedSprint: "", prototypeUrl: "",
    nonFunctionalReq: "", dataRequirement: "", expectedCompletionDate: "",
    assigneeId: "", isFastTrack: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    userApi.listWithRoles().then((res: any) => {
      // 需求负责人只能是PM/项目经理角色，不允许直接指定开发和测试
      setUsers((res.data || []).filter((u: any) => u.roleCode === 'pm' || u.roleCode === 'project_manager'));
    }).catch(() => {});
    projectApi.list({ pageNum: 1, pageSize: 100 }).then((res: any) => {
      setProjects(res.data?.records || res.data || []);
    }).catch(() => {});
  }, []);

  const isRequired = (field: string) => {
    const level = (fieldLevels as any)[field];
    if (!level) return true;
    return levelRequired[currentLevel]?.includes(level) || false;
  };

  const getLevelBadge = (field: string) => {
    const level = (fieldLevels as any)[field];
    if (!level) return null;
    const colors: Record<string, string> = { L1: "#ef4444", L2: "#f59e0b", L3: "#8b5cf6" };
    const required = isRequired(field);
    return (
      <Badge className="text-[9px] ml-1" style={{ backgroundColor: `${colors[level]}15`, color: colors[level] }}>
        {level}{required ? " 必填" : " 选填"}
      </Badge>
    );
  };

  const handleSubmit = (asDraft: boolean) => {
    const requiredLevels = levelRequired[currentLevel];
    const errors: string[] = [];
    if (!form.projectId) errors.push("所属项目");
    if (!form.title) errors.push("需求标题");
    if (!form.priority) errors.push("优先级");
    if (!form.acceptanceCriteria) errors.push("验收标准AC");
    if (!form.expectedCompletionDate) errors.push("期望完成日期");
    if (!form.assigneeId) errors.push("负责人");

    if (requiredLevels.includes("L2")) {
      if (!form.businessValue) errors.push("业务价值");
      if (!form.description) errors.push("功能描述");
    }
    if (requiredLevels.includes("L3")) {
      if (!form.nonFunctionalReq) errors.push("非功能需求");
      if (!form.dataRequirement) errors.push("数据需求");
    }

    if (errors.length > 0 && !asDraft) {
      toast.error(`以下必填字段未填写：${errors.join("、")}`, { description: `当前档位: ${currentLevel}，要求填写 ${requiredLevels.join("+")} 级别字段` });
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      projectId: parseInt(form.projectId),
      ownerId: form.assigneeId ? parseInt(form.assigneeId) : undefined,
      type: 'FEATURE',
      status: "DRAFT",
      isFastTrack: form.isFastTrack ? 1 : 0,
    };
    delete (payload as any).assigneeId;

    requirementApi.create(payload).then((res: any) => {
      const newId = res?.data?.id;
      if (asDraft) {
        toast.success("需求已保存为草稿");
      } else {
        toast.success("需求已创建，请在详情页选择评审人提交评审");
      }
      onSuccess?.(asDraft, newId);
    }).catch((err: any) => {
      toast.error(err?.message || "创建失败");
    }).finally(() => setSubmitting(false));
  };

  return (
    <div className={embedded ? "space-y-5" : "space-y-6"}>
      {showBanner && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200/60">
          <Info className="w-4 h-4 text-[#0088ff] mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium">档位字段分级说明（当前档位: {currentLevel}）</p>
            <p className="mt-0.5">L1(红色)=核心必填 · L2(橙色)=标准档起必填 · L3(紫色)=完整档必填</p>
            <p>需求提交后进入评审流程，创建人不能是唯一评审人(R1规则)</p>
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={embedded ? "space-y-5" : "bg-white rounded-xl border border-border/60 p-6 space-y-5"}>

        {/* L1 Core Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-red-600 border-b border-red-100 pb-2">L1 核心字段</h3>
          <div className="space-y-2">
            <Label>所属项目 {getLevelBadge("projectId")}</Label>
            <Select value={form.projectId} onValueChange={(v) => setForm({...form, projectId: v})}>
              <SelectTrigger><SelectValue placeholder="请选择所属项目" /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.projectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>需求标题 {getLevelBadge("title")}</Label>
            <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="请输入需求标题（5-100字）" maxLength={100} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>优先级 {getLevelBadge("priority")}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 - 紧急</SelectItem>
                  <SelectItem value="P1">P1 - 高</SelectItem>
                  <SelectItem value="P2">P2 - 中</SelectItem>
                  <SelectItem value="P3">P3 - 低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>产品负责人 <span className="text-red-500">*</span></Label>
              <Select value={form.assigneeId} onValueChange={(v) => setForm({...form, assigneeId: v})}>
                <SelectTrigger><SelectValue placeholder="选择产品负责人" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.nickname} ({u.roleName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">需求提交只能指定产品负责人，开发/测试人员在评审通过后由技术负责人拆解任务时指派</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>验收标准(AC) {getLevelBadge("acceptanceCriteria")}</Label>
            <Textarea value={form.acceptanceCriteria} onChange={(e) => setForm({...form, acceptanceCriteria: e.target.value})}
              placeholder="请明确列出验收标准，每条一行：&#10;1. 用户能够...&#10;2. 系统应该...&#10;3. 当...时，应..." rows={4} />
          </div>
          <div className="space-y-2">
            <Label>期望完成日期 <span className="text-red-500">*</span></Label>
            <Input type="date" value={form.expectedCompletionDate} onChange={(e) => setForm({...form, expectedCompletionDate: e.target.value})} />
          </div>
          {(form.priority === "P0" || form.priority === "HIGH") && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <input type="checkbox" checked={form.isFastTrack} onChange={(e) => setForm({...form, isFastTrack: e.target.checked})} className="w-4 h-4 rounded" />
              <div>
                <p className="text-sm font-medium text-amber-800">快速通道 (Fast Track)</p>
                <p className="text-xs text-amber-600">P0需求可走绿色通道，48小时内必须补齐完整材料，每迭代不超过总需求20%</p>
              </div>
            </div>
          )}
        </div>

        {/* L2 Standard Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-amber-600 border-b border-amber-100 pb-2">
            L2 规范字段 {currentLevel === "L1" && <span className="text-xs font-normal text-muted-foreground ml-2">(当前档位选填)</span>}
          </h3>
          <div className="space-y-2">
            <Label>业务价值 {getLevelBadge("businessValue")}</Label>
            <Textarea value={form.businessValue} onChange={(e) => setForm({...form, businessValue: e.target.value})}
              placeholder="描述该需求的业务价值和目标用户群体" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>功能描述 {getLevelBadge("description")}</Label>
            <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              placeholder="详细描述功能需求，包括用户场景和交互流程" rows={4} />
          </div>
          <div className="space-y-2">
            <Label>原型图链接 {getLevelBadge("prototypeUrl")}</Label>
            <Input value={form.prototypeUrl} onChange={(e) => setForm({...form, prototypeUrl: e.target.value})} placeholder="Figma/Axure 原型链接" />
          </div>
        </div>

        {/* L3 Enhanced Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-purple-600 border-b border-purple-100 pb-2">
            L3 增强字段 {currentLevel !== "L3" && <span className="text-xs font-normal text-muted-foreground ml-2">(当前档位选填)</span>}
          </h3>
          <div className="space-y-2">
            <Label>非功能需求 {getLevelBadge("nonFunctionalReq")}</Label>
            <Textarea value={form.nonFunctionalReq} onChange={(e) => setForm({...form, nonFunctionalReq: e.target.value})}
              placeholder="性能要求、安全要求、兼容性要求等" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>数据需求 {getLevelBadge("dataRequirement")}</Label>
            <Textarea value={form.dataRequirement} onChange={(e) => setForm({...form, dataRequirement: e.target.value})}
              placeholder="数据存储、数据迁移、数据分析需求等" rows={3} />
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => onCancel?.()}>取消</Button>
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>保存草稿</Button>
        <Button onClick={() => handleSubmit(false)} disabled={submitting} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">
          提交评审
        </Button>
      </div>
    </div>
  );
}
