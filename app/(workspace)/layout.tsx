import { AppShell } from "@/components/app-shell";
import { ProductProvider } from "@/components/product-context";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProductProvider>
      <AppShell>{children}</AppShell>
    </ProductProvider>
  );
}
