import { AuthForm } from "@/components/AuthForm";

export default function RegistroPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <AuthForm modo="registro" />
    </div>
  );
}
