import { AppShell } from "@/components/app-shell";
import { WorkspaceForm } from "@/components/workspace-form";
import { apiGet } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { workspace } = await apiGet<{ workspace: Record<string, string | null> | null }>("/v1/workspace");
  return <AppShell active="/dashboard/settings" title="设置" description="Workspace 信息由所有 Campaign 共用。修改会结束正在执行的 Run。">
    <WorkspaceForm workspace={workspace} />
  </AppShell>;
}
