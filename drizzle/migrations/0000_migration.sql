create type public.app_role as enum ('shelter','adopter');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.profiles (
  id uuid primary key,
  display_name text not null default '',
  city text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','adopter');
begin
  if r not in ('shelter','adopter') then r := 'adopter'; end if;
  insert into public.profiles (id, display_name, city)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), coalesce(new.raw_user_meta_data->>'city',''));
  insert into public.user_roles (user_id, role) values (new.id, r::public.app_role);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid,
  shelter_name text not null default '',
  name text not null,
  species text not null check (species in ('dog','cat','rabbit','bird')),
  breed text not null default '',
  age_label text not null default '',
  gender text not null default '',
  city text not null default '',
  apartment_ok boolean not null default false,
  kids_ok boolean not null default false,
  vaccinated boolean not null default false,
  temperament text not null default '',
  description text not null default '',
  photo_url text not null default '',
  status text not null default 'available' check (status in ('available','adopted')),
  created_at timestamptz not null default now()
);
grant select on public.pets to anon;
grant select, insert, update, delete on public.pets to authenticated;
grant all on public.pets to service_role;
alter table public.pets enable row level security;
create policy "pets public read" on public.pets for select to anon, authenticated using (true);
create policy "shelters insert pets" on public.pets for insert to authenticated with check (auth.uid() = shelter_id and public.has_role(auth.uid(),'shelter'));
create policy "shelters update own pets" on public.pets for update to authenticated using (auth.uid() = shelter_id);
create policy "shelters delete own pets" on public.pets for delete to authenticated using (auth.uid() = shelter_id);

create table public.adoption_requests (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  adopter_id uuid not null,
  shelter_id uuid,
  adopter_name text not null,
  phone text not null,
  city text not null,
  home_type text not null default '',
  message text not null,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.adoption_requests to authenticated;
grant all on public.adoption_requests to service_role;
alter table public.adoption_requests enable row level security;
create policy "adopter reads own" on public.adoption_requests for select to authenticated using (auth.uid() = adopter_id or auth.uid() = shelter_id);
create policy "adopter creates" on public.adoption_requests for insert to authenticated with check (auth.uid() = adopter_id);
create policy "shelter updates" on public.adoption_requests for update to authenticated using (auth.uid() = shelter_id);

create or replace function public.set_request_shelter()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  select shelter_id into new.shelter_id from public.pets where id = new.pet_id;
  new.status := 'pending';
  return new;
end; $$;
create trigger adoption_request_shelter before insert on public.adoption_requests for each row execute function public.set_request_shelter();

create or replace function public.mark_adopted()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.pets set status = 'adopted' where id = new.pet_id;
  end if;
  return new;
end; $$;
create trigger adoption_request_approved after update on public.adoption_requests for each row execute function public.mark_adopted();

insert into public.pets (shelter_name, name, species, breed, age_label, gender, city, apartment_ok, kids_ok, vaccinated, temperament, description, photo_url) values
('Bengaluru Indie Rescue','Copper','dog','Indie (Desi)','2 yrs','Male','Bengaluru',true,true,true,'Friendly','Hardy, low-maintenance and loyal. Handles Indian summers easily and loves evening walks.','/pets/copper.jpg'),
('Paws & Co Pune','Meenu','cat','Indian domestic','1 yr','Female','Pune',true,true,true,'Calm','Litter trained, spayed and happiest on a sunny windowsill. Great for flats.','/pets/meenu.jpg'),
('Delhi Rescue Collective','Simba','dog','Labrador','6 mos','Male','Delhi',false,true,true,'Active','Playful puppy who adores kids. Needs daily exercise and some space.','/pets/simba.jpg'),
('Hyderabad Hearts','Bholu','dog','Beagle','3 yrs','Male','Hyderabad',true,true,true,'Gentle','House trained and gentle with other dogs. Loves a cosy living room.','/pets/bholu.jpg'),
('Jaipur Small Paws','Chiku','rabbit','Rabbit','6 mos','Female','Jaipur',true,true,false,'Quiet','Quiet and gentle. Perfect for apartments and calm households.','/pets/chiku.jpg'),
('Mumbai Wings Shelter','Mithu','bird','Budgerigar','1 yr','Male','Mumbai',true,true,false,'Hand tamed','Cheerful hand-tamed budgie who whistles in the mornings.','/pets/mithu.jpg');