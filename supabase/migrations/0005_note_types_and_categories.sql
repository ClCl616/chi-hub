alter table public.notes add column if not exists content_type text not null default 'markdown' check(content_type in ('markdown','drawing','sticky'));
alter table public.notes add column if not exists category text not null default '개인';
alter table public.notes add column if not exists drawing_data text;
