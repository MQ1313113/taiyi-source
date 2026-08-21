import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Search, Users, Calendar, MoreVertical, Edit2, Archive, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { projectApi } from "@/services/api";
import { toast } from "sonner";
import { useProject } from "@/contexts/ProjectContext";
import { useLocation } from "wouter";

const gearColors: Record<string, string> = { L1: "#10b981", L2: "#0088ff", L3: "#8b5cf6", LIGHTWEIGHT: "#10b981", STANDARD: "#0088ff", FULL: "#8b5cf6" };
const gearLabels: Record<string, string> = { L1: "轻量档 L1", L2: "标准档 L2", L3: "完整档 L3", LIGHTWEIGHT: "轻量档 L1", STANDARD: "标准档 L2", FULL: "完整档 L3" };
const statusLabels: Record<string, string> = { PLANNING: "规划中", ACTIVE: "进行中", PAUSED: "已暂停", CLOSED: "已结束" };
const statusColors: Record<string, string> = { PLANNING: "#6b7280", ACTIVE: "#10b981", PAUSED: "#f59e0b", CLOSED: "#6b7280" };

export default function ProjectList() {
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", gear: "L2", visibility: "TEAM", startDate: "", endDate: "" });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ projectName: "", description: "", startDate: "", endDate: "" });

  // Delete confirm
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchProjects = () => {
    setLoading(true);
    projectApi.list({ page: 1, size: 50 }).then((res: any) => {
      const records = res.data?.records || res.data || [];
      setProjects(records.map((p: any) => ({
        ...p,
        name: p.projectName || p.name,
        gear: p.gearLevel || p.gear,
        memberCount: p.memberCount || 0
      })));
    }).catch(() => {
      setProjects([]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = () => {
    if (!form.name || !form.description || !form.startDate || !form.endDate) {
      toast.error("请填写所有必填字段"); return;
    }
    // 修复:此前取不存在的 localStorage.userId 导致负责人恒为1(admin)
    let uid = 1;
    try { uid = JSON.parse(localStorage.getItem('taiyi_user') || '{}').userId || 1; } catch {}
    const payload = {
      projectName: form.name,
      description: form.description,
      gearLevel: form.gear,
      visibility: form.visibility,
      ownerId: uid,
      startDate: form.startDate,
      endDate: form.endDate
    };
    projectApi.create(payload).then(() => {
      toast.success("项目创建成功");
      setShowCreate(false);
      setForm({ name: "", description: "", gear: "L2", visibility: "TEAM", startDate: "", endDate: "" });
      fetchProjects();
    }).catch((err: any) => toast.error(err?.response?.data?.message || err?.message || "创建失败"));
  };

  const handleEdit = (project: any) => {
    setEditTarget(project);
    setEditForm({
      projectName: project.projectName || "",
      description: project.description || "",
      startDate: project.startDate || "",
      endDate: project.endDate || ""
    });
    setShowEdit(true);
  };

  const handleEditSubmit = () => {
    if (!editForm.projectName) { toast.error("项目名称不能为空"); return; }
    projectApi.update(editTarget.id, { ...editForm, ownerId: editTarget.ownerId || 1 })
      .then(() => { toast.success("项目信息已更新"); setShowEdit(false); setEditTarget(null); fetchProjects(); })
      .catch((err: any) => toast.error(err?.response?.data?.message || "更新失败"));
  };

  const handleStatusChange = (project: any, newStatus: string) => {
    projectApi.changeStatus(project.id, { status: newStatus })
      .then(() => { toast.success(`项目已${statusLabels[newStatus]}`); fetchProjects(); })
      .catch((err: any) => toast.error(err?.response?.data?.message || "操作失败"));
  };

  const handleDelete = (project: any) => {
    setDeleteTarget(project);
    setShowDelete(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    projectApi.delete(deleteTarget.id)
      .then(() => { toast.success("项目已删除"); setShowDelete(false); setDeleteTarget(null); fetchProjects(); })
      .catch((err: any) => { toast.error(err?.response?.data?.message || "删除失败"); setShowDelete(false); });
  };

  // Listen for quick action events
  useEffect(() => {
    const handler = (e: any) => { if (e.detail?.action === "create-project") setShowCreate(true); };
    window.addEventListener("taiyi-quick-action", handler);
    return () => window.removeEventListener("taiyi-quick-action", handler);
  }, []);

  const filtered = projects.filter(p => {
    const matchText = p.projectName?.includes(searchText) || p.description?.includes(searchText);
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchText && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#0088ff]" />
            项目管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理所有研发项目与档位配置</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-lg shadow-sm shadow-[#0088ff]/20">
          <Plus className="w-4 h-4 mr-1" /> 新建项目
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索项目..." value={searchText} onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 bg-muted/50 border-0 rounded-xl" />
        </div>
        <div className="flex gap-1">
          {[{ key: "ALL", label: "全部" }, { key: "ACTIVE", label: "进行中" }, { key: "PLANNING", label: "规划中" }, { key: "PAUSED", label: "已暂停" }, { key: "CLOSED", label: "已结束" }].map((f) => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${statusFilter === f.key ? "bg-[#0088ff] text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((project, i) => (
          <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-border/60 p-5 hover:shadow-md hover:shadow-[#0088ff]/5 transition-all duration-300 group relative">
            {/* Action Menu */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => handleEdit(project)}>
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> 编辑
                  </DropdownMenuItem>
                  {project.status !== "ACTIVE" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(project, "ACTIVE")}>
                      <Play className="w-3.5 h-3.5 mr-2" /> 启动
                    </DropdownMenuItem>
                  )}
                  {project.status === "ACTIVE" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(project, "PAUSED")}>
                      <Pause className="w-3.5 h-3.5 mr-2" /> 暂停
                    </DropdownMenuItem>
                  )}
                  {project.status !== "CLOSED" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(project, "CLOSED")}>
                      <Archive className="w-3.5 h-3.5 mr-2" /> 归档
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500 focus:text-red-600" onClick={() => handleDelete(project)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Card Content */}
            <div onClick={() => setLocation(`/app/projects/${project.id}`)} className="cursor-pointer">
              <div className="flex items-start justify-between mb-3 pr-8">
                <div>
                  <h3 className="text-sm font-semibold group-hover:text-[#0088ff] transition-colors">{project.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                </div>
                <Badge className="text-[10px] shrink-0" style={{ backgroundColor: `${gearColors[project.gear]}15`, color: gearColors[project.gear] }}>
                  {gearLabels[project.gear] || project.gear}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {project.memberCount || 0}人
                </span>
                {project.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {project.startDate}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: statusColors[project.status], color: statusColors[project.status] }}>
                  {statusLabels[project.status] || project.status}
                </Badge>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 text-sm text-muted-foreground">暂无项目数据</div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">项目名称 <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="请输入项目名称" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">项目描述 <span className="text-red-500">*</span></Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="请输入项目描述" rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">项目类型 <span className="text-red-500">*</span></Label>
              <Select value={form.visibility} onValueChange={(v) => setForm({...form, visibility: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEAM">团队项目 - 正式立项,全流程管控</SelectItem>
                  <SelectItem value="PRIVATE">个人项目 - 单人负责的正式项目(独立维护/独立测试),仅本人与管理员可见</SelectItem>
                </SelectContent>
              </Select>
              {form.visibility === "PRIVATE" && (
                <p className="text-[11px] text-amber-600">适用于由您一人负责的项目(如老系统维护、外部硬件测试)。固定轻量档、不可加成员;需要多人协作时请建团队项目</p>
              )}
            </div>
            {form.visibility !== "PRIVATE" && <div className="space-y-2">
              <Label className="text-sm font-medium">框架档位 <span className="text-red-500">*</span></Label>
              <Select value={form.gear} onValueChange={(v) => setForm({...form, gear: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">轻量档 L1 - 适合小型项目</SelectItem>
                  <SelectItem value="L2">标准档 L2 - 适合中型项目</SelectItem>
                  <SelectItem value="L3">完整档 L3 - 适合大型项目</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">档位决定表单必填字段级别和流程节点行为</p>
            </div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">开始日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">结束日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">创建项目</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">项目名称 <span className="text-red-500">*</span></Label>
              <Input value={editForm.projectName} onChange={(e) => setEditForm({...editForm, projectName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">项目描述</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">开始日期</Label>
                <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({...editForm, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">结束日期</Label>
                <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button onClick={handleEditSubmit} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除项目</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            确认删除项目 <span className="font-medium text-foreground">「{deleteTarget?.name}」</span>？此操作不可恢复，项目下的关联数据（需求、任务、缺陷等）将失去项目归属。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteTarget(null); }}>取消</Button>
            <Button onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
