-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase

-- 1. Tabla de Servicios
create table if not exists servicios (
    id serial primary key,
    nombre text not null,
    descripcion text,
    precio numeric,
    icono text,
    orden int default 0
);

-- 2. Tabla de Pedidos
create table if not exists pedidos (
    id serial primary key,
    cliente text not null,
    telefono text not null,
    servicio text not null,
    detalles text,
    fecha_entrega date,
    estado text default 'Pendiente',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Habilitar RLS (Row Level Security)
alter table servicios enable row level security;
alter table pedidos enable row level security;

-- 4. Políticas de Seguridad (RLS)
-- Permitir lectura pública de servicios
create policy "Permitir lectura publica de servicios" 
on servicios for select 
using (true);

-- Permitir inserción pública de pedidos (para que los clientes hagan pedidos desde la web)
create policy "Permitir insercion publica de pedidos" 
on pedidos for insert 
with check (true);

-- Permitir lectura y modificación completa de pedidos solo a usuarios autenticados (admin)
create policy "Permitir gestion de pedidos a admin autenticado" 
on pedidos for all 
using (auth.role() = 'authenticated');
alter table public.servicios enable row level security;

drop policy if exists "servicios_lectura_publica" on public.servicios;
create policy "servicios_lectura_publica" on public.servicios
  for select to anon, authenticated using (true);

alter table public.servicios add column if not exists precio numeric;

insert into public.servicios (nombre, icono, descripcion, orden)
select * from (values
  ('Decoración con globos', '🎈', 'Arcos, columnas y ambientes llenos de color para tu fiesta.', 1),
  ('Globos con helio', '🎉', 'Globos flotantes, bouquets y globos con mensaje, nombre o número para sorprender.', 2),
  ('Cajas sorpresa', '🎁', 'Cajas personalizadas con detalles, mensajes y regalos.', 3),
  ('Desayunos sorpresa', '🥐', 'Desayunos decorados para sorprender a esa persona especial.', 4),
  ('Regalos personalizados', '💝', 'Detalles hechos a mano según la ocasión y los gustos.', 5),
  ('Picaderas', '🧀', 'Tablas y bandejas para compartir, con presentación cuidada.', 6),
  ('Decoración de eventos', '✨', 'Ambientación completa para celebraciones familiares y empresariales.', 7)
) as v(nombre, icono, descripcion, orden)
where not exists (select 1 from public.servicios);