import { Link } from "wouter";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">页面不存在</h1>
        <p className="text-muted-foreground">您访问的页面不存在或已被移除</p>
        <Link href="/">
          <Button className="bg-[#0088ff] hover:bg-[#0066cc]">返回首页</Button>
        </Link>
      </div>
    </div>
  );
}
