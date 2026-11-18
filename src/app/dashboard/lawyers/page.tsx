import { redirect } from "next/navigation"

// Each site has its own queue, picked from the sidebar like Practice Area; UK is the default.
export default function LawyersIndexPage() {
  redirect("/dashboard/lawyers/uk")
}
