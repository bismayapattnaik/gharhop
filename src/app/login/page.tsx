import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = role === "OWNER" || role === "ADMIN" ? role : "SEEKER";

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-64px)] justify-center bg-neutral-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white">Sign in to GharHop</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Prototype login — any phone number works, no OTP is actually sent. First time using this number
          creates your account.
        </p>
        <LoginForm initialRole={initialRole} />
      </div>
    </div>
  );
}
