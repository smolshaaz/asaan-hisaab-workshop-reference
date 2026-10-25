export function generateStaticParams() {
  return [{ id: "car-demo" }];
}

export default function CarReferenceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
