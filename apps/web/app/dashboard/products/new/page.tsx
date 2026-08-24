import { AppShell } from "@/components/app-shell";
import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return <AppShell active="/dashboard/products" title="新增产品" description="录入并确认可用于匹配和外联的产品事实。图片上传不在 MVP 范围内。"><ProductForm /></AppShell>;
}
