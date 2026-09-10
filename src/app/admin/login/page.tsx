import { redirect } from "next/navigation";
import { adminBase, isAdmin } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";
import { WMark } from "@/components/Mark";
import "@/styles/admin-login.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // The middleware normally catches this first; keeping it means a session that starts mid-render
  // still lands on the panel rather than on the form. The base carries the secret segment, so the
  // visitor never sees a bare /admin.
  if (await isAdmin()) redirect(adminBase() ?? "/");
  return (
    <main className="lgn">
      <div className="lgn__sky" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <section className="sf lgn__card">
        <div className="sf__in">
          <header className="lgn__head">
            <WMark height={38} />
            <h1>wosmo · admin</h1>
            <p>one password · no recovery</p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
