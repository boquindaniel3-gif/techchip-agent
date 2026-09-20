import { AuthForm } from "@/components/AuthForm";
import { AuthScene } from "@/components/AuthScene";

export default function LoginPage() {
  return (
    <AuthScene>
      <AuthForm modo="login" />
    </AuthScene>
  );
}
