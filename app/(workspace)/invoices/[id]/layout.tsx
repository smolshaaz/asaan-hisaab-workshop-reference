export function generateStaticParams() {
  return [{ id: "invoice-demo" }];
}

export default function InvoiceReferenceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
