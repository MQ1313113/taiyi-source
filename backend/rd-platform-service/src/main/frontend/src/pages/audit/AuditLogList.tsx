import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Search, Download, ChevronDown, ChevronRight, Clock, User, Globe, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditLogApi } from "@/services/api";

const actionConfig: Record<string, { label: string; color: string }> = {
  CREATE: { label: "创建", color: "#10b981" },
  UPDATE: { label: "更新", color: "#0088ff" },
  DELETE: { label: "删除", color: "#ef4444" },
  LOGIN: { label: "登录", color: "#8b5cf6" },
  STATUS_CHANGE: { label: "状态变更", color: "#f59e0b" },
  EXPORT: { label: "导出", color: "#6b7280" },
  IMPORT: { label: "导入", color: "#06b6d4" },
};

function inferAction(operation: string): string {
  if (!operation) return "UPDATE";
  if (operation.includes("创建") || operation.includes("新增") || operation.includes("提交")) return "CREATE";
  if (operation.includes("删除") || operation.includes("移除")) return "DELETE";
  if (operation.includes("登录")) return "LOGIN";
  if (operation.includes("状态") || operation.includes("审批") || operation.includes("驳回")) return "STATUS_CHANGE";
  if (operation.includes("导出")) return "EXPORT";
  if (operation.includes("导入") || operation.includes("批量")) return "IMPORT";
  return "UPDATE";
}

// Pretty-print JSON with Chinese field name mapping
const fieldNameMap: Record<string, string> = {
  projectName: "项目名称", projectCode: "项目编码", description: "描述",
  title: "标题", status: "状态", priority: "优先级", assignee: "负责人",
  ownerId: "负责人ID", startDate: "开始日期", endDate: "结束日期",
  createdAt: "创建时间", updatedAt: "更新时间", username: "用户名",
  realName: "姓名", email: "邮箱", phone: "手机号", roleCode: "角色编码",
  roleName: "角色名称", moduleName: "所属模块", severity: "严重程度",
  stepsToReproduce: "复现步骤", expectedResult: "预期结果", actualResult: "实际结果",
  acceptanceCriteria: "验收标准", businessValue: "业务价值", functionalDesc: "功能描述",
  gearLevel: "档位", sprintName: "迭代名称", goal: "目标",
  projectId: "所属项目ID", requirementId: "关联需求ID", taskTitle: "任务标题",
  estimatedHours: "预估工时", deadline: "截止日期", taskType: "任务类型",
  id: "ID", deleted: "已删除", name: "名称", code: "编码",
};

function formatFieldName(key: string): string {
  return fieldNameMap[key] || key;
}

function tryParseJSON(str: string | null | undefined): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function DataDiffView({ beforeData, afterData }: { beforeData: any; afterData: any }) {
  if (!beforeData && !afterData) return <span className="text-muted-foreground text-xs">无详细数据</span>;

  // Compute changed fields
  if (beforeData && afterData) {
    const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
    const changes: { key: string; before: any; after: any }[] = [];
    allKeys.forEach(key => {
      if (key === "updatedAt" || key === "createdAt") return; // skip timestamp noise
      const bv = beforeData[key];
      const av = afterData[key];
      if (JSON.stringify(bv) !== JSON.stringify(av)) {
        changes.push({ key, before: bv, after: av });
      }
    });

    if (changes.length === 0) return <span className="text-muted-foreground text-xs">无字段变更</span>;

    return (
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground mb-1">变更字段 ({changes.length}项)</div>
        {changes.map(({ key, before, after }) => (
          <div key={key} className="flex items-start gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
            <span className="font-medium text-foreground min-w-[80px] shrink-0">{formatFieldName(key)}</span>
            <span className="text-red-500 line-through max-w-[200px] truncate">{before != null ? String(before) : "空"}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-green-600 max-w-[200px] truncate">{after != null ? String(after) : "空"}</span>
          </div>
        ))}
      </div>
    );
  }

  // Only before (delete) or only after (create)
  const data = afterData || beforeData;
  const label = afterData ? "创建内容" : "删除前数据";
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {Object.entries(data).filter(([k]) => k !== "deleted" && k !== "serialVersionUID").map(([key, value]) => (
          <div key={key} className="flex gap-1 text-xs">
            <span className="text-muted-foreground min-w-[70px]">{formatFieldName(key)}:</span>
            <span className="text-foreground truncate max-w-[180px]">{value != null ? String(value) : "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditLogList() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = (p: number) => {
    setLoading(true);
    auditLogApi.list({ pageNum: p, pageSize: 20 }).then((res: any) => {
      const data = res.data;
      const records = data?.records || data || [];
      setTotal(data?.total || records.length);
      const mapped = records.map((r: any) => ({
        id: r.id,
        action: inferAction(r.operation),
        description: `[${r.module || '系统'}] ${r.operation || '操作'}`,
        operator: r.username || '系统',
        ip: r.ipAddress || '-',
        createdAt: r.createdAt,
        module: r.module,
        operation: r.operation,
        method: r.method,
        requestUrl: r.requestUrl,
        requestParams: r.requestParams,
        beforeData: r.beforeData,
        afterData: r.afterData,
        status: r.status,
        errorMsg: r.errorMsg,
        executionTime: r.executionTime,
      }));
      setLogs(mapped);
    }).catch(() => setLogs([])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  const filtered = logs.filter(l => {
    if (filterAction !== "ALL" && l.action !== filterAction) return false;
    if (searchText && !l.description?.includes(searchText) && !l.operator?.includes(searchText)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0088ff]" /> 审计日志
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">全操作留痕，记录完整操作内容与数据变更详情</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{total} 条记录</Badge>
          <Button variant="outline" className="rounded-lg" size="sm">
            <Download className="w-4 h-4 mr-1" /> 导出日志
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索操作描述或操作人..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-9 bg-muted/50 border-0 rounded-xl" />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部操作</SelectItem>
            {Object.entries(actionConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Log List */}
      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">暂无审计记录</div>
        ) : filtered.map((log, i) => {
          const action = actionConfig[log.action] || actionConfig.UPDATE;
          const isExpanded = expandedId === log.id;
          const beforeData = tryParseJSON(log.beforeData);
          const afterData = tryParseJSON(log.afterData);
          const requestParams = tryParseJSON(log.requestParams);
          const hasDetail = beforeData || afterData || requestParams || log.errorMsg;

          return (
            <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
              <div
                className={`bg-white rounded-lg border px-4 py-3 transition-colors cursor-pointer hover:bg-muted/30 ${isExpanded ? 'border-[#0088ff]/30 bg-blue-50/30' : 'border-border/40'}`}
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <div className="flex items-center gap-3">
                  {hasDetail ? (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : <div className="w-4" />}
                  <Badge className="text-[9px] w-14 justify-center shrink-0" style={{ backgroundColor: `${action.color}15`, color: action.color }}>{action.label}</Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{log.description}</span>
                    {log.status === 0 && <Badge variant="destructive" className="ml-2 text-[9px]">失败</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.operator}</span>
                    <span className="flex items-center gap-1 font-mono"><Globe className="w-3 h-3" />{log.ip}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{log.createdAt}</span>
                    {log.executionTime != null && <span className="text-[10px]">{log.executionTime}ms</span>}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && hasDetail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 mr-4 mb-2 mt-1 p-4 bg-muted/20 rounded-lg border border-border/30 space-y-4">
                      {/* Request Info */}
                      {log.requestUrl && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground font-medium min-w-[60px]">请求路径:</span>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{log.requestUrl}</code>
                        </div>
                      )}

                      {/* Request Params */}
                      {requestParams && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> 请求参数
                          </div>
                          <div className="bg-white rounded border border-border/40 p-2 text-xs overflow-x-auto">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {Object.entries(requestParams).map(([key, value]) => (
                                <div key={key} className="flex gap-1">
                                  <span className="text-muted-foreground min-w-[80px] shrink-0">{formatFieldName(key)}:</span>
                                  <span className="text-foreground truncate">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Data Changes */}
                      {(beforeData || afterData) && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> 数据变更
                          </div>
                          <div className="bg-white rounded border border-border/40 p-2">
                            <DataDiffView beforeData={beforeData} afterData={afterData} />
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {log.errorMsg && (
                        <div>
                          <div className="text-xs font-medium text-red-500 mb-1">错误信息</div>
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {log.errorMsg}
                          </div>
                        </div>
                      )}

                      {/* Method */}
                      {log.method && (
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                          <span>方法:</span>
                          <code className="bg-muted px-1 rounded">{log.method}</code>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground self-center">第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
