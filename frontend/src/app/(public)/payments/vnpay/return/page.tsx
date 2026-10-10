import type { Metadata } from "next";
import { PaymentReturnScreen } from "@/features/payment/payment-return-screen";

export const metadata: Metadata = { title: "Kiểm tra thanh toán | Smart Cinema", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function PaymentReturnPage() {
  return <PaymentReturnScreen />;
}
