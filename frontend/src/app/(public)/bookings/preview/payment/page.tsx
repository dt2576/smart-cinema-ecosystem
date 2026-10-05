import { Suspense } from "react";
import { PaymentMethodScreen } from "@/features/payment/payment-method-screen";

export default function PaymentMethodPage() {
  return <Suspense fallback={<p role="status">Đang tải bản xem trước thanh toán...</p>}><PaymentMethodScreen /></Suspense>;
}
