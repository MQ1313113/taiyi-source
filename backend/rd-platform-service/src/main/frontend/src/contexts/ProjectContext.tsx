import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// 框架档位定义
export type FrameworkLevel = "L1" | "L2" | "L3";

export interface FrameworkLevelInfo {
  id: FrameworkLevel;
  label: string;
  fullLabel: string;
  description: string;
  color: string;
  features: string[];
}

export const frameworkLevels: FrameworkLevelInfo[] = [
  {
    id: "L1",
    label: "精简档 L1",
    fullLabel: "精简档",
    description: "适用于小型项目或快速迭代，仅包含核心研发管理流程",
    color: "#22c55e",
    features: ["需求管理", "任务管理", "缺陷管理", "基础看板"],
  },
  {
    id: "L2",
    label: "标准档 L2",
    fullLabel: "标准档",
    description: "适用于中型项目，包含完整的研发管理流程和质量保障",
    color: "#0088ff",
    features: ["需求管理", "任务管理", "缺陷管理", "测试管理", "迭代管理", "技术债务", "知识库", "效能度量"],
  },
  {
    id: "L3",
    label: "完整档 L3",
    fullLabel: "完整档",
    description: "适用于大型项目或高合规要求，包含全部管理能力和高级特性",
    color: "#8b5cf6",
    features: ["需求管理", "任务管理", "缺陷管理", "测试管理", "迭代管理", "技术债务", "知识库", "效能度量", "风险管理", "合规审计", "自动化流水线", "多项目协同"],
  },
];

interface ProjectContextType {
  currentLevel: FrameworkLevel;
  setLevel: (level: FrameworkLevel) => void;
  levelInfo: FrameworkLevelInfo;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentLevel, setCurrentLevel] = useState<FrameworkLevel>(() => {
    const saved = localStorage.getItem("taiyi_framework_level");
    return (saved as FrameworkLevel) || "L2";
  });

  const setLevel = useCallback((level: FrameworkLevel) => {
    setCurrentLevel(level);
    localStorage.setItem("taiyi_framework_level", level);
  }, []);

  const levelInfo = frameworkLevels.find(l => l.id === currentLevel) || frameworkLevels[1];

  return (
    <ProjectContext.Provider value={{ currentLevel, setLevel, levelInfo }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
