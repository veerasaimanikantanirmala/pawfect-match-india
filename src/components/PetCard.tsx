import { Link } from "@tanstack/react-router";
import { type Pet, speciesLabel } from "@/lib/pets";

export function Tag({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "ok" | "warn" }) {
  const cls = tone === "ok" ? "border-success/40 text-success" : tone === "warn" ? "border-warn/40 text-warn" : "border-line text-foreground/80";
  return <span className={`rounded border px-2 py-1 text-[11px] ${cls}`}>{children}</span>;
}

export function PetTags({ pet }: { pet: Pet }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {pet.apartment_ok && <Tag>Apartment ✓</Tag>}
      {pet.kids_ok && <Tag>Kids ✓</Tag>}
      {pet.temperament && <Tag tone="warn">{pet.temperament}</Tag>}
      {pet.vaccinated && <Tag tone="ok">Vaccinated</Tag>}
    </div>
  );
}

export function PetCard({ pet, index }: { pet: Pet; index: number }) {
  const adopted = pet.status === "adopted";
  return (
    <article
      className="group animate-rise overflow-hidden rounded-xl border border-line bg-panel transition-colors hover:border-volt/50 hover:shadow-glow"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative overflow-hidden">
        <img src={pet.photo_url} alt={`${pet.name}, ${pet.breed}`} loading="lazy" width={1024} height={768} className="aspect-[4/3] w-full object-cover" />
        <span className="absolute left-3 top-3 rounded bg-volt px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary-foreground">{speciesLabel(pet)}</span>
        {adopted && <span className="absolute right-3 top-3 rounded bg-success px-2 py-1 font-mono text-[10px] font-bold uppercase text-primary-foreground">Adopted</span>}
        {index === 0 && <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-volt/10 to-transparent" />}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-bold tracking-tight">{pet.name}</h3>
          <span className="font-mono text-xs uppercase text-muted-foreground">{pet.age_label} · {pet.city}</span>
        </div>
        <div className="mt-3"><PetTags pet={pet} /></div>
        <Link
          to="/pets/$petId"
          params={{ petId: pet.id }}
          className="mt-4 block rounded-md border border-volt/30 py-2 text-center text-sm font-bold text-volt transition-colors hover:bg-volt hover:text-primary-foreground"
        >
          {adopted ? "View story" : "Send request"}
        </Link>
      </div>
    </article>
  );
}
