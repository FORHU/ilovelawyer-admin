import { redirect } from "next/navigation"

// Each site has its own plans; UK is the default.
export default function PaymentPlansIndexPage() {
  redirect("/dashboard/payment-plans/uk")
}
