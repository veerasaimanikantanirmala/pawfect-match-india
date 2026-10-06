import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { statusCls } from "./my-requests";

export const Route = createFileRoute("/shelter")({
  head: () => ({
    meta: [
      { title: "Shelter console — ADDA.in" },
      { name: "description", content: "List pets with photos and approve adoption requests." },
      { property: "og:title", content: "Shelter console — ADDA.in" },
      { property: "og:description", content: "Manage listings and adoption requests for your shelter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Shelter,
});

const petSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(40),
  species: z.enum(["dog", "cat", "rabbit", "bird"]),
  breed: z.string().trim().min(1, "Breed required").max(60),
  age_label: z.string().trim().min(1, "Age required").max(20),
  gender: z.string().max(10),
  city: z.string().trim().min(2, "City required").max(60),
  temperament: z.string().trim().max(30),
  description: z.string().trim().min(10, "Add a short description").max(1000),
});

function Shelter() {
  const { session, role, loading } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id;

  const requests = useQuery({
    queryKey: ["shelter-requests", uid],
    enabled: role === "shelter",
    queryFn: async () => {
      const { data, error } = await supabase.from("adoption_requests").select("*, pets(name, breed, photo_url)").eq("shelter_id", uid!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const myPets = useQuery({
    queryKey: ["shelter-pets", uid],
    enabled: role === "shelter",
    queryFn: async () => (await supabase.from("pets").select("*").eq("shelter_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });

  if (loading) return null;
  if (!session || role !== "shelter")
    return <div className="mx-auto max-w-[1280px] px-6 py-24">This console is for shelter accounts. <Link to="/auth" className="text-volt">Sign in or join as a shelter →</Link></div>;

  const decide = async (id: string, status: "approved" | "declined") => {
    const { error } = await supabase.from("adoption_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved — pet marked adopted" : "Request declined");
    qc.invalidateQueries();
  };

  return (
    <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-12">
      <div className="space-y-10 lg:col-span-7">
        <div>
          <div className="mb-6 flex items-center gap-3"><span className="label-mono text-volt">Incoming requests</span><span className="h-px flex-1 bg-line" /></div>
          <div className="overflow-hidden rounded-xl border border-line">
            {(requests.data ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">No requests yet.</p>}
            {(requests.data ?? []).map((r) => (
              <div key={r.id} className="border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-accent">
                <div className="flex items-center gap-3">
                  <img src={r.pets?.photo_url} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{r.pets?.name} <span className="font-mono text-[10px] text-muted-foreground">· {r.pets?.breed}</span></div>
                    <div className="font-mono text-[11px] text-muted-foreground">{r.adopter_name} · {r.city} · {r.home_type} · {r.phone}</div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {r.status === "pending" ? (
                      <>
                        <button onClick={() => decide(r.id, "approved")} className="rounded-md bg-success px-3 py-1.5 text-xs font-bold text-primary-foreground">Approve</button>
                        <button onClick={() => decide(r.id, "declined")} className="rounded-md border border-warn/40 px-3 py-1.5 text-xs font-bold text-warn">Decline</button>
                      </>
                    ) : (
                      <span className={`rounded border px-3 py-1 font-mono text-[10px] font-bold uppercase ${statusCls[r.status]}`}>{r.status}</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 pl-13 text-xs text-muted-foreground">"{r.message}"</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-6 flex items-center gap-3"><span className="label-mono text-volt">Your listings</span><span className="h-px flex-1 bg-line" /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(myPets.data ?? []).map((p) => (
              <Link key={p.id} to="/pets/$petId" params={{ petId: p.id }} className="overflow-hidden rounded-lg border border-line bg-panel hover:border-volt/50">
                <img src={p.photo_url} alt={p.name} className="aspect-square w-full object-cover" />
                <div className="flex justify-between p-2 text-sm"><b>{p.name}</b><span className="font-mono text-[10px] uppercase text-muted-foreground">{p.status}</span></div>
              </Link>
            ))}
            {(myPets.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No pets listed yet.</p>}
          </div>
        </div>
      </div>
      <div className="lg:col-span-5"><AddPet uid={session.user.id} onDone={() => qc.invalidateQueries()} /></div>
    </section>
  );
}

function AddPet({ uid, onDone }: { uid: string; onDone: () => void }) {
  const empty = { name: "", species: "dog", breed: "Indie (Desi)", age_label: "", gender: "Female", city: "", temperament: "Friendly", description: "" };
  const [f, setF] = useState(empty);
  const [flags, setFlags] = useState({ apartment_ok: true, kids_ok: true, vaccinated: true });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-md border border-line bg-background px-3 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-volt";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = petSchema.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    if (!file) return toast.error("Add a photo");
    if (!file.type.startsWith("image/")) return toast.error("Photo must be an image");
    setBusy(true);
    try {
      const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
      const up = await supabase.storage.from("pet-photos").upload(path, file);
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("pet-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle();
      const { error } = await supabase.from("pets").insert({ ...p.data, ...flags, shelter_id: uid, shelter_name: prof?.display_name ?? "", photo_url: signed.data.signedUrl });
      if (error) throw error;
      toast.success(`${f.name} is now listed`);
      setF(empty); setFile(null); onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="sticky top-24 space-y-3 rounded-xl border border-line bg-panel p-5">
      <div className="label-mono mb-1 text-volt">List a pet</div>
      <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-line bg-background p-4 font-mono text-xs text-muted-foreground hover:border-volt">
        {file ? file.name : "+ Upload photo"}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <input className={input} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className={input} value={f.species} onChange={(e) => setF({ ...f, species: e.target.value })}>
          <option value="dog">Dog</option><option value="cat">Cat</option><option value="rabbit">Rabbit</option><option value="bird">Bird</option>
        </select>
        <input className={input} placeholder="Breed (Indie, Lab…)" value={f.breed} onChange={(e) => setF({ ...f, breed: e.target.value })} />
        <input className={input} placeholder="Age (e.g. 2 yrs)" value={f.age_label} onChange={(e) => setF({ ...f, age_label: e.target.value })} />
        <select className={input} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option>Female</option><option>Male</option></select>
        <input className={input} placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      </div>
      <input className={input} placeholder="Temperament (Calm, Active…)" value={f.temperament} onChange={(e) => setF({ ...f, temperament: e.target.value })} />
      <textarea className={`${input} min-h-20`} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase">
        {(Object.keys(flags) as (keyof typeof flags)[]).map((k) => (
          <button type="button" key={k} onClick={() => setFlags({ ...flags, [k]: !flags[k] })} className={`rounded-md border px-3 py-2 ${flags[k] ? "border-volt text-volt" : "border-line text-muted-foreground"}`}>
            {k === "apartment_ok" ? "Apartment ✓" : k === "kids_ok" ? "Kids ✓" : "Vaccinated"}
          </button>
        ))}
      </div>
      <button disabled={busy} className="w-full rounded-md bg-volt py-3 text-sm font-bold text-primary-foreground hover:shadow-glow disabled:opacity-60">{busy ? "Publishing…" : "Publish listing"}</button>
    </form>
  );
}
