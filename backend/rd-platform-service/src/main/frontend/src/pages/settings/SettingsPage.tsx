import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User, Palette, Shield, Users, Puzzle, Plus, Search, MoreHorizontal, Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { userApi, roleApi, systemConfigApi } from "@/services/api";

const tabs = [
  { id: "users", label: "用户管理", icon: Users },
  { id: "roles", label: "角色权限", icon: Shield },
  { id: "profile", label: "个人信息", icon: User },
  { id: "appearance", label: "外观主题", icon: Palette },
  { id: "extensions", label: "扩展配置", icon: Puzzle },
];

const roleColorMap: Record<string, string> = {
  sys_admin: "#ef4444",
  pm: "#8b5cf6",
  dev: "#10b981",
  qa: "#f59e0b",
};

const getColorForRole = (code: string) => roleColorMap[code] || "#6b7280";

export default function SettingsPage() {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState("users");
  const [profile, setProfile] = useState({ name: "王超", email: "admin@taiyi.dev", phone: "138****8888" });


  // User management state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "", password: "", nickname: "", email: "", phone: "", roleId: "",
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [resetPwdDialogOpen, setResetPwdDialogOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  // Role management state
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState<"create" | "edit">("create");
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ roleCode: "", roleName: "", description: "", sortOrder: 99 });
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permEditingRole, setPermEditingRole] = useState<any>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [savingRole, setSavingRole] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await userApi.listWithRoles();
      setUsers(res.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await roleApi.list();
      setRoles(res.data?.data || res.data || []);
    } catch {
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await roleApi.allPermissions();
      setAllPermissions(res.data?.data || res.data || []);
    } catch {
      setAllPermissions([]);
    }
  };

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "roles") {
      fetchRoles();
      fetchPermissions();
    }
  }, [activeTab]);

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.nickname || !newUser.roleId) {
      toast.error("请填写必填项", { description: "用户名、密码、昵称和角色为必填" });
      return;
    }
    setCreating(true);
    try {
      await userApi.create({
        username: newUser.username,
        password: newUser.password,
        nickname: newUser.nickname,
        email: newUser.email || undefined,
        phone: newUser.phone || undefined,
        roleIds: [Number(newUser.roleId)],
      });
      toast.success("用户创建成功", { description: `${newUser.nickname}（${newUser.username}）已添加到系统` });
      setCreateDialogOpen(false);
      setNewUser({ username: "", password: "", nickname: "", email: "", phone: "", roleId: "" });
      fetchUsers();
    } catch (err: any) {
      toast.error("创建失败", { description: err?.response?.data?.message || "请检查用户名是否重复" });
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u =>
    !searchKeyword ||
    u.username?.includes(searchKeyword) ||
    u.nickname?.includes(searchKeyword) ||
    u.email?.includes(searchKeyword)
  );

  // Role CRUD handlers
  const openCreateRole = () => {
    setRoleDialogMode("create");
    setRoleForm({ roleCode: "", roleName: "", description: "", sortOrder: 99 });
    setEditingRole(null);
    setRoleDialogOpen(true);
  };

  const openEditRole = (r: any) => {
    setRoleDialogMode("edit");
    setRoleForm({ roleCode: r.roleCode, roleName: r.roleName, description: r.description || "", sortOrder: r.sortOrder || 99 });
    setEditingRole(r);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.roleCode || !roleForm.roleName) {
      toast.error("角色编码和名称为必填");
      return;
    }
    setSavingRole(true);
    try {
      if (roleDialogMode === "create") {
        await roleApi.create(roleForm);
        toast.success("角色创建成功");
      } else {
        await roleApi.update(editingRole.id, roleForm);
        toast.success("角色已更新");
      }
      setRoleDialogOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast.error("操作失败", { description: err?.response?.data?.message || "请检查输入" });
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (r: any) => {
    if (!confirm(`确定要删除角色「${r.roleName}」吗？此操作不可恢复。`)) return;
    try {
      await roleApi.delete(r.id);
      toast.success("角色已删除");
      fetchRoles();
    } catch (err: any) {
      toast.error("删除失败", { description: err?.response?.data?.message || "请先移除该角色下的用户" });
    }
  };

  const openPermDialog = (r: any) => {
    setPermEditingRole(r);
    // 将 permission codes 转为 ids
    const permIds = allPermissions
      .filter(p => r.permissions?.includes(p.permissionCode))
      .map(p => p.id);
    setSelectedPermIds(permIds);
    setPermDialogOpen(true);
  };

  const togglePerm = (permId: number) => {
    setSelectedPermIds(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSavePerms = async () => {
    setSavingPerms(true);
    try {
      await roleApi.assignPermissions(permEditingRole.id, selectedPermIds);
      toast.success("权限已更新");
      setPermDialogOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast.error("保存失败", { description: err?.response?.data?.message || "操作失败" });
    } finally {
      setSavingPerms(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">用户管理</h3>
              <Button
                size="sm"
                className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-xl"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> 新增用户
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、昵称、邮箱..."
                className="pl-9 rounded-xl"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>

            {/* User List */}
            <div className="space-y-2">
              {loadingUsers ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">暂无用户数据</div>
              ) : (
                filteredUsers.map((user) => {
                  const roleCode = user.roleCode || "dev";
                  const roleName = user.roleName || "开发人员";
                  const color = getColorForRole(roleCode);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:bg-muted/20 transition-all"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: color }}
                      >
                        {(user.nickname || user.username || "U")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{user.nickname || user.username}</span>
                          <Badge
                            className="text-[10px]"
                            style={{ backgroundColor: `${color}15`, color }}
                          >
                            {roleName}
                          </Badge>
                          {user.status === 1 ? (
                            <Badge variant="outline" className="text-[10px] border-green-200 text-green-600">正常</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-red-200 text-red-600">禁用</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>用户名: {user.username}</span>
                          {user.email && <span>邮箱: {user.email}</span>}
                          {user.lastLoginTime && <span>最后登录: {new Date(user.lastLoginTime).toLocaleString("zh-CN")}</span>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => {
                            setEditingUser({ ...user });
                            setEditDialogOpen(true);
                          }}>
                            编辑信息
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setResetPwdUser(user);
                            setNewPassword("");
                            setResetPwdDialogOpen(true);
                          }}>
                            重置密码
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={user.status === 1 ? "text-red-600" : "text-green-600"}
                            onClick={async () => {
                              try {
                                await userApi.update(user.id, { status: user.status === 1 ? 0 : 1 });
                                toast.success(user.status === 1 ? "已禁用用户" : "已启用用户");
                                fetchUsers();
                              } catch {
                                toast.error("操作失败");
                              }
                            }}
                          >
                            {user.status === 1 ? "禁用账号" : "启用账号"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
                              if (user.username === 'admin') {
                                toast.error("不能删除系统管理员账号");
                                return;
                              }
                              if (!confirm(`确定要删除用户「${user.nickname || user.username}」吗？此操作不可恢复。`)) return;
                              try {
                                await userApi.delete(user.id);
                                toast.success("用户已删除");
                                fetchUsers();
                              } catch (err: any) {
                                toast.error("删除失败", { description: err?.response?.data?.message || "请稍后重试" });
                              }
                            }}
                          >
                            删除用户
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t border-border/40">
              <span>共 {filteredUsers.length} 位用户</span>
              <span>活跃: {filteredUsers.filter(u => u.status === 1).length}</span>
              <span>禁用: {filteredUsers.filter(u => u.status !== 1).length}</span>
            </div>
          </div>
        );

      case "roles":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">角色权限管理</h3>
              <Button
                size="sm"
                className="bg-[#0088ff] hover:bg-[#0066cc] text-white rounded-xl"
                onClick={openCreateRole}
              >
                <Plus className="w-4 h-4 mr-1" /> 新增角色
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              管理系统角色，为每个角色分配菜单和操作权限。内置角色（系统管理员、产品经理、开发人员、测试人员）不可删除。
            </p>

            {/* Role List */}
            <div className="space-y-3">
              {loadingRoles ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">暂无角色数据</div>
              ) : (
                roles.map((r) => {
                  const color = getColorForRole(r.roleCode);
                  return (
                    <div key={r.id} className="p-4 rounded-xl border border-border/60 bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge style={{ backgroundColor: `${color}15`, color }} className="text-xs">
                            {r.roleName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">({r.roleCode})</span>
                          {r.builtIn && (
                            <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-600">内置</Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-2">{r.userCount || 0} 人</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-[#0088ff]"
                            onClick={() => openPermDialog(r)}
                            title="分配权限"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-[#0088ff]"
                            onClick={() => openEditRole(r)}
                            title="编辑角色"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {!r.builtIn && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteRole(r)}
                              title="删除角色"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mb-2">{r.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {r.roleCode === "sys_admin" ? (
                          <Badge variant="outline" className="text-[9px] border-red-200 text-red-500">拥有全部权限</Badge>
                        ) : (() => {
                          const permCodes = r.permissions || [];
                          const menuCodes = permCodes.filter((c: string) => allPermissions.find((p: any) => p.permissionCode === c && p.type === 1));
                          const opCodes = permCodes.filter((c: string) => allPermissions.find((p: any) => p.permissionCode === c && p.type === 2));
                          const getPermName = (code: string) => allPermissions.find((p: any) => p.permissionCode === code)?.permissionName || code;
                          return (
                            <>
                              {menuCodes.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-[9px] text-muted-foreground font-medium">菜单:</span>
                                  {menuCodes.map((c: string) => (
                                    <Badge key={c} variant="outline" className="text-[9px] border-blue-200 text-blue-600 bg-blue-50">{getPermName(c)}</Badge>
                                  ))}
                                </div>
                              )}
                              {opCodes.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap mt-1">
                                  <span className="text-[9px] text-muted-foreground font-medium">操作:</span>
                                  {opCodes.map((c: string) => (
                                    <Badge key={c} variant="outline" className="text-[9px] border-green-200 text-green-600 bg-green-50">{getPermName(c)}</Badge>
                                  ))}
                                </div>
                              )}
                              {permCodes.length === 0 && (
                                <span className="text-[9px] text-muted-foreground">暂无权限</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold">个人信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>当前角色</Label>
                <Input value={role || "系统管理员"} disabled className="bg-muted" />
              </div>
            </div>
            <Button className="bg-[#0088ff] hover:bg-[#0066cc] text-white" onClick={() => toast.success("个人信息已保存")}>保存修改</Button>
          </div>
        );
      case "appearance":
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold">外观主题</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: "light", label: "浅色模式", desc: "白玉晨曦" },
                { id: "dark", label: "深色模式", desc: "暗夜星辰" },
                { id: "auto", label: "跟随系统", desc: "自动切换" },
              ].map(theme => (
                <div key={theme.id} className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${theme.id === "light" ? "border-[#0088ff] ring-1 ring-[#0088ff]/20" : "border-border/60"}`}>
                  <p className="text-sm font-medium">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{theme.desc}</p>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-semibold mt-6">语言设置</h3>
            <Select defaultValue="zh-CN">
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
                <SelectItem value="ja-JP">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "extensions":
        return <SessionConfigPanel />;
      default:
        return <div className="text-sm text-muted-foreground">功能开发中...</div>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-[#0088ff]" />
        <h1 className="text-xl font-bold">系统设置</h1>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-48 shrink-0 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id ? "bg-[#0088ff]/10 text-[#0088ff] font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="flex-1 bg-white rounded-xl border border-border/60 p-6">
          {renderContent()}
        </motion.div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-2xl border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-xl bg-[#0088ff]/10 flex items-center justify-center">
                <Plus className="w-4 h-4 text-[#0088ff]" />
              </div>
              新增用户
            </DialogTitle>
            <DialogDescription>创建新用户账号并分配角色权限</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">用户名 <span className="text-red-500">*</span></Label>
                <Input placeholder="登录用户名" className="rounded-xl h-10" value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">初始密码 <span className="text-red-500">*</span></Label>
                <Input type="password" placeholder="设置初始密码" className="rounded-xl h-10" value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">昵称 <span className="text-red-500">*</span></Label>
                <Input placeholder="用户显示名称" className="rounded-xl h-10" value={newUser.nickname}
                  onChange={(e) => setNewUser({ ...newUser, nickname: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">角色 <span className="text-red-500">*</span></Label>
                <Select value={newUser.roleId} onValueChange={(v) => setNewUser({ ...newUser, roleId: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="选择角色" /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>{r.roleName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">邮箱</Label>
                <Input type="email" placeholder="user@example.com" className="rounded-xl h-10" value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">手机号</Label>
                <Input placeholder="手机号码" className="rounded-xl h-10" value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white" onClick={handleCreateUser} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建用户
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>修改用户基本信息和角色</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input value={editingUser.username} disabled className="rounded-xl bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>昵称</Label>
                  <Input className="rounded-xl" value={editingUser.nickname || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, nickname: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <Input className="rounded-xl" value={editingUser.email || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>手机号</Label>
                  <Input className="rounded-xl" value={editingUser.phone || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={String(editingUser.roleId || "")} onValueChange={(v) => setEditingUser({ ...editingUser, roleId: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="选择角色" /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>{r.roleName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white"
              onClick={async () => {
                try {
                  await userApi.update(editingUser.id, {
                    nickname: editingUser.nickname,
                    email: editingUser.email,
                    phone: editingUser.phone,
                    roleIds: editingUser.roleId ? [Number(editingUser.roleId)] : undefined,
                  });
                  toast.success("用户信息已更新");
                  setEditDialogOpen(false);
                  fetchUsers();
                } catch {
                  toast.error("更新失败");
                }
              }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwdDialogOpen} onOpenChange={setResetPwdDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>为用户 {resetPwdUser?.nickname || resetPwdUser?.username} 设置新密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>新密码 <span className="text-red-500">*</span></Label>
              <Input type="password" placeholder="输入新密码" className="rounded-xl" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setResetPwdDialogOpen(false)}>取消</Button>
            <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white"
              onClick={async () => {
                if (!newPassword) { toast.error("请输入新密码"); return; }
                try {
                  await userApi.resetPassword(resetPwdUser.id, newPassword);
                  toast.success("密码已重置");
                  setResetPwdDialogOpen(false);
                } catch { toast.error("重置失败"); }
              }}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Create/Edit Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle>{roleDialogMode === "create" ? "新增角色" : "编辑角色"}</DialogTitle>
            <DialogDescription>
              {roleDialogMode === "create" ? "创建新角色并设置基本信息" : "修改角色基本信息"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色编码 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="如: project_manager"
                  className="rounded-xl"
                  value={roleForm.roleCode}
                  onChange={(e) => setRoleForm({ ...roleForm, roleCode: e.target.value })}
                  disabled={roleDialogMode === "edit" && editingRole?.builtIn}
                />
              </div>
              <div className="space-y-2">
                <Label>角色名称 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="如: 项目经理"
                  className="rounded-xl"
                  value={roleForm.roleName}
                  onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input
                placeholder="角色职责描述"
                className="rounded-xl"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input
                type="number"
                className="rounded-xl w-24"
                value={roleForm.sortOrder}
                onChange={(e) => setRoleForm({ ...roleForm, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setRoleDialogOpen(false)}>取消</Button>
            <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white" onClick={handleSaveRole} disabled={savingRole}>
              {savingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {roleDialogMode === "create" ? "创建" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Assignment Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-[640px] rounded-2xl border-border/60 shadow-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0088ff]" />
              分配权限 - {permEditingRole?.roleName}
            </DialogTitle>
            <DialogDescription>
              勾选该角色可访问的菜单模块和操作权限。系统管理员始终拥有全部权限。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-y-auto flex-1 pr-1">
            {permEditingRole?.roleCode === "sys_admin" ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                系统管理员拥有全部权限，无需单独配置
              </div>
            ) : (() => {
              // 分组：菜单权限(type=1) 和 操作权限(type=2，按parent_id分组)
              const menuPerms = allPermissions.filter((p: any) => p.type === 1);
              const opPerms = allPermissions.filter((p: any) => p.type === 2);
              // 按 parentId 分组操作权限
              const opGroups: Record<number, any[]> = {};
              opPerms.forEach((p: any) => {
                const pid = p.parentId || 0;
                if (!opGroups[pid]) opGroups[pid] = [];
                opGroups[pid].push(p);
              });
              // 找到父级菜单名称
              const menuMap: Record<number, string> = {};
              menuPerms.forEach((m: any) => { menuMap[m.id] = m.permissionName; });

              return (
                <div className="space-y-5">
                  {/* 菜单权限 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#0088ff] rounded-full inline-block"></span>
                      菜单权限
                      <span className="text-xs text-muted-foreground font-normal">（控制左侧导航菜单可见性）</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {menuPerms.map((perm: any) => {
                        const checked = selectedPermIds.includes(perm.id);
                        return (
                          <div
                            key={perm.id}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${checked ? "border-[#0088ff]/50 bg-[#0088ff]/5" : "border-border/40 hover:bg-muted/30"}`}
                            onClick={() => togglePerm(perm.id)}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${checked ? "bg-[#0088ff] border-[#0088ff]" : "border-gray-300"}`}>
                              {checked && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-sm">{perm.permissionName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 操作权限 - 按模块分组 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block"></span>
                      操作权限
                      <span className="text-xs text-muted-foreground font-normal">（控制具体操作的执行权限）</span>
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(opGroups).map(([parentId, perms]) => {
                        const groupName = menuMap[Number(parentId)] || "其他";
                        const allChecked = perms.every((p: any) => selectedPermIds.includes(p.id));
                        const someChecked = perms.some((p: any) => selectedPermIds.includes(p.id));
                        return (
                          <div key={parentId} className="border border-border/40 rounded-xl overflow-hidden">
                            <div
                              className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => {
                                const permIds = perms.map((p: any) => p.id);
                                if (allChecked) {
                                  setSelectedPermIds(prev => prev.filter(id => !permIds.includes(id)));
                                } else {
                                  setSelectedPermIds(prev => [...new Set([...prev, ...permIds])]);
                                }
                              }}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${allChecked ? "bg-[#0088ff] border-[#0088ff]" : someChecked ? "bg-[#0088ff]/40 border-[#0088ff]" : "border-gray-300"}`}>
                                {(allChecked || someChecked) && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-sm font-medium">{groupName}</span>
                              <span className="text-xs text-muted-foreground">({perms.length}项)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 p-2">
                              {perms.map((perm: any) => {
                                const checked = selectedPermIds.includes(perm.id);
                                return (
                                  <div
                                    key={perm.id}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${checked ? "bg-[#0088ff]/5" : "hover:bg-muted/30"}`}
                                    onClick={() => togglePerm(perm.id)}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${checked ? "bg-[#0088ff] border-[#0088ff]" : "border-gray-300"}`}>
                                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs">{perm.permissionName}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          {permEditingRole?.roleCode !== "sys_admin" && (
            <DialogFooter className="gap-2 pt-2 border-t border-border/40">
              <div className="flex-1 text-xs text-muted-foreground">
                已选 {selectedPermIds.length} / {allPermissions.length} 项权限
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => setPermDialogOpen(false)}>取消</Button>
              <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white" onClick={handleSavePerms} disabled={savingPerms}>
                {savingPerms && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                保存权限
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ============ 扩展配置面板（会话时长等系统参数） ============
function SessionConfigPanel() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await systemConfigApi.list("security");
      setConfigs(res?.data || []);
    } catch { setConfigs([]); }
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleSave = async (key: string) => {
    try {
      await systemConfigApi.update(key, editValue);
      toast.success("配置已更新，新登录用户将使用新的会话时长");
      setEditingKey(null);
      fetchConfigs();
    } catch (e: any) {
      toast.error(e?.message || "更新失败");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">系统配置</h3>
        <p className="text-xs text-muted-foreground">管理系统级参数，修改后对新登录用户生效</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中...
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((cfg: any) => (
            <div key={cfg.configKey} className="p-4 rounded-xl border border-border/60 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{cfg.configName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingKey === cfg.configKey ? (
                    <>
                      <Input
                        className="w-24 h-8 text-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        type="number"
                        min={1}
                        max={168}
                      />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleSave(cfg.configKey)}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingKey(null)}>
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-sm font-mono">
                        {cfg.configValue} {cfg.configKey.includes("hours") ? "小时" : ""}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingKey(cfg.configKey); setEditValue(cfg.configValue); }}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {configs.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无配置项</p>
          )}
        </div>
      )}

      <div className="p-4 rounded-xl border border-amber-200/60 bg-amber-50/50">
        <p className="text-xs text-amber-700 font-medium">提示</p>
        <p className="text-xs text-amber-600 mt-1">
          修改会话保持时长后，已登录用户的 Token 不受影响，仅对新登录的用户生效。
          建议设置范围：1~168 小时（即最长 7 天）。
        </p>
      </div>
    </div>
  );
}
