import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = role === "OWNER" || role === "ADMIN" ? role : "SEEKER";

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-bold text-slate-900">Sign in to GharHop</h1>
      <p className="mt-1 text-sm text-slate-500">
        Prototype login — any phone number works, no OTP is actually sent. First time using this number
        creates your account.
      </p>
      <LoginForm initialRole={initialRole} />
    </div>
  );
}
