import Link from "next/link";
import { ArrowLeft } from "@/lib/icons";

export function SettingsBackLink() {
  return (
    <Link href="/settings" className="back-link settings-back-link">
      <ArrowLeft size={18} aria-hidden="true" /> Back to More & settings
    </Link>
  );
}
