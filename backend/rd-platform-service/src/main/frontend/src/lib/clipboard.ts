/**
 * 复制文本到剪贴板,兼容非安全上下文。
 *
 * navigator.clipboard 仅在 HTTPS 或 localhost 下存在;通过局域网 IP(http://192.168.x.x)
 * 访问时为 undefined,直接调用会抛 "Cannot read properties of undefined"。
 * 此处优先走异步剪贴板 API,不可用或被拒时降级为隐藏 textarea + execCommand('copy')。
 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 权限被拒等场景,继续走降级方案
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    if (!document.execCommand("copy")) throw new Error("复制失败");
  } finally {
    document.body.removeChild(ta);
  }
}
