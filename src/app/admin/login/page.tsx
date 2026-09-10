import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";
import { WMark } from "@/components/Mark";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="login">
      <div>
        <div style={{ display: "grid", justifyItems: "center", gap: 18, marginBottom: 26 }}>
          <WMark height={54} />
          <h1>wosmo · admin</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
