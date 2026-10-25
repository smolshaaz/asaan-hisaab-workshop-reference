export function generateStaticParams() {
  return [{ id: "customer-demo" }];
}

export default function CustomerReferenceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
