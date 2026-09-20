import { AuthForm } from "@/components/AuthForm";
import { AuthScene } from "@/components/AuthScene";

export default function RegistroPage() {
  return (
    <AuthScene>
      <AuthForm modo="registro" />
    </AuthScene>
  );
}
