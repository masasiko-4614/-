-- 南予釣行ナビ Supabase スキーマ
-- Supabase ダッシュボード > SQL Editor でこのファイルを実行してください。
-- 認証(Supabase Auth)を使う前提で、各テーブルは user_id で行レベルセキュリティを設定。

-- 釣り場(ユーザー追加分。サンプル釣り場はアプリ内蔵)
create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  area text not null default 'その他',
  lat double precision not null,
  lng double precision not null,
  fish text[] not null default '{}',
  best_seasons text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- お気に入り釣り場
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id text not null, -- 内蔵サンプル釣り場のID文字列にも対応するため text
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

-- 釣果記録
create table if not exists public.catch_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  spot_id text not null,
  spot_name text not null,
  start_time time not null,
  end_time time not null,
  species text not null,
  count integer not null default 1 check (count >= 0),
  size_cm numeric,
  lure text,
  lure_weight_g numeric,
  lure_color text,
  weather text,
  tide text check (tide in ('大潮','中潮','小潮','長潮','若潮')),
  wind text,
  photo_url text, -- Supabase Storage のURL(バケット: photos)
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists catch_records_user_date_idx
  on public.catch_records (user_id, date desc);

-- タックル
create table if not exists public.tackle_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('ロッド','リール','ライン','リーダー','ルアー')),
  name text not null,
  spec text,
  created_at timestamptz not null default now()
);

create table if not exists public.tackle_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  item_ids uuid[] not null default '{}',
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- 行レベルセキュリティ:本人のデータのみ読み書き可能
alter table public.spots enable row level security;
alter table public.favorites enable row level security;
alter table public.catch_records enable row level security;
alter table public.tackle_items enable row level security;
alter table public.tackle_sets enable row level security;

do $$
declare t text;
begin
  foreach t in array array['spots','favorites','catch_records','tackle_items','tackle_sets'] loop
    execute format(
      'create policy "own rows select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows update" on public.%I for update using (auth.uid() = user_id)', t);
    execute format(
      'create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- 写真用ストレージバケット(任意)
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', false);
