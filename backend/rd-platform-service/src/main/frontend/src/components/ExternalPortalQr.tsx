import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";

/**
 * 对外报障入口二维码。内容为当前访问地址下的 /support 公开页,
 * 手机浏览器/微信扫一扫都会直接打开该网页(前提:扫码设备能访问到本系统地址)。
 */
export default function ExternalPortalQr({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/support`;
  const isLocal = /localhost|127\.0\.0\.1/.test(url);

  const copyLink = () => {
    copyText(url).then(
      () => toast.success("链接已复制"), () => toast.error("复制失败,请手动复制"));
  };

  const download = () => {
    const canvas = boxRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "问题反馈入口二维码.png";
    a.click();
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="outline" className="rounded-lg">
            <QrCode className="w-4 h-4 mr-1" /> 对外报障二维码
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>对外问题反馈入口</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div ref={boxRef} className="p-4 bg-white rounded-xl border">
              <QRCodeCanvas value={url} size={208} level="M" includeMargin />
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all text-center">{url}</p>
            <p className="text-xs text-muted-foreground text-center">
              手机浏览器或微信"扫一扫"即可打开报障页,无需登录。
              可将二维码图片下载后分享到群聊、打印张贴在设备旁。
            </p>
            {isLocal && (
              <p className="text-xs text-amber-600 text-center">
                当前访问地址是 localhost,其他设备扫码无法打开——请用服务器 IP 或域名访问本系统后再分享二维码。
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyLink}><Copy className="w-3.5 h-3.5 mr-1" />复制链接</Button>
              <Button size="sm" onClick={download} className="bg-[#0088ff] hover:bg-[#0066cc] text-white">
                <Download className="w-3.5 h-3.5 mr-1" />下载二维码
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
