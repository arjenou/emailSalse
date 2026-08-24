import { AppShell } from "@/components/app-shell";
import { CampaignForm } from "@/components/campaign-form";
import { apiGet } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const { products } = await apiGet<{ products: Array<{ id: string; name: string }> }>("/v1/products");
  return <AppShell active="/dashboard/campaigns" title="创建 Campaign" description="选择产品、设定来源和数量。Campaign 创建后保持暂停，由你决定何时启动。"><CampaignForm products={products} /></AppShell>;
}
