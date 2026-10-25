"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BillForm } from "@/components/bill-form";

function NewBill() {
  const params = useSearchParams();
  const router = useRouter();
  const direction = params.get("direction");
  const person = params.get("person");
  const car = params.get("car");

  useEffect(() => {
    if (direction !== "SALE") return;
    const query = new URLSearchParams();
    if (person) query.set("person", person);
    if (car) query.set("car", car);
    router.replace(`/invoices/record${query.size ? `?${query}` : ""}`);
  }, [car, direction, person, router]);

  return <BillForm fixedDirection="PURCHASE" />;
}

export default function NewBillPage() {
  return (
    <Suspense fallback={<div className="page">Loading bill form…</div>}>
      <NewBill />
    </Suspense>
  );
}
