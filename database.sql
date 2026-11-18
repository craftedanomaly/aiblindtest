begin;

create table if not exists public.public_model_test_campaigns (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  access_digest bytea not null check (octet_length(access_digest) = 32)
);
create table if not exists public.public_model_test_votes (
  campaign_id text not null references public.public_model_test_campaigns(id) on delete cascade,
  test_id text not null check (test_id ~ '^[0-9a-f]{24}$'),
  visitor_id uuid not null,
  choices jsonb not null check (jsonb_typeof(choices) = 'object' and choices <> '{}'::jsonb),
  created_at timestamptz not null default now(),
  primary key (campaign_id, test_id, visitor_id)
);
create index if not exists public_model_test_votes_visitor_idx
  on public.public_model_test_votes(campaign_id, visitor_id);

alter table public.public_model_test_campaigns enable row level security;
alter table public.public_model_test_votes enable row level security;
revoke all on public.public_model_test_campaigns, public.public_model_test_votes from public, anon, authenticated;
grant select, insert on public.public_model_test_campaigns to service_role;

create or replace function public.check_public_model_test_access(p_campaign text, p_access text)
returns void
language plpgsql stable set search_path = '' as $$
begin
  if length(p_access) is distinct from 64 or not exists (
    select 1 from public.public_model_test_campaigns
    where id = p_campaign and access_digest = sha256(convert_to(p_access, 'UTF8'))
  ) then
    raise exception 'PUBLIC_MODEL_TEST_ACCESS_DENIED' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.check_public_model_test_access(text, text) from public, anon, authenticated;

create or replace function public.record_public_model_test_vote(
  p_campaign text, p_access text, p_test text, p_visitor uuid, p_choices jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_public_model_test_access(p_campaign, p_access);
  if p_test is null or p_test !~ '^[0-9a-f]{24}$' or p_visitor is null
    or jsonb_typeof(p_choices) is distinct from 'object' or p_choices = '{}'::jsonb
    or exists (
      select 1 from jsonb_each(p_choices) as choice(id, value)
      where id !~ '^[0-9a-f]{24}$'
        or (jsonb_typeof(value->'model') = 'string' and length(value->>'model') between 1 and 150
          and jsonb_typeof(value->'stars') = 'number' and value->>'stars' ~ '^[1-5]$') is not true
    ) then
    raise exception 'PUBLIC_MODEL_TEST_INVALID_VOTE' using errcode = '22023';
  end if;
  insert into public.public_model_test_votes(campaign_id, test_id, visitor_id, choices)
  values (p_campaign, p_test, p_visitor, p_choices)
  on conflict (campaign_id, test_id, visitor_id) do nothing;
end;
$$;

create or replace function public.read_public_model_test_state(
  p_campaign text, p_access text, p_visitor uuid, p_test text default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  perform public.check_public_model_test_access(p_campaign, p_access);
  with campaign_votes as (
    select test_id, visitor_id, choices from public.public_model_test_votes where campaign_id = p_campaign
  ), ratings as (
    select visitor_id, value->>'model' as model, (value->>'stars')::integer as stars
    from campaign_votes cross join lateral jsonb_each(choices)
  ), totals as (
    select model, round(avg(stars), 4) as average, count(*) as votes, count(distinct visitor_id) as participants,
      grouping(visitor_id) as community
    from ratings
    group by grouping sets ((model), (model, visitor_id))
    having grouping(visitor_id) = 1 or visitor_id = p_visitor
  )
  select jsonb_build_object(
    'participants', (select count(distinct visitor_id) from campaign_votes),
    'community', coalesce((select jsonb_agg(to_jsonb(t) - 'community' order by average desc, votes desc, model) from totals t where community = 1), '[]'::jsonb),
    'personal', coalesce((select jsonb_agg(to_jsonb(t) - 'community' order by average desc, votes desc, model) from totals t where community = 0), '[]'::jsonb),
    'completed', coalesce((select jsonb_agg(test_id) from campaign_votes where visitor_id = p_visitor), '[]'::jsonb),
    'choices', (select choices from campaign_votes where visitor_id = p_visitor and test_id = p_test)
  ) into result;
  return result;
end;
$$;

revoke all on function public.record_public_model_test_vote(text, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.read_public_model_test_state(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_public_model_test_vote(text, text, text, uuid, jsonb) to anon;
grant execute on function public.read_public_model_test_state(text, text, uuid, text) to anon;

commit;
