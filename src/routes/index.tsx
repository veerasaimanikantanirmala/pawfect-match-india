import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { petsQuery, SPECIES } from "@/lib/pets";
import { PetCard } from "@/components/PetCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ADDA.in — Adopt desi dogs, cats & pets in India" },
      { name: "description", content: "Adopt Indie dogs, Indian cats, Labradors, Beagles, rabbits and birds from verified shelters across India." },
      { property: "og:title", content: "ADDA.in — Not buy. Adopt." },
      { property: "og:description", content: "Household-friendly pets from shelters in Bengaluru, Pune, Delhi and Mumbai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(petsQuery()),
  component: Index,
});

const FILTERS = [
  { id: "apartment_ok", label: "Apartment ✓" },
  { id: "kids_ok", label: "Kids ✓" },
  { id: "vaccinated", label: "Vaccinated" },
] as const;

function Index() {
  const { data: pets } = useSuspenseQuery(petsQuery());
  const [species, setSpecies] = useState<string>("all");
  const [flags, setFlags] = useState<string[]>([]);
  const shelters = new Set(pets.map((p) => p.shelter_name)).size;
  const adopted = pets.filter((p) => p.status === "adopted").length;

  const shown = pets.filter(
    (p) => (species === "all" || p.species === species) && flags.every((f) => p[f as keyof typeof p] === true),
  );

  return (
    <>
      <section className="grid-bg border-b border-line">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-end gap-10 px-6 py-24 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="label-mono mb-5 animate-rise text-volt">Bharat's adoption terminal</p>
            <h1 className="font-display text-[16vw] leading-[0.82] tracking-tight lg:text-[8.5rem]">
              NOT BUY.<br /><span className="text-volt">ADOPT.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg text-muted-foreground">
              Meet desi dogs, Indie cats, Labradors, Beagles, rabbits and birds from shelters across Bengaluru, Pune and Delhi. One request. One real home.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4">
            {[
              ["SHELTERS", shelters, true],
              ["PETS LISTED", pets.length, false],
              ["ADOPTED", adopted, false],
            ].map(([k, v, hl]) => (
              <div key={k as string} className="rounded-lg border border-line bg-panel p-4">
                <div className="font-mono text-[11px] text-muted-foreground">{k}</div>
                <div className={`text-3xl font-bold ${hl ? "text-volt" : ""}`}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-line bg-panel p-1">
            {SPECIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSpecies(s.id)}
                className={`rounded-md px-4 py-2 text-sm ${species === s.id ? "bg-volt font-bold text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2 font-mono text-[11px] uppercase tracking-wider">
            {FILTERS.map((f) => {
              const on = flags.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => setFlags(on ? flags.filter((x) => x !== f.id) : [...flags, f.id])}
                  className={`rounded-md border px-3 py-2 ${on ? "border-volt text-volt" : "border-line text-muted-foreground"}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => <PetCard key={p.id} pet={p} index={i} />)}
        </div>
        {shown.length === 0 && <p className="mt-10 font-mono text-sm text-muted-foreground">No pets match these filters yet.</p>}
      </section>
    </>
  );
}
