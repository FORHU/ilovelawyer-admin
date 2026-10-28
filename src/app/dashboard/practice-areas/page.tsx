import { redirect } from "next/navigation"

// Each site has its own list; UK is the default.
export default function PracticeAreasIndexPage() {
  redirect("/dashboard/practice-areas/uk")
}
