import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FolderKanban, FileText, Code2, TestTube2,
  Bug, Bell, Settings, ChevronLeft, ChevronRight, Search,
  Plus, User, LogOut, KeyRound, Layers, BarChart3, Shield,
  AlertTriangle, BookOpen, Users, Clock, GitBranch,
  Scissors, UserPlus, Play, FileCheck, ChevronDown, Ticket, Radar, Rocket
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRole } from "@/contexts/RoleContext";
import { useProject, frameworkLevels, type FrameworkLevel } from "@/contexts/ProjectContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { notificationApi, userApi } from "@/services/api";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, FolderKanban, FileText, Code2, TestTube2,
  Bug, Bell, Settings, Layers, BarChart3, AlertTriangle,
  BookOpen, Users, Shield, Clock, GitBranch, Scissors,
  UserPlus, Play, FileCheck, Plus, Ticket, Radar, Rocket
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const { menuItems, quickActions, info, hasPermission } = useRole();

  // 登录人信息放 state:个人信息弹窗改完昵称后 setLoginUser 即时刷新头像与显示名,无需重新登录
  const [loginUser, setLoginUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("taiyi_user") || "{}"); } catch { return {}; }
  });
  const displayName: string = loginUser?.nickname || loginUser?.username || info.name;
  const displayAvatar: string = (displayName || info.avatar).charAt(0);

  // 个人信息弹窗(全角色可用):自助修改昵称/邮箱/手机,账号名与角色只读
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: "", nickname: "", email: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const openProfile = () => {
    setProfileOpen(true);
    userApi.profile().then((res: any) => {
      const u = res?.data || {};
      setProfileForm({ username: u.username || "", nickname: u.nickname || "", email: u.email || "", phone: u.phone || "" });
    }).catch(() => toast.error("加载个人信息失败"));
  };
  const saveProfile = async () => {
    if (!profileForm.nickname.trim()) { toast.error("昵称不能为空"); return; }
    setSavingProfile(true);
    try {
      await userApi.updateProfile({
        nickname: profileForm.nickname.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      });
      // 同步本地缓存,头像/显示名立即生效
      const next = { ...loginUser, nickname: profileForm.nickname.trim() };
      localStorage.setItem("taiyi_user", JSON.stringify(next));
      setLoginUser(next);
      toast.success("个人信息已更新");
      setProfileOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "保存失败");
    } finally {
      setSavingProfile(false);
    }
  };
  const { currentLevel, setLevel, levelInfo } = useProject();
  const [levelPopoverOpen, setLevelPopoverOpen] = useState(false);

  // 通知未读数（实时更新）
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const token = localStorage.getItem('taiyi_token');
    if (token) {
      notificationApi.unreadCount().then((res: any) => {
        setUnreadCount(res.data?.count || 0);
      }).catch(() => {});
    }
    // 监听WebSocket推送的未读数更新事件
    const handler = (e: any) => setUnreadCount(e.detail);
    window.addEventListener('taiyi-unread-update', handler);
    return () => window.removeEventListener('taiyi-unread-update', handler);
  }, []);

  // 鼠标光晕直接操作 DOM（ref + requestAnimationFrame 节流），
  // 避免高频 setState 导致整个布局重渲染从而出现点击菜单时的闪烁
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = glowRef.current;
      if (el) {
        el.style.background = `radial-gradient(300px circle at ${e.clientX}px ${e.clientY}px, rgba(0, 136, 255, 0.04), transparent 60%)`;
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  const isActive = (path: string) => {
    if (path.includes("dashboard")) return location.includes("dashboard");
    return location.startsWith(path);
  };

  const handleQuickAction = (action: { path?: string; action?: string; label: string }) => {
    if (action.path) {
      setLocation(action.path);
    } else if (action.action) {
      window.dispatchEvent(new CustomEvent("taiyi-quick-action", { detail: { action: action.action, label: action.label } }));
    }
  };



  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Mouse Follow Glow */}
      <div
        ref={glowRef}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Grid Background */}
      <div className="fixed inset-0 taiyi-grid-bg pointer-events-none z-0" />

      {/* Sidebar */}
      <aside
        className={`relative z-10 h-full bg-white/90 backdrop-blur-sm border-r border-border/60 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border/60">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="太一" className="w-8 h-8 rounded-lg" />
              <div>
                <h1 className="text-sm font-bold text-foreground leading-tight">太一 TaiYi</h1>
                <p className="text-[10px] text-muted-foreground">研发管理平台</p>
              </div>
            </div>
          )}
          {collapsed && (
            <img src="/logo.png" alt="太一" className="w-8 h-8 rounded-lg mx-auto" />
          )}
        </div>

        {/* Role Indicator */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-border/40">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors duration-200 cursor-default">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium ring-2 ring-offset-1"
                style={{ backgroundColor: info.color, outlineColor: `${info.color}40` }}
              >
                {displayAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground">{info.label}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - Dynamic based on role */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const active = isActive(item.path);
            const navItem = (
              <Link key={item.key} href={item.path}>
                <div
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] taiyi-btn-active ${
                    active
                      ? "bg-[#0088ff]/8 text-[#0088ff] shadow-sm shadow-[#0088ff]/10"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5"
                  }`}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#0088ff] rounded-r-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${active ? "text-[#0088ff]" : "group-hover:text-foreground"}`} />
                  {!collapsed && (
                    <>
                      <span className={`text-sm flex-1 transition-colors duration-200 ${active ? "font-medium" : ""}`}>{item.label}</span>
                      {item.badge && (
                        <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1.5 animate-pulse">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </div>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.key} delayDuration={0}>
                  <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                    {item.badge && <Badge variant="destructive" className="ml-2 h-4 text-[9px] px-1">{item.badge}</Badge>}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return navItem;
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-border/60">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-accent transition-all duration-200 taiyi-btn-active"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Bar */}
        <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-border/60 flex items-center px-6 gap-4">
          {/* Framework Level Badge - Only sys_admin can modify */}
          <div className="flex items-center gap-2">
            {hasPermission("sys:gear") ? (
              <Popover open={levelPopoverOpen} onOpenChange={setLevelPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium transition-all duration-200 hover:scale-105 taiyi-btn-active cursor-pointer" style={{ backgroundColor: `${levelInfo.color}15`, color: levelInfo.color }}>
                    {levelInfo.label}
                    <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 p-0">
                  <div className="p-3 border-b border-border/60">
                    <p className="text-sm font-semibold">框架档位设置</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">选择适合项目规模的管理档位（仅系统管理员可修改）</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {frameworkLevels.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => {
                          setLevel(level.id);
                          setLevelPopoverOpen(false);
                          toast.success(`已切换为「${level.fullLabel}」`, { description: level.description });
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                          currentLevel === level.id
                            ? "bg-muted/80 ring-1 ring-inset"
                            : "hover:bg-muted/40"
                        }`}
                        style={currentLevel === level.id ? { '--tw-ring-color': level.color } as React.CSSProperties : {}}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: level.color }} />
                          <span className="text-sm font-medium">{level.label}</span>
                          {currentLevel === level.id && (
                            <Badge variant="secondary" className="text-[9px] h-4 ml-auto" style={{ backgroundColor: `${level.color}15`, color: level.color }}>当前</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground ml-4">{level.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5 ml-4">
                          {level.features.slice(0, 5).map((f) => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">{f}</span>
                          ))}
                          {level.features.length > 5 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">+{level.features.length - 5}项</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: `${levelInfo.color}15`, color: levelInfo.color }}>
                {levelInfo.label}
              </span>
            )}
          </div>

          {/* Global Search */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[#0088ff]" />
              <Input
                placeholder="搜索需求、任务、Bug..."
                className="pl-9 h-9 bg-muted/50 border-0 rounded-xl text-sm focus:bg-white focus:shadow-md focus:shadow-[#0088ff]/5 transition-all duration-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    toast.info("搜索功能", { description: "全局搜索已触发" });
                  }
                }}
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Create - Role-specific actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 bg-[#ff5500] hover:bg-[#e64d00] text-white rounded-lg taiyi-btn-active shadow-sm shadow-[#ff5500]/20 hover:shadow-md hover:shadow-[#ff5500]/30 transition-all duration-200">
                  <Plus className="w-4 h-4 mr-1" />
                  快捷操作
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {quickActions.map((action, i) => {
                  const ActionIcon = iconMap[action.icon] || Plus;
                  return (
                    <DropdownMenuItem key={i} onClick={() => handleQuickAction(action)} className="cursor-pointer">
                      <ActionIcon className="w-4 h-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <Link href="/app/notifications">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative rounded-lg hover:bg-accent taiyi-btn-active transition-all duration-200">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#ef4444] rounded-full text-[9px] text-white flex items-center justify-center font-medium animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-accent transition-all duration-200 taiyi-btn-active">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}dd)` }}
                  >
                    <span className="text-white text-xs font-medium">{displayAvatar}</span>
                  </div>
                  {!collapsed && <span className="text-sm font-medium hidden lg:inline">{displayName}</span>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={openProfile}>
                  <User className="w-4 h-4 mr-2" />个人信息
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setLocation("/app/change-password")}
                >
                  <KeyRound className="w-4 h-4 mr-2" />修改密码
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => { localStorage.removeItem("taiyi_token"); localStorage.removeItem("taiyi_user"); localStorage.removeItem("taiyi_role"); setLocation("/"); toast("已退出登录"); }}
                >
                  <LogOut className="w-4 h-4 mr-2" />退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 个人信息弹窗:昵称/邮箱/手机自助修改,账号名与角色只读 */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="sm:max-w-[440px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#0088ff]" />个人信息
              </DialogTitle>
              <DialogDescription>修改自己的昵称、邮箱、手机号;账号名与角色由管理员管理</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>账号</Label>
                  <Input value={profileForm.username} disabled className="rounded-xl bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>角色</Label>
                  <Input value={info.label} disabled className="rounded-xl bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>昵称 <span className="text-red-500">*</span></Label>
                <Input className="rounded-xl" value={profileForm.nickname}
                  onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <Input type="email" className="rounded-xl" value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>手机号</Label>
                  <Input className="rounded-xl" value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setProfileOpen(false)}>取消</Button>
              <Button className="rounded-xl bg-[#0088ff] hover:bg-[#0066cc] text-white" disabled={savingProfile} onClick={saveProfile}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Page Content - 即时渲染，不做整页淡入淡出，避免菜单切换时的闪烁/空白 */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
