import { AppShell } from "@/components/app-shell";
import { CampaignForm } from "@/components/campaign-form";

export default function NewCampaignPage() {
  return <AppShell active="/dashboard/campaigns" title="创建 Campaign" description="选择产品、设定地区和发送数量。Campaign 创建后保持暂停，由你决定何时启动。"><CampaignForm /></AppShell>;
}
