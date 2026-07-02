import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { fetchFriendLinks, submitFriendLink, type FriendLink } from "@/lib/api";
import { AnimateIn } from "@/hooks/use-animate";
import { SeoHead } from "@/components/seo-head";

function LinkCard({ link }: { link: FriendLink }) {
  const hostname = (() => {
    try { return new URL(link.url).hostname; } catch { return link.url; }
  })();

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-[14px] rounded-md border border-border/16 bg-background/22 p-[14px] transition-all duration-200 hover:border-border/30 hover:bg-accent/12 hover:-translate-y-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/30 text-[16px] font-semibold text-muted-foreground/60">
        {link.avatarUrl ? (
          <img src={link.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          link.siteName.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[8px]">
          <span className="truncate text-[15px] font-medium text-foreground">{link.siteName}</span>
          <svg className="h-[12px] w-[12px] shrink-0 text-muted-foreground/25 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M7 7h10v10" /></svg>
        </div>
        <p className="mt-[4px] truncate text-[13px] leading-[1.5] text-muted-foreground/55">
          {link.description || "这个站点还没有填写简介。"}
        </p>
        <p className="mt-[2px] truncate text-[11px] text-muted-foreground/30">{hostname}</p>
      </div>
    </a>
  );
}

export function LinksPage() {
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 表单状态
  const [form, setForm] = useState({ siteName: "", url: "", description: "", avatarUrl: "", contact: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadLinks = useCallback(() => {
    setLoading(true);
    setError("");
    fetchFriendLinks()
      .then(setLinks)
      .catch(() => setError("友链加载失败，请检查网络后重试。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.siteName.trim() || !form.url.trim()) {
      setSubmitMsg({ type: "error", text: "站点名称和 URL 为必填项" });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await submitFriendLink(form);
      if (res.success) {
        setSubmitMsg({ type: "success", text: res.message || "申请已提交，等待审核。" });
        setForm({ siteName: "", url: "", description: "", avatarUrl: "", contact: "", email: "" });
      } else {
        setSubmitMsg({ type: "error", text: res.error || "提交失败，请稍后重试。" });
      }
    } catch {
      setSubmitMsg({ type: "error", text: "网络错误，请稍后重试。" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[900px] px-[16px] py-[32px] lg:px-0 lg:py-[56px]">
      <SeoHead
        title="友链"
        description="这里收纳一些长期关注、风格相近或彼此认识的站点。申请会先进入后台审核，避免无效链接和重复提交。"
        url="/links"
        breadcrumbs={[{ name: "首页", url: "/" }, { name: "友链", url: "/links" }]}
      />
      {/* Header */}
      <div className="animate-fade-in-up rounded-md border border-border/20 bg-background/30 p-[18px] sm:p-[22px]">
        <div className="flex items-center gap-[8px]">
          <svg className="h-[14px] w-[14px] text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          <p className="font-mono text-[11px] uppercase text-muted-foreground/42">Links</p>
        </div>
        <div className="mt-[10px]">
          <h1 className="font-heading text-[28px] font-semibold tracking-[-0.03em] sm:text-[36px]">友链</h1>
          <p className="mt-[8px] max-w-[600px] text-[14px] leading-[1.7] text-muted-foreground">
            这里收纳一些长期关注、风格相近或彼此认识的站点。申请会先进入后台审核，避免无效链接和重复提交。
          </p>
        </div>
      </div>
      <Separator className="my-[24px] bg-border/25" />

      {/* Two-column layout */}
      <div className="flex flex-col gap-[32px] lg:flex-row">
        {/* Left: Approved sites */}
        <div className="flex-1 min-w-0">
          <div className="mb-[16px] flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-muted-foreground/55">已通过站点</h2>
            <span className="font-mono text-[11px] text-muted-foreground/32">{links.length} 个</span>
          </div>

          {loading ? (
            <div className="space-y-[10px]">{[1, 2, 3].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-md bg-card/20" />)}</div>
          ) : error ? (
            <div className="rounded-md border border-dashed border-red-400/25 bg-red-400/8 px-[20px] py-[52px] text-center">
              <p className="text-[15px] font-medium text-red-400/90">{error}</p>
              <button onClick={loadLinks} className="mt-[14px] inline-flex min-h-[40px] items-center rounded-md border border-border/20 px-[12px] text-[12px] text-muted-foreground/75 transition-colors hover:bg-accent/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">重试</button>
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/25 bg-background/20 px-[20px] py-[52px] text-center">
              <p className="text-[15px] font-medium text-foreground/80">暂无友链</p>
              <p className="mx-auto mt-[8px] max-w-[360px] text-[13px] leading-[1.7] text-muted-foreground/60">还没有通过的友链，快来成为第一个吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
              {links.map((link, i) => (
                <AnimateIn key={link.id} delay={`delay-${Math.min(i, 6)}`}>
                  <LinkCard link={link} />
                </AnimateIn>
              ))}
            </div>
          )}
        </div>

        {/* Right: Application form */}
        <div className="w-full lg:w-[320px] lg:shrink-0">
          <div className="sticky top-[80px] rounded-md border border-border/20 bg-background/30 p-[20px]">
            <h2 className="mb-[16px] text-[15px] font-semibold text-foreground">申请友链</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-[12px]">
              <div>
                <label className="mb-[4px] block text-[12px] text-muted-foreground/70">站点名称 *</label>
                <input type="text" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} maxLength={64} placeholder="你的站点名称" className="w-full rounded-md border border-border/20 bg-background/40 px-[10px] py-[7px] text-[13px] text-foreground placeholder:text-muted-foreground/35 outline-none transition-colors focus:border-border/50" />
              </div>
              <div>
                <label className="mb-[4px] block text-[12px] text-muted-foreground/70">URL *</label>
                <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} maxLength={512} placeholder="https://example.com" className="w-full rounded-md border border-border/20 bg-background/40 px-[10px] py-[7px] text-[13px] text-foreground placeholder:text-muted-foreground/35 outline-none transition-colors focus:border-border/50" />
              </div>
              <div>
                <label className="mb-[4px] block text-[12px] text-muted-foreground/70">一句话介绍你的站点</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={256} rows={2} placeholder="一句话介绍你的站点" className="w-full resize-none rounded-md border border-border/20 bg-background/40 px-[10px] py-[7px] text-[13px] text-foreground placeholder:text-muted-foreground/35 outline-none transition-colors focus:border-border/50" />
              </div>
              <div>
                <label className="mb-[4px] block text-[12px] text-muted-foreground/70">头像 URL，可选</label>
                <input type="url" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} maxLength={512} placeholder="https://example.com/avatar.png" className="w-full rounded-md border border-border/20 bg-background/40 px-[10px] py-[7px] text-[13px] text-foreground placeholder:text-muted-foreground/35 outline-none transition-colors focus:border-border/50" />
              </div>
              <div>
                <label className="mb-[4px] block text-[12px] text-muted-foreground/70">联系人，可选</label>
                <input type="text" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} maxLength={64} placeholder="你的称呼" className="w-full rounded-md border border-border/20 bg-background/40 px-[10px] py-[7px] text-[13px] text-foreground placeholder:text-muted-foreground/35 outline-none transition-colors focus:border-border/50" />
              </div>
              <div>
                <label className="mb-[4px] block text-[12px] text-muted-foreground/70">邮箱，可选</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={128} placeholder="your@email.com" className="w-full rounded-md border border-border/20 bg-background/40 px-[10px] py-[7px] text-[13px] text-foreground placeholder:text-muted-foreground/35 outline-none transition-colors focus:border-border/50" />
              </div>

              {submitMsg && (
                <div className={`rounded-md px-[12px] py-[8px] text-[12px] ${submitMsg.type === "success" ? "bg-emerald-400/8 text-emerald-400/90" : "bg-red-400/8 text-red-400/90"}`}>
                  {submitMsg.text}
                </div>
              )}

              <button type="submit" disabled={submitting} className="mt-[4px] inline-flex min-h-[40px] items-center justify-center gap-[8px] rounded-md bg-foreground px-[20px] text-[13px] font-medium text-background transition-all duration-200 hover:bg-foreground/85 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {submitting ? (
                  "提交中..."
                ) : (
                  <>
                    <svg className="h-[14px] w-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    提交申请
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}