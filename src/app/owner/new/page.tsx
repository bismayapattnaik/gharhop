import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NewPropertyForm from "@/components/owner/NewPropertyForm";

export default async function NewPropertyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=OWNER");
  if (user.role !== "OWNER") redirect("/");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Add a property</h1>
      <NewPropertyForm />
    </div>
  );
}
