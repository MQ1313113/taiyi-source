import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useRoute } from "wouter";
import { bugApi, userApi } from "@/services/api";
import FlowPath from "@/components/FlowPath";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

// 与后端 Bug 状态机严格对齐：OPEN/CONFIRMED/FIXING/FIXED/VERIFIED/CLOSED/REJECTED/REOPENED
const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: "待确认", color: "#f59e0b" },
  CONFIRMED: { label: "已确认", color: "#ef4444" },
  FIXING: { label: "修复中", color: "#0088ff" },
  FIXED: { label: "已修复", color: "#8b5cf6" },
  VERIFIED: { label: "已验证", color: "#10b981" },
  CLOSED: { label: "已关闭", color: "#374151" },
  REJECTED: { label: "已拒绝", color: "#6b7280" },
  REOPENED: { label: "已重开", color: "#ef4444" },
};

export default function BugDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/bugs/:id");
  const bugId = parseInt(params?.id || "0");
  const { hasPermission } = useRole();
  const [bug, setBug] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<number, string>>({});
  const [verifyComment, setVerifyComment] = useState("");

  const load = () => {
    setLoading(true);
    bugApi.detail(bugId).then((res: any) => setBug(res.data)).catch(() => setBug(null)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [bugId]);
  useEffect(() => {
    userApi.listWithRoles().then((res: any) => {
      const map: Record<number, string> = {};
      (res.data || []).forEach((u: any) => { map[u.id] = u.nickname || u.username; });
      setNames(map);
    }).catch(() => {});
  }, []);

  const changeStatus = (status: string, okMsg: string) => {
    bugApi.changeStatus(bugId, { status, comment: verifyComment }).then(() => {
      toast.success(okMsg); setVerifyComment(""); load();
    }).catch((e: any) => toast.error(e?.message || "操作失败"));
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;
  if (!bug) return <div className="p-6 text-center text-muted-foreground">缺陷不存在或无权访问</div>;

  const status = statusConfig[bug.status] || statusConfig.OPEN;
  const nameOf = (id: number) => names[id] || (id ? `用户#${id}` : "-");

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/app/bugs")} className="text-sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回缺陷列表
      </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-border/60 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-500" /> {bug.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">#{bug.id} · 由 {nameOf(bug.reporterId)} 提交 · 负责人 {nameOf(bug.assigneeId)}</p>
          </div>
          <div className="flex items-center gap-2">
            {bug.severity && <Badge className="bg-red-50 text-red-600 border-red-200">{bug.severity}</Badge>}
            <Badge style={{ backgroundColor: `${status.color}15`, color: status.color }}>{status.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1">所属模块</h3>
            <p className="text-sm">{bug.moduleName || "-"}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1">测试环境</h3>
            <p className="text-sm">{bug.environment || "-"}</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">复现步骤</h3>
          <pre className="text-sm whitespace-pre-wrap font-sans">{bug.description || "-"}</pre>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-green-50/50 rounded-lg border border-green-200/50">
            <h3 className="text-xs font-medium text-green-700 mb-1">预期结果</h3>
            <p className="text-sm">{bug.expectedResult || "-"}</p>
          </div>
          <div className="p-3 bg-red-50/50 rounded-lg border border-red-200/50">
            <h3 className="text-xs font-medium text-red-700 mb-1">实际结果</h3>
            <p className="text-sm">{bug.actualResult || "-"}</p>
          </div>
        </div>
      </motion.div>

      {/* 修复说明 */}
      {bug.rootCause && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-border/60 p-6">
          <h3 className="text-sm font-semibold mb-3">根因 / 修复说明</h3>
          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200/50">
            <p className="text-sm">{bug.rootCause}</p>
            {bug.fixerId && <p className="text-xs text-muted-foreground mt-2">修复人: {nameOf(bug.fixerId)}</p>}
          </div>
        </motion.div>
      )}

      {/* 验证（仅测试可操作，FIXED → VERIFIED / REOPENED），与后端门禁一致 */}
      {bug.status === "FIXED" && hasPermission("bug:close") && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">缺陷验证（修复人不能验证自己修的缺陷）</h3>
          </div>
          <div className="space-y-3">
            <Textarea value={verifyComment} onChange={(e) => setVerifyComment(e.target.value)}
              placeholder="验证备注（不通过时必填）" rows={2} />
            <div className="flex gap-3">
              <Button onClick={() => changeStatus("VERIFIED", "验证通过")} className="bg-green-500 hover:bg-green-600 text-white">
                <CheckCircle2 className="w-4 h-4 mr-1" /> 验证通过
              </Button>
              <Button onClick={() => { if (!verifyComment) { toast.error("请填写不通过原因"); return; } changeStatus("REOPENED", "已重新打开"); }}
                variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                <XCircle className="w-4 h-4 mr-1" /> 验证不通过
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 关闭（VERIFIED → CLOSED） */}
      {bug.status === "VERIFIED" && hasPermission("bug:close") && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-border/60 p-6">
          <Button onClick={() => changeStatus("CLOSED", "缺陷已关闭")} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">
            <CheckCircle2 className="w-4 h-4 mr-1" /> 关闭缺陷
          </Button>
        </motion.div>
      )}

      <FlowPath entityType="BUG" entityId={bugId} />
    </div>
  );
}
