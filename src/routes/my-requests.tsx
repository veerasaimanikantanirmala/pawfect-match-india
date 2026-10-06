import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/my-requests")({
  head: () => ({
    meta: [
      { title: "My adoption requests — ADDA.in" },
      { name: "description", content: "Track the status of your adoption requests." },
      { property: "og:title", content: "My adoption requests — ADDA.in" },
      { property: "og:description", content: "See which shelters approved your requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyRequests,
});

export const statusCls: Record<string, string> = {
  pending: "border-line text-muted-foreground",
  approved: "border-success/40 text-success",
  declined: "border-warn/40 text-warn",
};

function MyRequests() {
  const { session, loading } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["my-requests", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("adoption_requests").select("*, pets(name, breed, photo_url, shelter_name, city)").eq("adopter_id", session!.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!loading && !session) return <div className="mx-auto max-w-[1280px] px-6 py-24">Please <Link to="/auth" className="text-volt">sign in</Link> to see your requests.</div>;

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-16">
      <div className="mb-6 flex items-center gap-3"><span className="label-mono text-volt">My requests</span><span className="h-px flex-1 bg-line" /></div>
      <div className="overflow-hidden rounded-xl border border-line">
        {data.length === 0 && <p className="p-6 text-sm text-muted-foreground">No requests yet. <Link to="/" className="text-volt">Find a friend →</Link></p>}
        {data.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            <img src={r.pets?.photo_url} alt="" className="size-12 rounded-md object-cover" />
            <div className="min-w-0">
              <div className="text-sm font-bold">{r.pets?.name} <span className="font-mono text-[10px] text-muted-foreground">· {r.pets?.breed}</span></div>
              <div className="font-mono text-[11px] text-muted-foreground">{r.pets?.shelter_name} · {r.pets?.city} · {new Date(r.created_at).toLocaleDateString("en-IN")}</div>
            </div>
            <span className={`ml-auto rounded border px-3 py-1 font-mono text-[10px] font-bold uppercase ${statusCls[r.status]}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
