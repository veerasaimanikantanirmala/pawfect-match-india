import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Pet = Tables<"pets">;
export const SPECIES = [
  { id: "all", label: "All" },
  { id: "dog", label: "Dogs" },
  { id: "cat", label: "Cats" },
  { id: "rabbit", label: "Rabbits" },
  { id: "bird", label: "Birds" },
] as const;

export const speciesLabel = (p: Pet) => (p.species === "dog" && p.breed.toLowerCase().includes("indie") ? "Desi Dog" : p.breed || p.species);

export const petsQuery = () =>
  queryOptions({
    queryKey: ["pets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export const petQuery = (id: string) =>
  queryOptions({
    queryKey: ["pet", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
