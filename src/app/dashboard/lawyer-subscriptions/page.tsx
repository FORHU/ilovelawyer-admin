import { redirect } from "next/navigation"

// Each site has its own subscriptions, billed in its own currency; UK is the default.
export default function LawyerSubscriptionsIndexPage() {
  redirect("/dashboard/lawyer-subscriptions/uk")
}
