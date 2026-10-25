export function generateStaticParams() {
  return [{ id: "bill-demo" }];
}

export default function BillReferenceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
