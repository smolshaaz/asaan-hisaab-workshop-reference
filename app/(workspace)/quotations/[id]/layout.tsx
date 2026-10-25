export function generateStaticParams() {
  return [{ id: "quotation-demo" }];
}

export default function QuotationReferenceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
