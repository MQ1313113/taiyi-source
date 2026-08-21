import { useState, useEffect } from "react";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import { motion } from "framer-motion";
import { Settings, Palette, Shield, Users, Puzzle, Plus, Search, MoreHorizontal, Loader2, Pencil, Trash2, Check, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { userApi, roleApi, systemConfigApi } from "@/services/api";

// 个人信息不在系统设置里:它是每个人自己的事,入口在右上角用户菜单(所有角色可用)
const tabs = [
  { id: "users", label: "用户管理", icon: Users },
  { id: "roles", label: "角色权限", icon: Shield },
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
  const [activeTab, setActiveTab] = useState("users");

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
  // 授权开关确认弹窗:kind=arbiter(业务仲裁)/approver(变更审批),{user, enabled} 为待确认的目标状态
  const [arbiterConfirm, setArbiterConfirm] = useState<{ user: any; enabled: boolean; kind: "arbiter" | "approver" } | null>(null);
  const [savingArbiter, setSavingArbiter] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  // 防浏览器密码管理器接管:密码框初始 readOnly,用户聚焦才解锁(Chrome 不向 readOnly 输入框回填密码)
  const [pwdReadOnly, setPwdReadOnly] = useState(true);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getThemeMode());

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
      // 用户管理场景：包含系统管理员，否则 admin 被赋 sys_admin 角色后从列表消失
      const res = await userApi.listWithRoles(true);
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
    if (activeTab === "users") {
      fetchUsers();
      fetchRoles(); // 新建/编辑用户弹窗的角色下拉依赖 roles,首次进入用户页签也要加载
    }
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

  // 提交授权开关变更(业务仲裁/变更审批共用,唯一授权入口,后端拦 admin/禁用账号)
  const confirmArbiter = async () => {
    if (!arbiterConfirm) return;
    const isArb = arbiterConfirm.kind === "arbiter";
    const label = isArb ? "业务仲裁" : "变更审批";
    setSavingArbiter(true);
    try {
      const res: any = isArb
        ? await userApi.setArbiter(arbiterConfirm.user.id, arbiterConfirm.enabled)
        : await userApi.setChangeApprover(arbiterConfirm.user.id, arbiterConfirm.enabled);
      const d = res?.data || {};
      const title = `${arbiterConfirm.enabled ? "已开启" : "已关闭"}${label}`;
      if (d.warning) {
        toast.warning(title, { description: d.warning });
      } else if (d.note) {
        toast.info(title, { description: d.note });
      } else {
        toast.success(title, {
          description: isArb
            ? `当前共 ${d.holderCount ?? "-"} 人持有业务仲裁权限`
            : `审批人池当前共 ${d.poolCount ?? "-"} 人(名单制生效中)`,
        });
      }
      setArbiterConfirm(null);
      fetchUsers();
    } catch (err: any) {
      toast.error("操作失败", { description: err?.message || err?.response?.data?.message || "请稍后重试" });
    } finally {
      setSavingArbiter(false);
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
                type="search"
                autoComplete="off"
                name="user-list-filter"
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
                          {user.bizArbiter && (
                            <Badge className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200">业务仲裁</Badge>
                          )}
                          {user.changeApprover && (
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200">变更审批</Badge>
                          )}
                          {user.username === "guest" && (
                            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500"
                              title="外部匿名工单的提报人占位账号:必须保持禁用,不可删除,重启后自动重建">
                              系统账号
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>用户名: {user.username}</span>
                          {user.email && <span>邮箱: {user.email}</span>}
                          {user.lastLoginTime && <span>最后登录: {new Date(user.lastLoginTime).toLocaleString("zh-CN")}</span>}
                        </div>
                      </div>
                      {/* 授权开关:admin(系统职能纯粹)与 guest(外部占位)不展示;禁用账号只可关不可开(后端同拦) */}
                      {user.username !== "admin" && user.username !== "guest" && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5" title="流程卡死时的兜底裁决权,可与当前岗位叠加,可多人持有">
                            <span className="text-[11px] text-muted-foreground">仲裁</span>
                            <Switch
                              checked={!!user.bizArbiter}
                              onCheckedChange={(v) => setArbiterConfirm({ user, enabled: v, kind: "arbiter" })}
                            />
                          </div>
                          <div className="flex items-center gap-1.5" title="变更审批名单:开了任何人后,需求变更的两重审批必须由名单内成员完成;全关则回退默认角色规则(产品经理审批)">
                            <span className="text-[11px] text-muted-foreground">审批</span>
                            <Switch
                              checked={!!user.changeApprover}
                              onCheckedChange={(v) => setArbiterConfirm({ user, enabled: v, kind: "approver" })}
                            />
                          </div>
                        </div>
                      )}
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
                            setPwdReadOnly(true);
                            setShowResetPwd(false);
                            setResetPwdDialogOpen(true);
                          }}>
                            重置密码
                          </DropdownMenuItem>
                          {/* admin 防锁死、guest 系统占位:禁用/删除入口不展示（后端同样拦截） */}
                          {user.username !== 'admin' && user.username !== 'guest' && <DropdownMenuSeparator />}
                          {user.username !== 'admin' && user.username !== 'guest' && <DropdownMenuItem
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
                          </DropdownMenuItem>}
                          {user.username !== 'admin' && user.username !== 'guest' && <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
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
                          </DropdownMenuItem>}
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
              <span className={users.filter(u => u.bizArbiter).length === 0 ? "text-red-500 font-medium" : "text-amber-600"}>
                业务仲裁: {users.filter(u => u.bizArbiter).length} 人{users.filter(u => u.bizArbiter).length === 0 ? "(未配置,流程卡死时将无人裁决)" : ""}
              </span>
              <span className="text-blue-600">
                变更审批: {users.filter(u => u.changeApprover).length > 0
                  ? `${users.filter(u => u.changeApprover).length} 人(名单制)`
                  : "角色制(产品经理)"}
              </span>
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

      case "appearance":
        return (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold">外观主题</h3>
            <div className="grid grid-cols-3 gap-4">
              {([
                { id: "light", label: "浅色模式", desc: "白玉晨曦" },
                { id: "dark", label: "深色模式", desc: "暗夜星辰" },
                { id: "auto", label: "跟随系统", desc: "自动切换" },
              ] as { id: ThemeMode; label: string; desc: string }[]).map(theme => (
                <div key={theme.id}
                  onClick={() => { setThemeModeState(theme.id); setThemeMode(theme.id); toast.success(`已切换为${theme.label}`); }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${theme.id === themeMode ? "border-[#0088ff] ring-1 ring-[#0088ff]/20" : "border-border/60"}`}>
                  <p className="text-sm font-medium">{theme.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{theme.desc}</p>
                </div>
              ))}
            </div>
            {/* 语言设置暂不提供:全站文案未做 i18n 抽取,切换语言不会生效,避免展示无效开关 */}
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
                <Input type="password" autoComplete="new-password" placeholder="设置初始密码" className="rounded-xl h-10" value={newUser.password}
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
                    {/* 业务仲裁不是岗位角色,不进常规角色下拉,授予只走用户行的仲裁开关 */}
                    {roles.filter(r => r.roleCode !== "biz_arbiter").map(r => (
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
                <Label>角色{editingUser.username === "admin" && <span className="text-xs text-muted-foreground ml-2">(系统管理员账号不可修改角色)</span>}</Label>
                <Select value={String(editingUser.roleId || "")} disabled={editingUser.username === "admin"}
                  onValueChange={(v) => setEditingUser({ ...editingUser, roleId: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="选择角色" /></SelectTrigger>
                  <SelectContent>
                    {/* 业务仲裁不是岗位角色,不进常规角色下拉,授予只走用户行的仲裁开关 */}
                    {roles.filter(r => r.roleCode !== "biz_arbiter").map(r => (
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
                    // admin 角色固定为系统管理员,不提交 roleIds(后端也会拒绝对 admin 的角色修改)
                    roleIds: editingUser.username !== "admin" && editingUser.roleId ? [Number(editingUser.roleId)] : undefined,
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
      <Dialog open={resetPwdDialogOpen} onOpenChange={(o) => { setResetPwdDialogOpen(o); if (!o) setSearchKeyword(""); }}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>为用户 {resetPwdUser?.nickname || resetPwdUser?.username} 设置新密码</DialogDescription>
          </DialogHeader>
          {/* 诱饵输入框:吸收 Chrome 密码管理器的自动填充(它会无视 autoComplete=off),使真实输入框保持干净 */}
          <input type="text" name="fake-user" autoComplete="username" tabIndex={-1} aria-hidden="true"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
          <input type="password" name="fake-pwd" autoComplete="current-password" tabIndex={-1} aria-hidden="true"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>新密码 <span className="text-red-500">*</span></Label>
              <div className="relative">
                {/* readOnly 直到用户聚焦:Chrome 不向 readOnly 输入框回填保存的密码 */}
                <Input type={showResetPwd ? "text" : "password"} autoComplete="new-password" name={"np-" + (resetPwdUser?.id ?? "x")}
                  readOnly={pwdReadOnly} onFocus={() => setPwdReadOnly(false)}
                  placeholder="输入新密码" className="rounded-xl pr-10" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowResetPwd(!showResetPwd)}>
                  {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                  // 兜底:浏览器自动填充可能把用户名塞进搜索框导致列表被过滤,关弹窗时强制清空
                  setSearchKeyword("");
                } catch { toast.error("重置失败"); }
              }}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 业务仲裁开关确认弹窗:说清这是什么权力再让管理员拍板 */}
      <Dialog open={!!arbiterConfirm} onOpenChange={(o) => !o && setArbiterConfirm(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${arbiterConfirm?.kind === "approver" ? "text-blue-500" : "text-amber-500"}`} />
              {arbiterConfirm?.enabled ? "开启" : "关闭"}{arbiterConfirm?.kind === "approver" ? "变更审批" : "业务仲裁"} · {arbiterConfirm?.user?.nickname || arbiterConfirm?.user?.username}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2 text-sm text-muted-foreground">
                {arbiterConfirm?.kind === "approver" ? (
                  <>
                    <p>
                      变更审批名单控制<span className="text-foreground font-medium">谁能审批需求变更</span>:
                      名单内有人时,变更的两重审批(一审+复审)都必须由名单内成员完成;名单全空则回退默认角色规则(产品经理一审+需求负责人复审)。
                    </p>
                    {arbiterConfirm?.enabled ? (
                      <p>
                        加入后该用户可参与变更审批(防自审、两重不得同人的规则不变)。
                        注意:名单一旦有人,不在名单内的产品经理将不能再审批变更。
                      </p>
                    ) : (
                      <p className="text-blue-600">
                        移出后该用户不再能审批变更。若名单因此清空,变更审批自动回退角色制,不会卡流程。
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      业务仲裁是<span className="text-foreground font-medium">流程卡死时的兜底裁决权</span>:
                      可越过常规角色限制推进/裁决需求、缺陷、变更审批与超时工单。
                    </p>
                    {arbiterConfirm?.enabled ? (
                      <p>
                        与该用户当前岗位({arbiterConfirm?.user?.roleName || "未分配"})叠加,不影响其原有职责。
                        可多人持有,任一持有人均可裁决;建议保持至少 2 人以防休假/离职时无人可裁。
                      </p>
                    ) : (
                      <p className="text-amber-600">
                        关闭后该用户不再能做兜底裁决。若这是最后一位持有人,流程卡死时将无人可裁决,
                        admin 工作台会出现常驻提醒,请及时指定新的仲裁人。
                      </p>
                    )}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setArbiterConfirm(null)}>取消</Button>
            <Button
              className={`rounded-xl text-white ${arbiterConfirm?.enabled ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600"}`}
              disabled={savingArbiter}
              onClick={confirmArbiter}
            >
              {savingArbiter && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认{arbiterConfirm?.enabled ? "开启" : "关闭"}
            </Button>
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
      // 变更审批人池不在这里手填ID:唯一入口是[用户管理]每行的"审批"开关
      setConfigs((res?.data || []).filter((c: any) => c.configKey !== "change.approver.ids"));
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
                        className={cfg.configKey === "token.expiration.hours" ? "w-24 h-8 text-sm" : "w-48 h-8 text-sm"}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        type={cfg.configKey === "token.expiration.hours" ? "number" : "text"}
                        placeholder={cfg.configKey === "change.approver.ids" ? "如: 3,6,7" : undefined}
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
