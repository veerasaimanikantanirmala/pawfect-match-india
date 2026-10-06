import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { petQuery } from "@/lib/pets";
import { PetTags } from "@/components/PetCard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pets/$petId")({
  loader: async ({ context, params }) => {
    const pet = await context.queryClient.ensureQueryData(petQuery(params.petId));
    if (!pet) throw notFound();
    return pet;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Adopt ${loaderData?.name ?? "a pet"} — ADDA.in` },
      { name: "description", content: `${loaderData?.name}, ${loaderData?.breed} in ${loaderData?.city}. Send an adoption request to the shelter.` },
      { property: "og:title", content: `Adopt ${loaderData?.name ?? "a pet"} — ADDA.in` },
      { property: "og:description", content: loaderData?.description ?? "" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  notFoundComponent: () => <div className="mx-auto max-w-[1280px] px-6 py-24">Pet not found. <Link to="/" className="text-volt">Browse pets</Link></div>,
  component: PetPage,
});

const schema = z.object({
  adopter_name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().trim().regex(/^[+0-9 ]{10,15}$/, "Enter a valid phone number"),
  city: z.string().trim().min(2, "Enter your city").max(60),
  home_type: z.string().max(40),
  message: z.string().trim().min(10, "Tell the shelter a bit more").max(1000),
});

function PetPage() {
  const { petId } = Route.useParams();
  const { data: pet } = useSuspenseQuery(petQuery(petId));
  const { session, role } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ adopter_name: "", phone: "", city: "", home_type: "Apartment", message: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!pet) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from("adoption_requests").insert({ ...parsed.data, pet_id: pet.id, adopter_id: session.user.id });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setSent(true);
    qc.invalidateQueries({ queryKey: ["my-requests"] });
    toast.success("Request sent to the shelter");
  };

  const input = "w-full rounded-md border border-line bg-background px-3 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-volt";

  return (
    <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Link to="/" className="label-mono text-muted-foreground hover:text-volt">← All pets</Link>
        <img src={pet.photo_url} alt={pet.name} width={1024} height={1024} className="mt-4 aspect-[4/3] w-full rounded-xl border border-line object-cover" />
        <div className="mt-6 flex items-baseline justify-between">
          <h1 className="font-display text-6xl tracking-tight">{pet.name.toUpperCase()}</h1>
          <span className="font-mono text-sm uppercase text-muted-foreground">{pet.breed} · {pet.age_label} · {pet.gender}</span>
        </div>
        <p className="mt-2 font-mono text-xs uppercase text-muted-foreground">{pet.shelter_name} · {pet.city}</p>
        <div className="mt-4"><PetTags pet={pet} /></div>
        <p className="mt-6 max-w-[60ch] text-lg text-muted-foreground">{pet.description}</p>
      </div>

      <div className="lg:col-span-5">
        <div className="sticky top-24 rounded-xl border border-line bg-panel p-5">
          <div className="label-mono mb-4 text-volt">Adoption request</div>
          {pet.status === "adopted" ? (
            <p className="text-sm text-muted-foreground">{pet.name} has found a home. 🎉</p>
          ) : !session ? (
            <>
              <p className="text-sm text-muted-foreground">Sign in as an adopter to send a request to {pet.shelter_name}.</p>
              <Link to="/auth" className="mt-4 block rounded-md bg-volt py-3 text-center text-sm font-bold text-primary-foreground">Sign in to adopt</Link>
            </>
          ) : role === "shelter" ? (
            <p className="text-sm text-muted-foreground">Shelter accounts can't send adoption requests.</p>
          ) : sent ? (
            <>
              <p className="text-sm">Request sent! The shelter will review it and you'll see the status in My requests.</p>
              <Link to="/my-requests" className="mt-4 block rounded-md border border-volt/30 py-2 text-center text-sm font-bold text-volt">View my requests</Link>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input className={input} placeholder="Your name" value={form.adopter_name} onChange={(e) => setForm({ ...form, adopter_name: e.target.value })} />
              <input className={input} placeholder="Phone (+91 …)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className={input} placeholder="City — e.g. Bengaluru" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <select className={input} value={form.home_type} onChange={(e) => setForm({ ...form, home_type: e.target.value })}>
                {["Apartment", "Independent house", "House with yard", "Joint family home"].map((h) => <option key={h}>{h}</option>)}
              </select>
              <textarea className={`${input} min-h-24`} placeholder="Why this pet fits your home…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <button disabled={busy} className="block w-full rounded-md bg-volt py-3 text-sm font-bold text-primary-foreground transition-shadow hover:shadow-glow disabled:opacity-60">
                {busy ? "Sending…" : "Submit to shelter"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
