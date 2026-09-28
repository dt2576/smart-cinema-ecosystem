import type { ReactNode } from "react";
import { ConcessionPreviewProvider } from "@/features/concession/concession-preview-provider";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <ConcessionPreviewProvider>{children}</ConcessionPreviewProvider>;
}
