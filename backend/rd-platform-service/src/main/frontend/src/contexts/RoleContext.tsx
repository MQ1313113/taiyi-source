import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// 角色类型定义
export type RoleType = "sys_admin" | "pm" | "developer" | "qa";

// 前端使用的权限标识（保持不变，各页面已在使用）
export type Permission =
  // 需求
  | "req:create" | "req:edit" | "req:delete" | "req:review" | "req:approve" | "req:close" | "req:change" | "req:view"
  // 任务
  | "task:create" | "task:assign" | "task:edit" | "task:status" | "task:view"
  // Bug
  | "bug:create" | "bug:confirm" | "bug:fix" | "bug:verify" | "bug:close" | "bug:edit" | "bug:assign" | "bug:view"
  // 测试
  | "tc:create" | "tc:execute" | "tc:lock" | "tc:edit" | "tc:view"
  // 技术债务
  | "debt:create" | "debt:assign" | "debt:view" | "debt:manage"
  // 效能度量
  | "metric:view"
  // 项目
  | "proj:create" | "proj:edit" | "proj:member" | "proj:view" | "proj:delete"
  // 迭代
  | "sprint:create" | "sprint:edit" | "sprint:view"
  // 提测
  | "submit:create" | "submit:approve" | "submit:view"
  // 变更管理
  | "change:create" | "change:approve" | "change:view"
  // 依赖
  | "dep:manage"
  // 系统
  | "sys:user" | "sys:audit" | "sys:config" | "sys:setting" | "sys:gear"
  // 工单
  | "ticket:create" | "ticket:triage" | "ticket:view";

// 后端权限编码 → 前端权限编码 映射表
// 后端格式: "requirement:create", 前端格式: "req:create"
const backendToFrontendPermMap: Record<string, Permission[]> = {
  // 需求模块
  "requirement:create": ["req:create"],
  "requirement:edit": ["req:edit"],
  "requirement:delete": ["req:delete"],
  "requirement:cancel": ["req:close"],
  "requirement:test_pass": ["req:approve"],
  "requirement:test_reject": ["req:review"],
  "requirement:release": ["req:change"],
  "requirement:dev_progress": ["req:view", "req:review"], // 开发进度推进 → 需求查看+评审操作
  // 任务模块
  "task:create": ["task:create", "task:assign"],
  "task:edit": ["task:edit"],
  "task:dev_progress": ["task:status"], // 开发流转
  "task:test_verify": ["task:status"],  // 测试验证也是状态操作
  // 测试用例模块
  "testcase:create": ["tc:create", "tc:edit"],
  "testcase:approve": ["tc:execute"],
  "testcase:manage_locked": ["tc:lock"],
  // 缺陷模块
  "bug:create": ["bug:create"],
  "bug:edit": ["bug:edit", "bug:assign"],
  "bug:confirm": ["bug:confirm"],
  "bug:close": ["bug:close", "bug:verify"],
  // 变更模块
  "change:create": ["change:create"],
  "change:approve": ["change:approve"],
  // 项目模块
  "project:create": ["proj:create"],
  "project:edit": ["proj:edit"],
  "project:delete": ["proj:delete"],
  "project:manage_member": ["proj:member"],
  // 迭代模块
  "sprint:create": ["sprint:create"],
  "sprint:edit": ["sprint:edit"],
  // 系统管理
  "system:manage": ["sys:user", "sys:audit", "sys:config", "sys:setting", "sys:gear"],
  // 工单
  "ticket:create": ["ticket:create"],
  "ticket:triage": ["ticket:triage"],
};

// 后端菜单权限 → 前端菜单key映射
const backendMenuToKey: Record<string, string[]> = {
  "dashboard": ["dashboard"],
  "project": ["projects"],
  "requirement": ["requirements"],
  "task": ["tasks", "submit-test"],
  "test": ["testing"],
  "testing": ["testing"],
  "bug": ["bugs"],
  "change": ["changes"],
  "debt": ["debt"],
  "knowledge": ["knowledge"],
  "metric": ["metrics", "governance"],
  "notification": ["notifications"],
  "system": ["settings"],
  "audit": ["audit"],
  "ticket": ["tickets"],
};

// 将后端返回的权限编码列表转换为前端权限列表
function mapBackendPermissions(backendPerms: string[]): Permission[] {
  const frontendPerms = new Set<Permission>();
  
  for (const bp of backendPerms) {
    const mapped = backendToFrontendPermMap[bp];
    if (mapped) {
      mapped.forEach(p => frontendPerms.add(p));
    }
  }
  
  // 所有人都有查看权限（view类权限不需要后端分配）
  frontendPerms.add("req:view");
  frontendPerms.add("task:view");
  frontendPerms.add("bug:view");
  frontendPerms.add("tc:view");
  frontendPerms.add("debt:view");
  frontendPerms.add("metric:view");
  frontendPerms.add("proj:view");
  frontendPerms.add("sprint:view");
  frontendPerms.add("submit:view");
  frontendPerms.add("change:view");
  frontendPerms.add("ticket:view");

  return Array.from(frontendPerms);
}

// 全量权限清单（用于sys_admin回退）
export const ALL_PERMISSIONS: Permission[] = [
  "req:create", "req:edit", "req:delete", "req:review", "req:approve", "req:close", "req:change", "req:view",
  "task:create", "task:assign", "task:edit", "task:status", "task:view",
  "bug:create", "bug:confirm", "bug:fix", "bug:verify", "bug:close", "bug:edit", "bug:assign", "bug:view",
  "tc:create", "tc:execute", "tc:lock", "tc:edit", "tc:view",
  "debt:create", "debt:assign", "debt:view", "debt:manage",
  "metric:view",
  "proj:create", "proj:edit", "proj:member", "proj:view", "proj:delete",
  "sprint:create", "sprint:edit", "sprint:view",
  "submit:create", "submit:approve", "submit:view",
  "change:create", "change:approve", "change:view",
  "dep:manage",
  "sys:user", "sys:audit", "sys:config", "sys:setting", "sys:gear",
  "ticket:create", "ticket:triage", "ticket:view",
];

// 角色对应的默认权限（作为后端接口失败时的回退）
const rolePermissionsFallback: Record<RoleType, Permission[]> = {
  sys_admin: [...ALL_PERMISSIONS],
  pm: [
    "req:create", "req:edit", "req:delete", "req:review", "req:close", "req:change", "req:view",
    "task:create", "task:view",
    "bug:view",
    "tc:create", "tc:view",
    "debt:view",
    "proj:create", "proj:edit", "proj:member", "proj:view",
    "sprint:create", "sprint:edit", "sprint:view",
    "change:create", "change:view",
    "submit:create", "submit:view",
    "ticket:create", "ticket:triage", "ticket:view",
  ],
  developer: [
    "req:view",
    "task:status", "task:view",
    "bug:create", "bug:fix", "bug:view",
    "tc:create", "tc:view",
    "debt:create", "debt:view",
    "ticket:create", "ticket:view",
  ],
  qa: [
    "req:view",
    "task:view", "task:status",
    "bug:create", "bug:edit", "bug:verify", "bug:close", "bug:view",
    "tc:create", "tc:execute", "tc:lock", "tc:edit", "tc:view",
    "debt:view",
    "sprint:view",
    "change:approve", "change:view",
    "submit:approve", "submit:view",
    "ticket:create", "ticket:view",
  ],
};

// 全量菜单定义
const allMenuItems: NavMenuItem[] = [
  { key: "dashboard", label: "工作台", path: "/app/dashboard", icon: "LayoutDashboard" },
  { key: "tickets", label: "工单管理", path: "/app/tickets", icon: "Ticket" },
  { key: "projects", label: "项目管理", path: "/app/projects", icon: "FolderKanban" },
  { key: "requirements", label: "需求管理", path: "/app/requirements", icon: "FileText" },
  { key: "sprints", label: "迭代管理", path: "/app/sprints", icon: "Layers" },
  { key: "tasks", label: "任务管理", path: "/app/tasks", icon: "Code2" },
  { key: "submit-test", label: "提测管理", path: "/app/submit-test", icon: "Play" },
  { key: "testing", label: "测试管理", path: "/app/testing", icon: "TestTube2" },
  { key: "bugs", label: "缺陷管理", path: "/app/bugs", icon: "Bug" },
  { key: "debt", label: "技术债务", path: "/app/debt", icon: "AlertTriangle" },
  { key: "changes", label: "变更管理", path: "/app/changes", icon: "GitBranch" },
  { key: "metrics", label: "效能度量", path: "/app/metrics", icon: "BarChart3" },
  { key: "governance", label: "责任看板", path: "/app/governance", icon: "Radar" },
  { key: "knowledge", label: "知识库", path: "/app/knowledge", icon: "BookOpen" },
  { key: "audit", label: "审计日志", path: "/app/audit", icon: "Shield" },
  { key: "settings", label: "系统管理", path: "/app/settings", icon: "Settings" },
  { key: "notifications", label: "通知中心", path: "/app/notifications", icon: "Bell" },
];

// 根据后端菜单权限过滤可见菜单
function filterMenusByPermissions(backendPerms: string[], role: RoleType): NavMenuItem[] {
  // 系统管理员看到所有菜单
  if (role === "sys_admin") {
    return allMenuItems.map(item => ({
      ...item,
      path: item.key === "dashboard" ? "/app/dashboard/admin" : item.path,
    }));
  }
  
  // 根据后端返回的菜单权限过滤
  const allowedKeys = new Set<string>();
  allowedKeys.add("dashboard"); // 工作台所有人都有
  allowedKeys.add("notifications"); // 通知中心所有人都有
  
  for (const bp of backendPerms) {
    const keys = backendMenuToKey[bp];
    if (keys) {
      keys.forEach(k => allowedKeys.add(k));
    }
  }
  
  // 确定工作台路径
  const dashboardPath = role === "pm" ? "/app/dashboard/pm"
    : role === "developer" ? "/app/dashboard/dev"
    : role === "qa" ? "/app/dashboard/qa"
    : "/app/dashboard/admin";
  
  return allMenuItems
    .filter(item => allowedKeys.has(item.key))
    .map(item => ({
      ...item,
      path: item.key === "dashboard" ? dashboardPath : item.path,
      label: item.key === "tasks" && role === "qa" ? "任务验证" : 
             item.key === "tasks" && role === "developer" ? "我的任务" : item.label,
    }));
}

// 角色对应的侧边栏菜单（回退用）
export interface NavMenuItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  badge?: number;
}

// 角色显示信息
export const roleInfo: Record<RoleType, { label: string; name: string; avatar: string; color: string }> = {
  sys_admin: { label: "系统管理员", name: "admin", avatar: "管", color: "#8b5cf6" },
  pm: { label: "产品经理", name: "张三", avatar: "张", color: "#ec4899" },
  developer: { label: "开发人员", name: "王五", avatar: "王", color: "#22c55e" },
  qa: { label: "测试人员", name: "赵六", avatar: "赵", color: "#f59e0b" },
};

// 顶部快捷操作按钮定义
export interface QuickAction {
  label: string;
  icon: string;
  path?: string;
  action?: string;
}

const roleQuickActions: Record<RoleType, QuickAction[]> = {
  sys_admin: [
    { label: "用户管理", icon: "Users", path: "/app/settings" },
    { label: "审计日志", icon: "Shield", path: "/app/audit" },
  ],
  pm: [
    { label: "新建需求", icon: "FileText", path: "/app/requirements/create" },
    { label: "发起变更", icon: "GitBranch", path: "/app/changes" },
  ],
  developer: [
    { label: "提交Bug", icon: "Bug", path: "/app/bugs" },
    { label: "新建技术债务", icon: "AlertTriangle", path: "/app/debt" },
  ],
  qa: [
    { label: "新建用例", icon: "FileCheck", path: "/app/testing" },
    { label: "提交Bug", icon: "Bug", path: "/app/bugs" },
  ],
};

interface RoleContextType {
  role: RoleType;
  setRole: (role: RoleType) => void;
  permissions: Permission[];
  hasPermission: (perm: Permission) => boolean;
  hasAnyPermission: (...perms: Permission[]) => boolean;
  menuItems: NavMenuItem[];
  quickActions: QuickAction[];
  info: { label: string; name: string; avatar: string; color: string };
  refreshPermissions: () => void;
}

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<RoleType>(() => {
    const saved = localStorage.getItem("taiyi_role") as RoleType | null;
    return saved || "developer";
  });
  
  const [dynamicPermissions, setDynamicPermissions] = useState<Permission[]>(() => {
    // 初始使用回退权限
    const saved = localStorage.getItem("taiyi_role") as RoleType | null;
    return rolePermissionsFallback[saved || "developer"];
  });
  
  const [dynamicMenus, setDynamicMenus] = useState<NavMenuItem[]>([]);

  // 从后端获取当前用户的实际权限
  const fetchPermissions = useCallback(async () => {
    const token = localStorage.getItem("taiyi_token");
    if (!token) return;
    
    try {
      const resp = await fetch("/api/v1/roles/my-permissions", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!resp.ok) return;
      
      const result = await resp.json();
      const data = result?.data;
      if (!data) return;
      
      const backendPerms: string[] = data.permissions || [];
      const roles: string[] = data.roles || [];
      
      // 确定当前角色（后端开发角色码为 "dev"，前端统一规范为 "developer"）
      const rawRole = roles[0] || "developer";
      const currentRole: RoleType = rawRole === "dev" ? "developer" : (rawRole as RoleType);
      
      // 系统管理员拥有所有权限
      if (currentRole === "sys_admin") {
        setDynamicPermissions([...ALL_PERMISSIONS]);
      } else {
        // 将后端权限编码映射为前端权限编码
        const mapped = mapBackendPermissions(backendPerms);
        setDynamicPermissions(mapped);
      }
      
      // 根据菜单权限过滤菜单
      const menus = filterMenusByPermissions(backendPerms, currentRole);
      setDynamicMenus(menus);
      
    } catch {
      // 接口失败时使用回退权限
      setDynamicPermissions(rolePermissionsFallback[role]);
    }
  }, [role]);

  // 登录后/角色变更后获取权限
  useEffect(() => {
    fetchPermissions();
  }, [role, fetchPermissions]);

  const setRole = useCallback((newRole: RoleType) => {
    setRoleState(newRole);
    localStorage.setItem("taiyi_role", newRole);
  }, []);

  const permissions = dynamicPermissions;
  const menuItems = dynamicMenus.length > 0 ? dynamicMenus : (rolePermissionsFallback[role] ? filterMenusByPermissions([], role) : []);
  const hasPermission = useCallback((perm: Permission) => permissions.includes(perm), [permissions]);
  const hasAnyPermission = useCallback((...perms: Permission[]) => perms.some((p) => permissions.includes(p)), [permissions]);
  const quickActions = roleQuickActions[role] || [];
  const info = roleInfo[role] || roleInfo.developer;

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        permissions,
        hasPermission,
        hasAnyPermission,
        menuItems,
        quickActions,
        info,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
