import { Suspense } from "react";
import { PaymentMethodScreen } from "@/features/payment/payment-method-screen";

export default function PaymentMethodPage() {
  return <Suspense fallback={<p role="status">Loading Payment preview...</p>}><PaymentMethodScreen /></Suspense>;
}
