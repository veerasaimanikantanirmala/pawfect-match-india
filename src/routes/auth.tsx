import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ADDA.in" },
      { name: "description", content: "Sign in or join ADDA.in as an adopter or a shelter." },
      { property: "og:title", content: "Sign in — ADDA.in" },
      { property: "og:description", content: "Join as an adopter or list pets as a shelter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(6, "Password must be 6+ characters") });

function AuthPage() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [role, setRole] = useState<"adopter" | "shelter">("adopter");
  const [f, setF] = useState({ email: "", password: "", display_name: "", city: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) nav({ to: "/" }); }, [session, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) return void toast.error(p.error.issues[0]?.message);
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        ...p.data,
        options: { emailRedirectTo: window.location.origin, data: { role, display_name: f.display_name.trim().slice(0, 100), city: f.city.trim().slice(0, 60) } },
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account");
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  };

  const input = "w-full rounded-md border border-line bg-background px-3 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-volt";

  return (
    <section className="grid-bg min-h-[80vh] border-b border-line">
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="font-display text-6xl">{mode === "in" ? "WELCOME BACK." : <>JOIN <span className="text-volt">ADDA.</span></>}</h1>
        <div className="mt-8 rounded-xl border border-line bg-panel p-5">
          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
                  {(["adopter", "shelter"] as const).map((r) => (
                    <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-md py-2 text-sm ${role === r ? "bg-volt font-bold text-primary-foreground" : "text-muted-foreground"}`}>
                      {r === "adopter" ? "I want to adopt" : "I run a shelter"}
                    </button>
                  ))}
                </div>
                <input className={input} placeholder={role === "shelter" ? "Shelter name" : "Your name"} value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
                <input className={input} placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
              </>
            )}
            <input className={input} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={input} type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <button disabled={busy} className="w-full rounded-md bg-volt py-3 text-sm font-bold text-primary-foreground hover:shadow-glow disabled:opacity-60">
              {mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>
          {(mode === "in" || role === "adopter") && (
            <button onClick={google} className="mt-3 w-full rounded-md border border-line py-3 text-sm hover:border-volt/50">Continue with Google</button>
          )}
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="label-mono mt-5 block text-muted-foreground hover:text-volt">
            {mode === "in" ? "New here? Create an account →" : "Have an account? Sign in →"}
          </button>
        </div>
      </div>
    </section>
  );
}
