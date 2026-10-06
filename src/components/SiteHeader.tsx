import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { session, role, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-volt dot-glow" />
          <span className="text-lg font-bold tracking-tight">ADDA<span className="text-volt">.in</span></span>
        </Link>
        <nav className="hidden gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-volt" }}>Browse</Link>
          {role === "shelter" && <Link to="/shelter" activeProps={{ className: "text-volt" }}>Shelter console</Link>}
          {role === "adopter" && <Link to="/my-requests" activeProps={{ className: "text-volt" }}>My requests</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden font-mono text-[11px] uppercase text-muted-foreground sm:inline">{role ?? ""} · {session.user.email}</span>
              <button onClick={signOut} className="rounded-md border border-line px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Sign out</button>
            </>
          ) : (
            <Link to="/auth" className="rounded-md bg-volt px-3 py-2 text-sm font-bold text-primary-foreground">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-6 py-8">
        <span className="font-bold tracking-tight">ADDA<span className="text-volt">.in</span></span>
        <span className="font-mono text-[11px] text-muted-foreground">Every animal deserves a home, not a receipt.</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground/70">Bengaluru · Pune · Delhi · Mumbai</span>
      </div>
    </footer>
  );
}
