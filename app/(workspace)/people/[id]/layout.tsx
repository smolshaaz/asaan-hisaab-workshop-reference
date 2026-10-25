export function generateStaticParams() {
  return [{ id: "person-demo" }];
}

export default function PersonReferenceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
