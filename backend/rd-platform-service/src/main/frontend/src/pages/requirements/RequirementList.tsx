import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, FileText, MoreHorizontal, Eye, Edit, Trash2,
  CheckCircle2, GitBranch, Scissors, Send
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { requirementApi, userApi } from "@/services/api";
import ImportDialog from "@/components/ImportDialog";
import { Upload } from "lucide-react";

const statusMap: Record<string, string> = {
  DRAFT: "草稿", REVIEWING: "评审中", DEVELOPING: "开发中", DEVELOPED: "待提测",
  TESTING: "测试中", TESTED: "测试完成", RELEASING: "待上线", CLOSED: "已关闭", CANCELLED: "已取消",
};
const statusColors: Record<string, string> = {
  "草稿": "bg-gray-100 text-gray-600",
  "评审中": "bg-[#f97316]/10 text-[#f97316]",
  "开发中": "bg-[#0088ff]/10 text-[#0088ff]",
  "待提测": "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  "测试中": "bg-[#06b6d4]/10 text-[#06b6d4]",
  "测试完成": "bg-[#22c55e]/10 text-[#22c55e]",
  "待上线": "bg-[#eab308]/10 text-[#eab308]",
  "已关闭": "bg-[#22c55e]/10 text-[#22c55e]",
  "已取消": "bg-gray-100 text-gray-500",
  "已提交": "bg-[#f97316]/10 text-[#f97316]",
  "待拆解": "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  "已完成": "bg-[#22c55e]/10 text-[#22c55e]",
  "已驳回": "bg-red-100 text-red-600",
};
const priorityMap: Record<string, string> = { HIGH: "P0", MEDIUM: "P1", LOW: "P2" };
const typeMap: Record<string, string> = { FUNCTIONAL: "新功能", NON_FUNCTIONAL: "非功能", OPTIMIZATION: "优化" };

export default function RequirementList() {
  const [, setLocation] = useLocation();
  const { role, hasPermission } = useRole();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const [users, setUsers] = useState<any[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const fetchRequirements = () => {
    setLoading(true);
    requirementApi.list({ page: 1, size: 50 }).then((res: any) => {
      const records = res.data?.records || res.data || [];
      setRequirements(records);
    }).catch(() => {
      setRequirements([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequirements();
    userApi.listWithRoles().then((res: any) => {
      setUsers((res.data || []).filter((u: any) => u.roleCode !== 'sys_admin' && u.roleCode !== 'admin'));
    }).catch(() => {});
  }, []);

  // 获取产品经理ID列表用于评审
  const techLeaderIds = users.filter(u => u.roleCode === 'pm').map(u => u.id);

  const handleStatusChange = (id: number, status: string) => {
    requirementApi.changeStatus(id, { status }).then(() => {
      toast.success("状态更新成功");
      fetchRequirements();
    }).catch((err: any) => toast.error(err?.response?.data?.message || "操作失败"));
  };

  const filtered = requirements.filter(req => {
    const statusLabel = statusMap[req.status] || req.status;
    if (filterStatus !== "all" && req.status !== filterStatus) return false;
    if (filterPriority !== "all" && req.priority !== filterPriority) return false;
    if (searchText && !req.title?.includes(searchText)) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">需求管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">共 {requirements.length} 个需求</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("req:create") && (
            <Link href="/app/requirements/create">
              <Button className="bg-[#ff5500] hover:bg-[#e64d00] text-white rounded-xl taiyi-btn-active h-9">
                <Plus className="w-4 h-4 mr-1.5" />新建需求
              </Button>
            </Link>
          )}
          {hasPermission("req:create") && (
            <Button variant="outline" className="rounded-xl h-9 text-sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />批量导入
            </Button>
          )}
          {hasPermission("req:change") && (
            <Button variant="outline" className="rounded-xl h-9 text-sm" onClick={() => toast.info("批量变更", { description: "请先选择需要变更的需求" })}>
              <GitBranch className="w-4 h-4 mr-1.5" />批量变更
            </Button>
          )}
        </div>
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title="批量导入需求"
          templateFileName="requirement_import_template.csv"
          tips={[
            "项目名称、负责人请填写系统中已存在的名称/昵称，负责人须为产品经理或开发人员",
            "验收标准需采用 Given-When-Then 格式（如：当输入正确账号密码时，登录成功）",
            "期望完成日期格式为 YYYY-MM-DD（如 2026-08-01）",
            "某一行失败不影响其他行，导入后会列出失败行号与原因",
          ]}
          downloadTemplate={() => requirementApi.downloadImportTemplate()}
          importFile={(f) => requirementApi.importFile(f)}
          onImported={fetchRequirements}
        />
      </div>

      {/* Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索需求标题..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 h-9 rounded-xl bg-muted/30 border-0" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9 rounded-xl"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="DRAFT">草稿</SelectItem>
                <SelectItem value="REVIEWING">评审中</SelectItem>
                <SelectItem value="DEVELOPING">开发中</SelectItem>
                <SelectItem value="DEVELOPED">待提测</SelectItem>
                <SelectItem value="TESTING">测试中</SelectItem>
                <SelectItem value="TESTED">测试完成</SelectItem>
                <SelectItem value="RELEASING">待上线</SelectItem>
                <SelectItem value="CLOSED">已关闭</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32 h-9 rounded-xl"><SelectValue placeholder="优先级" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="HIGH">P0 紧急</SelectItem>
                <SelectItem value="MEDIUM">P1 重要</SelectItem>
                <SelectItem value="LOW">P2 一般</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requirement Table */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">ID</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">标题</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-16">优先级</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20">状态</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20">类型</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">截止日期</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const statusLabel = statusMap[req.status] || req.status;
                  const priorityLabel = priorityMap[req.priority] || req.priority;
                  const typeLabel = typeMap[req.type] || req.type;
                  return (
                    <tr key={req.id} className="border-b border-border/40 hover:bg-[#0088ff]/3 transition-colors group">
                      <td className="px-4 py-3.5">
                        <Link href={`/app/requirements/${req.id}`}>
                          <span className="text-xs font-mono text-[#0088ff] hover:underline cursor-pointer">REQ-{String(req.id).padStart(3, '0')}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link href={`/app/requirements/${req.id}`}>
                          <p className="text-sm font-medium text-foreground hover:text-[#0088ff] transition-colors cursor-pointer">{req.title}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          req.priority === "HIGH" ? "bg-[#ef4444]/10 text-[#ef4444]" :
                          req.priority === "MEDIUM" ? "bg-[#f97316]/10 text-[#f97316]" : "bg-[#22c55e]/10 text-[#22c55e]"
                        }`}>
                          {priorityLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="secondary" className={`text-[10px] h-5 border-0 ${statusColors[statusLabel] || ""}`}>
                          {statusLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-muted-foreground">{typeLabel}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-muted-foreground">{req.expectedCompletionDate}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setLocation(`/app/requirements/${req.id}`)}>
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => setLocation(`/app/requirements/${req.id}`)}>
                                <Eye className="w-3.5 h-3.5 mr-2" />查看详情
                              </DropdownMenuItem>
                              {hasPermission("req:edit") && (
                                <DropdownMenuItem onClick={() => toast.info("编辑需求")}>
                                  <Edit className="w-3.5 h-3.5 mr-2" />编辑需求
                                </DropdownMenuItem>
                              )}
                              {hasPermission("req:review") && req.status === "DRAFT" && (
                                <DropdownMenuItem onClick={() => {
                                  if (techLeaderIds.length === 0) {
                                    toast.error("系统中暂无产品经理角色用户，无法提交评审"); return;
                                  }
                                  requirementApi.submitReview(req.id, { reviewerIds: techLeaderIds }).then(() => {
                                    toast.success("已提交评审，等待产品经理审核");
                                    fetchRequirements();
                                  }).catch((err: any) => toast.error(err?.message || "提交评审失败"));
                                }}>
                                  <Send className="w-3.5 h-3.5 mr-2" />提交评审
                                </DropdownMenuItem>
                              )}
                              {hasPermission("req:review") && req.status === "REVIEWING" && (
                                <DropdownMenuItem onClick={() => {
                                  requirementApi.review(req.id, { result: "APPROVED", comment: "评审通过" }).then(() => {
                                    toast.success("评审通过，需求进入开发阶段");
                                    fetchRequirements();
                                  }).catch((err: any) => toast.error(err?.message || "评审操作失败"));
                                }}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" />评审通过
                                </DropdownMenuItem>
                              )}
                              {hasPermission("task:create") && ["DEVELOPING", "DEVELOPED"].includes(req.status) && (
                                <DropdownMenuItem onClick={() => setLocation(`/app/requirements/${req.id}`)}>
                                  <Scissors className="w-3.5 h-3.5 mr-2" />拆解任务
                                </DropdownMenuItem>
                              )}
                              {hasPermission("req:change") && !["DRAFT", "CLOSED", "CANCELLED"].includes(req.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setLocation("/app/changes")}>
                                    <GitBranch className="w-3.5 h-3.5 mr-2" />发起变更
                                  </DropdownMenuItem>
                                </>
                              )}
                              {hasPermission("req:delete") && req.status === "DRAFT" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => {
                                    requirementApi.delete(req.id).then(() => {
                                      toast.success("需求已删除");
                                      fetchRequirements();
                                    }).catch((err: any) => toast.error(err?.message || "删除失败"));
                                  }}>
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />删除
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
            <span className="text-xs text-muted-foreground">共 {filtered.length} 条记录</span>
          </div>
        </CardContent>
      </Card>

      {/* Role Permission Hint */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          当前角色权限：
          {role === "pm" && "可新建、编辑、删除需求，发起评审和变更"}
          {}
          {role === "developer" && "仅可查看需求详情"}
          {role === "qa" && "仅可查看需求详情"}
          {role === "sys_admin" && "超级管理员：可对所有需求进行新建、编辑、删除等全部操作"}
        </p>
      </div>
    </div>
  );
}
