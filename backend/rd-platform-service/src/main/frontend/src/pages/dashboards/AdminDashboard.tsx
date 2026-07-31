import { useRole } from "@/contexts/RoleContext";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Users, FolderKanban, Activity, ArrowRight, Settings, Bell, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { auditLogApi, projectApi, userApi } from "@/services/api";
import MyTodoPanel from "@/components/MyTodoPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProject } from "@/contexts/ProjectContext";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { levelInfo } = useProject();

  useEffect(() => {
    Promise.all([
      auditLogApi.list({ page: 1, size: 10 }).catch(() => ({ data: { records: [] } })),
      projectApi.list({ page: 1, size: 50 }).catch(() => ({ data: { records: [] } })),
      userApi.list().catch(() => ({ data: [] })),
    ]).then(([logRes, projRes, userRes]) => {
      setAuditLogs(logRes.data?.records || logRes.data || []);
      setProjects(projRes.data?.records || projRes.data || []);
      setUsers(userRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "系统用户", value: users.length || 5, icon: Users, color: "#0088ff", bg: "bg-blue-50", path: "/app/settings" },
    { label: "项目总数", value: projects.length || 1, icon: FolderKanban, color: "#8b5cf6", bg: "bg-purple-50", path: "/app/projects" },
    { label: "审计记录", value: auditLogs.length || 0, icon: Shield, color: "#f59e0b", bg: "bg-amber-50", path: "/app/audit" },
    { label: "当前档位", value: levelInfo.label, icon: Activity, color: levelInfo.color, bg: "bg-emerald-50", path: "/app/settings" },
  ];

  const operationColors: Record<string, string> = {
    CREATE: "#10b981",
    UPDATE: "#0088ff",
    DELETE: "#ef4444",
    LOGIN: "#8b5cf6",
  };

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return "刚刚";
    if (diff < 60) return `${diff}分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
    return `${Math.floor(diff / 1440)}天前`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">今天也是高效的一天</h2>
          <p className="text-sm text-muted-foreground mt-1">万物归一，秩序自生 · 让每一次交付都值得信赖</p>
        </div>
        <Button onClick={() => setLocation("/app/settings")} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">
          <Settings className="w-4 h-4 mr-1" /> 系统管理
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => setLocation(stat.path)}
            className="bg-white rounded-xl border border-border/60 p-5 hover:shadow-md hover:shadow-[#0088ff]/5 transition-all duration-300 cursor-pointer group"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              最近操作记录
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/app/audit")} className="text-xs text-[#0088ff]">
              查看全部 <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {auditLogs.slice(0, 6).map((log: any, i: number) => (
              <div
                key={log.id || i}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-xs font-medium">
                  {(log.username || "系")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{log.username || "系统"}</span>
                    <span className="text-muted-foreground"> {log.operation === "CREATE" ? "创建了" : log.operation === "UPDATE" ? "更新了" : log.operation === "DELETE" ? "删除了" : "操作了"} </span>
                    <span className="font-medium text-[#0088ff]">{log.module || ""}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.ipAddress || ""}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(log.createdAt)}</span>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">暂无操作记录</div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-border/60 p-5"
        >
          <h3 className="text-sm font-semibold mb-4">系统管理入口</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start h-10" onClick={() => setLocation("/app/settings")}>
              <Users className="w-4 h-4 mr-2 text-[#0088ff]" /> 用户与权限管理
            </Button>
            <Button variant="outline" className="w-full justify-start h-10" onClick={() => setLocation("/app/audit")}>
              <Shield className="w-4 h-4 mr-2 text-amber-500" /> 审计日志
            </Button>
            <Button variant="outline" className="w-full justify-start h-10" onClick={() => setLocation("/app/projects")}>
              <FolderKanban className="w-4 h-4 mr-2 text-purple-500" /> 项目管理
            </Button>
            <Button variant="outline" className="w-full justify-start h-10" onClick={() => setLocation("/app/notifications")}>
              <Bell className="w-4 h-4 mr-2 text-red-500" /> 通知中心
            </Button>
          </div>

          {/* System Info */}
          <div className="mt-6 pt-4 border-t border-border/40">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">系统信息</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">平台版本</span>
                <span className="font-medium">V3.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">框架档位</span>
                <span className="font-medium" style={{ color: levelInfo.color }}>{levelInfo.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">运行状态</span>
                <span className="font-medium text-green-600">正常</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
