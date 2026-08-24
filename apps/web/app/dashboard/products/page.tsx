import { Plus } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/button-link";
import { StatusBadge } from "@/components/status-badge";
import { apiGet } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type Product = { id: string; name: string; description: string; service_type: string | null; product_url: string | null; moq: string | null; lead_time: string | null };

export default async function ProductsPage() {
  const { products } = await apiGet<{ products: Product[] }>("/v1/products");
  return <AppShell active="/dashboard/products" title="产品" description="只有你确认后的信息会被用于企业匹配和日文外联。">
    <div className="flex justify-end"><ButtonLink href="/dashboard/products/new"><Plus className="mr-2 size-4" weight="bold" />新增产品</ButtonLink></div>
    <div className="mt-5 grid gap-4">
      {products.map((product) => <article key={product.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{product.name}</h2><p className="mt-2 text-sm text-[var(--muted)]">{[product.service_type, product.moq, product.lead_time].filter(Boolean).join(" / ") || "尚未填写补充参数"}</p></div><StatusBadge tone="success">已确认</StatusBadge></div>
        <p className="mt-6 max-w-3xl text-pretty text-sm leading-7 text-[var(--muted)]">{product.description}</p>
        {product.product_url && <a href={product.product_url} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm font-medium text-[var(--accent-strong)]">打开产品页面</a>}
      </article>)}
      {products.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">还没有产品。先新增一个产品，匹配结果会更准确。</div>}
    </div>
  </AppShell>;
}
