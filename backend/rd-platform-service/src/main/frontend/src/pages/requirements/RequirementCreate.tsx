import { useLocation } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";
import RequirementForm from "@/components/forms/RequirementForm";

export default function RequirementCreate() {
  const [, setLocation] = useLocation();
  const { currentLevel } = useProject();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/app/requirements")} className="rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0088ff]" /> 创建需求
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            当前档位: <Badge className="text-[10px]" variant="outline">{currentLevel}</Badge>
            {currentLevel === "L1" && " 仅需填写核心字段"}
            {currentLevel === "L2" && " 需填写核心+规范字段"}
            {currentLevel === "L3" && " 需填写全部字段"}
          </p>
        </div>
      </div>

      <RequirementForm
        onSuccess={(asDraft, newId) => {
          if (asDraft) {
            setLocation("/app/requirements");
          } else {
            setLocation(newId ? `/app/requirements/${newId}` : "/app/requirements");
          }
        }}
        onCancel={() => setLocation("/app/requirements")}
      />
    </div>
  );
}
