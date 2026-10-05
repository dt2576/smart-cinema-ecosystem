import { Suspense } from "react";
import { ConcessionSelectionScreen } from "@/features/concession/concession-selection-screen";

export default function ConcessionSelectionPage() {
  return <Suspense fallback={<p role="status">Đang tải bắp nước...</p>}><ConcessionSelectionScreen /></Suspense>;
}
