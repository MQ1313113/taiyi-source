import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { TestTube2, Bug, CheckCircle2, AlertTriangle, FileCheck, ArrowRight, Plus, Play, Clock } from "lucide-react";
import { bugApi, testCaseApi } from "@/services/api";
import MyTodoPanel from "@/components/MyTodoPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestExecuteDialog, BugVerifyDialog, SubmitBugDialog } from "@/components/dialogs";

export default function QADashboard() {
  const { info } = useRole();
  const [, setLocation] = useLocation();
  const [bugs, setBugs] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [testExecuteOpen, setTestExecuteOpen] = useState(false);
  const [submitBugOpen, setSubmitBugOpen] = useState(false);
  const [bugVerifyOpen, setBugVerifyOpen] = useState(false);
  const [bugVerifyConfig, setBugVerifyConfig] = useState({ bugId: "", bugTitle: "" });

  const loadData = () => {
    Promise.all([
      bugApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
      testCaseApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
    ]).then(([bugRes, tcRes]) => {
      setBugs(bugRes.data?.records || bugRes.data || []);
      setTestCases(tcRes.data?.records || tcRes.data || []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const pendingVerify = bugs.filter(b => b.status === "FIXED");
  const activeBugs = bugs.filter(b => b.status !== "CLOSED" && b.status !== "VERIFIED");
  const totalCases = testCases.length;
  const passedCases = testCases.filter(tc => tc.status === "PASSED").length;
  const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0;

  const stats = [
    { label: "待验证修复", value: pendingVerify.length, icon: FileCheck, color: "#f59e0b", bg: "bg-amber-50", href: "/app/bugs" },
    { label: "活跃Bug", value: activeBugs.length, icon: Bug, color: "#ef4444", bg: "bg-red-50", href: "/app/bugs" },
    { label: "用例通过率", value: `${passRate}%`, icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50", href: "/app/testing" },
    { label: "测试用例总数", value: totalCases, icon: TestTube2, color: "#0088ff", bg: "bg-blue-50", href: "/app/testing" },
  ];

  const severityConfig: Record<string, { label: string; color: string }> = {
    BLOCKER: { label: "阻塞", color: "#dc2626" },
    CRITICAL: { label: "严重", color: "#ea580c" },
    MAJOR: { label: "重要", color: "#d97706" },
    MINOR: { label: "一般", color: "#65a30d" },
    TRIVIAL: { label: "轻微", color: "#6b7280" },
  };

  const bugStatusConfig: Record<string, { label: string; color: string }> = {
    OPEN: { label: "新建", color: "#6b7280" },
    CONFIRMED: { label: "已确认", color: "#f59e0b" },
    IN_PROGRESS: { label: "修复中", color: "#0088ff" },
    FIXED: { label: "已修复", color: "#10b981" },
    VERIFIED: { label: "已验证", color: "#8b5cf6" },
    CLOSED: { label: "已关闭", color: "#6b7280" },
  };

  const handleVerifyBug = (bug: any) => {
    setBugVerifyConfig({ bugId: bug.id?.toString() || "", bugTitle: bug.title || "" });
    setBugVerifyOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Dialogs */}
      <TestExecuteDialog open={testExecuteOpen} onOpenChange={setTestExecuteOpen} />
      <SubmitBugDialog open={submitBugOpen} onOpenChange={setSubmitBugOpen} onSuccess={loadData} />
      <BugVerifyDialog open={bugVerifyOpen} onOpenChange={(o) => { setBugVerifyOpen(o); if (!o) loadData(); }} {...bugVerifyConfig} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">今天也是高效的一天</h2>
          <p className="text-sm text-muted-foreground mt-1">万物归一，秩序自生 · 让每一次交付都值得信赖</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-8 text-xs rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white"
            onClick={() => setTestExecuteOpen(true)}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />执行测试
          </Button>
          <Button variant="outline" className="h-8 text-xs rounded-xl" onClick={() => setSubmitBugOpen(true)}>
            <Bug className="w-3.5 h-3.5 mr-1.5" />提交Bug
          </Button>
          <Link href="/app/testing">
            <Button variant="outline" className="h-8 text-xs rounded-xl">
              <FileCheck className="w-3.5 h-3.5 mr-1.5" />新建用例
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-xl border border-border/60 p-5 hover:shadow-md hover:shadow-[#0088ff]/5 transition-all duration-300 cursor-pointer group"
            onClick={() => setLocation(stat.href)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 我的待办行动区：可在工作台直接一键处理（按后端授权动作渲染） */}
      <MyTodoPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verification Queue - Click to verify */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-500" />
              待验证修复
            </h3>
            <Link href="/app/bugs">
              <Button variant="ghost" size="sm" className="text-xs text-[#0088ff]">
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {pendingVerify.slice(0, 5).map((bug: any) => (
              <div
                key={bug.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-all cursor-pointer group"
                onClick={() => handleVerifyBug(bug)}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityConfig[bug.severity]?.color || "#d97706" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bug.title || "未命名Bug"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    修复人: {bug.assigneeName || "未知"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]" style={{
                  borderColor: severityConfig[bug.severity]?.color,
                  color: severityConfig[bug.severity]?.color
                }}>
                  {severityConfig[bug.severity]?.label || bug.severity}
                </Badge>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {pendingVerify.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">暂无待验证Bug</div>
            )}
          </div>
        </motion.div>

        {/* Active Bugs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bug className="w-4 h-4 text-red-500" />
              活跃Bug列表
            </h3>
            <Link href="/app/bugs">
              <Button variant="ghost" size="sm" className="text-xs text-[#0088ff]">
                查看全部 <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {activeBugs.slice(0, 5).map((bug: any) => (
              <div
                key={bug.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bug.title || "未命名Bug"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bug.reporterName || "未知"} 提交</p>
                </div>
                <Badge className="text-[10px]" style={{
                  backgroundColor: `${bugStatusConfig[bug.status]?.color}15`,
                  color: bugStatusConfig[bug.status]?.color
                }}>
                  {bugStatusConfig[bug.status]?.label || bug.status}
                </Badge>
              </div>
            ))}
            {activeBugs.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">暂无活跃Bug</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
