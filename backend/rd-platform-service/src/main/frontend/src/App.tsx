import { Suspense } from "react";
import { lazyWithRetry as lazy } from "./lib/lazyWithRetry";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RoleProvider } from "./contexts/RoleContext";
import { ProjectProvider } from "./contexts/ProjectContext";

// Lazy load all pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout"));
const DeveloperDashboard = lazy(() => import("./pages/dashboards/DeveloperDashboard"));
const ProductManagerDashboard = lazy(() => import("./pages/dashboards/ProductManagerDashboard"));
const QADashboard = lazy(() => import("./pages/dashboards/QADashboard"));
const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard"));
const RequirementList = lazy(() => import("./pages/requirements/RequirementList"));
const RequirementCreate = lazy(() => import("./pages/requirements/RequirementCreate"));
const RequirementDetail = lazy(() => import("./pages/requirements/RequirementDetail"));
const TaskList = lazy(() => import("./pages/tasks/TaskList"));
const TaskKanban = lazy(() => import("./pages/tasks/TaskKanban"));
const TaskDetail = lazy(() => import("./pages/tasks/TaskDetail"));
const BugList = lazy(() => import("./pages/bugs/BugList"));
const BugCreate = lazy(() => import("./pages/bugs/BugCreate"));
const BugDetail = lazy(() => import("./pages/bugs/BugDetail"));
const TestCaseList = lazy(() => import("./pages/testing/TestCaseList"));
const ProjectList = lazy(() => import("./pages/projects/ProjectList"));
const ProjectDetail = lazy(() => import("./pages/projects/ProjectDetail"));
const TechDebtList = lazy(() => import("./pages/debt/TechDebtList"));
const KnowledgeBase = lazy(() => import("./pages/knowledge/KnowledgeBase"));
const MetricsDashboard = lazy(() => import("./pages/analytics/AnalyticsPage"));
const SprintBoard = lazy(() => import("./pages/sprints/SprintBoard"));
const NotificationCenter = lazy(() => import("./pages/notifications/NotificationCenter"));
import GlobalNotificationToast from "./components/notifications/GlobalNotificationToast";
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const SubmitTestList = lazy(() => import("./pages/submit-test/SubmitTestList"));
const ChangeRequestList = lazy(() => import("./pages/changes/ChangeRequestList"));
const AuditLogList = lazy(() => import("./pages/audit/AuditLogList"));
const DependencyList = lazy(() => import("./pages/dependencies/DependencyList"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function LoadingFallback() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#0088ff] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">加载中...</span>
      </div>
    </div>
  );
}

function FullScreenLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#0088ff] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">加载中...</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path="/app/dashboard/dev" component={DeveloperDashboard} />
          <Route path="/app/dashboard/pm" component={ProductManagerDashboard} />
          <Route path="/app/dashboard/qa" component={QADashboard} />
          <Route path="/app/dashboard/admin" component={AdminDashboard} />
          <Route path="/app/projects" component={ProjectList} />
          <Route path="/app/projects/:id" component={ProjectDetail} />
          <Route path="/app/sprints" component={SprintBoard} />
          <Route path="/app/requirements" component={RequirementList} />
          <Route path="/app/requirements/create" component={RequirementCreate} />
          <Route path="/app/requirements/:id" component={RequirementDetail} />
          <Route path="/app/tasks" component={TaskList} />
          <Route path="/app/tasks/kanban" component={TaskKanban} />
          <Route path="/app/tasks/:id" component={TaskDetail} />
          <Route path="/app/testing" component={TestCaseList} />
          <Route path="/app/bugs" component={BugList} />
          <Route path="/app/bugs/create" component={BugCreate} />
          <Route path="/app/bugs/:id" component={BugDetail} />
          <Route path="/app/debt" component={TechDebtList} />
          <Route path="/app/knowledge" component={KnowledgeBase} />
          <Route path="/app/metrics" component={MetricsDashboard} />
          <Route path="/app/notifications" component={NotificationCenter} />
          <Route path="/app/submit-test" component={SubmitTestList} />
          <Route path="/app/changes" component={ChangeRequestList} />
          <Route path="/app/audit" component={AuditLogList} />
          <Route path="/app/dependencies" component={DependencyList} />
          <Route path="/app/settings" component={SettingsPage} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Suspense fallback={<FullScreenLoadingFallback />}>
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/app/*" component={AppRoutes} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <RoleProvider>
          <ProjectProvider>
            <TooltipProvider>
              <Toaster />
              <GlobalNotificationToast />
              <Router />
            </TooltipProvider>
          </ProjectProvider>
        </RoleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
