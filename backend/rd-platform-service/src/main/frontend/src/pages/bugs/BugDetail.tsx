import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bug, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: "待确认", color: "#f59e0b" },
  CONFIRMED: { label: "已确认", color: "#ef4444" },
  IN_PROGRESS: { label: "修复中", color: "#0088ff" },
  FIXED: { label: "已修复", color: "#8b5cf6" },
  VERIFIED: { label: "已验证", color: "#10b981" },
  CLOSED: { label: "已关闭", color: "#374151" },
  REJECTED: { label: "已拒绝", color: "#6b7280" },
};

export default function BugDetail() {
  const [, setLocation] = useLocation();
  const [verifyComment, setVerifyComment] = useState("");

  const bug = {
    id: 1, title: "支付接口超时导致订单重复", status: "FIXED",
    severity: "CRITICAL", priority: "HIGH",
    description: "在网络不稳定的情况下，支付接口响应超时后前端重试导致订单被重复创建",
    stepsToReproduce: "1. 打开支付页面\n2. 选择微信支付\n3. 在支付过程中模拟网络延迟>30s\n4. 观察订单列表",
    expectedResult: "支付超时后提示用户重试，不会创建重复订单",
    actualResult: "支付超时后自动重试，创建了两笔相同的订单",
    environment: "Chrome 120 / 测试环境",
    reporterName: "赵测试", assigneeName: "张三",
    createdAt: "2026-06-08", fixedAt: "2026-06-09",
    fixDescription: "添加了幂等性校验，基于订单号+支付流水号去重，超时后不再自动重试",
  };

  const status = statusConfig[bug.status] || statusConfig.OPEN;

  const handleVerify = (passed: boolean) => {
    if (passed) {
      toast.success("验证通过！Bug已关闭（R3交叉确认规则：原提交者验证）");
    } else {
      if (!verifyComment) { toast.error("请填写验证不通过的原因"); return; }
      toast.error("验证不通过，Bug已重新打开");
    }
  };

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
            <p className="text-sm text-muted-foreground mt-1">#{bug.id} · 由 {bug.reporterName} 提交于 {bug.createdAt}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-50 text-red-600 border-red-200">{bug.severity}</Badge>
            <Badge style={{ backgroundColor: `${status.color}15`, color: status.color }}>{status.label}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1">缺陷描述</h3>
            <p className="text-sm">{bug.description}</p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1">测试环境</h3>
            <p className="text-sm">{bug.environment}</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">复现步骤</h3>
          <pre className="text-sm whitespace-pre-wrap">{bug.stepsToReproduce}</pre>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-green-50/50 rounded-lg border border-green-200/50">
            <h3 className="text-xs font-medium text-green-700 mb-1">预期结果</h3>
            <p className="text-sm">{bug.expectedResult}</p>
          </div>
          <div className="p-3 bg-red-50/50 rounded-lg border border-red-200/50">
            <h3 className="text-xs font-medium text-red-700 mb-1">实际结果</h3>
            <p className="text-sm">{bug.actualResult}</p>
          </div>
        </div>
      </motion.div>

      {/* Fix Info */}
      {bug.fixDescription && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-border/60 p-6">
          <h3 className="text-sm font-semibold mb-3">修复说明</h3>
          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200/50">
            <p className="text-sm">{bug.fixDescription}</p>
            <p className="text-xs text-muted-foreground mt-2">修复人: {bug.assigneeName} · 修复时间: {bug.fixedAt}</p>
          </div>
        </motion.div>
      )}

      {/* R3 Cross Verification */}
      {bug.status === "FIXED" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">R3交叉确认 - 等待原提交者验证</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            根据R3规则，Bug修复后需由原提交者（{bug.reporterName}）验证确认方可关闭
          </p>
          <div className="space-y-3">
            <Textarea value={verifyComment} onChange={(e) => setVerifyComment(e.target.value)}
              placeholder="验证备注（不通过时必填）" rows={2} />
            <div className="flex gap-3">
              <Button onClick={() => handleVerify(true)} className="bg-green-500 hover:bg-green-600 text-white">
                <CheckCircle2 className="w-4 h-4 mr-1" /> 验证通过
              </Button>
              <Button onClick={() => handleVerify(false)} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                <XCircle className="w-4 h-4 mr-1" /> 验证不通过
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
