begin;

-- Existing rows were explicitly submitted before autosave was introduced.
alter table public.public_model_test_votes add column if not exists finalized boolean not null default true;

create or replace function public.save_public_model_test_ratings(
  p_campaign text, p_access text, p_test text, p_visitor uuid, p_choices jsonb, p_finalize boolean
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_public_model_test_access(p_campaign, p_access);
  if p_finalize is null or p_test is null or p_test !~ '^[0-9a-f]{24}$' or p_visitor is null
    or jsonb_typeof(p_choices) is distinct from 'object' or p_choices = '{}'::jsonb
    or exists (
      select 1 from jsonb_each(p_choices) as choice(id, value)
      where id !~ '^[0-9a-f]{24}$'
        or (value ? 'revision' and (jsonb_typeof(value->'revision') = 'number'
          and value->>'revision' ~ '^[0-9]{1,16}$') is not true)
        or (jsonb_typeof(value->'model') = 'string' and length(value->>'model') between 1 and 150
          and jsonb_typeof(value->'stars') = 'number' and value->>'stars' ~ '^[1-5]$') is not true
    ) then
    raise exception 'PUBLIC_MODEL_TEST_INVALID_VOTE' using errcode = '22023';
  end if;
  insert into public.public_model_test_votes as prior (campaign_id, test_id, visitor_id, choices, finalized)
  values (p_campaign, p_test, p_visitor, p_choices, p_finalize)
  on conflict (campaign_id, test_id, visitor_id) do update set
    choices = prior.choices || coalesce((
      select jsonb_object_agg(k, v) from jsonb_each(excluded.choices) as incoming(k, v)
      where not prior.choices ? k
        or coalesce((v->>'revision')::bigint, 0) > coalesce((prior.choices->k->>'revision')::bigint, 0)
    ), '{}'::jsonb),
    finalized = excluded.finalized
  where not prior.finalized;
end;
$$;

-- Keep the finish endpoint compatible with clients already running during rollout.
create or replace function public.record_public_model_test_vote(
  p_campaign text, p_access text, p_test text, p_visitor uuid, p_choices jsonb
) returns void
language sql security definer set search_path = '' as $$
  select public.save_public_model_test_ratings(p_campaign, p_access, p_test, p_visitor, p_choices, true);
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
    select test_id, visitor_id, choices, finalized from public.public_model_test_votes where campaign_id = p_campaign
  ), ratings as (
    select visitor_id, finalized, value->>'model' as model, (value->>'stars')::integer as stars
    from campaign_votes cross join lateral jsonb_each(choices)
  ), totals as (
    select model, round(avg(stars), 4) as average, count(*) as votes, count(distinct visitor_id) as participants,
      1 as community from ratings group by model
    union all
    select model, round(avg(stars), 4), count(*), 1, 0
    from ratings where finalized and visitor_id = p_visitor group by model
  )
  select jsonb_build_object(
    'participants', (select count(distinct visitor_id) from campaign_votes),
    'community', coalesce((select jsonb_agg(to_jsonb(t) - 'community' order by average desc, votes desc, model) from totals t where community = 1), '[]'::jsonb),
    'personal', coalesce((select jsonb_agg(to_jsonb(t) - 'community' order by average desc, votes desc, model) from totals t where community = 0), '[]'::jsonb),
    'completed', coalesce((select jsonb_agg(test_id) from campaign_votes where visitor_id = p_visitor and finalized), '[]'::jsonb),
    'inProgress', coalesce((select jsonb_agg(test_id) from campaign_votes where visitor_id = p_visitor and not finalized), '[]'::jsonb),
    'draft', (select jsonb_object_agg(k, v - 'model') from campaign_votes cross join lateral jsonb_each(choices) as rating(k,v)
      where visitor_id = p_visitor and test_id = p_test and not finalized),
    'choices', (select choices from campaign_votes where visitor_id = p_visitor and test_id = p_test and finalized)
  ) into result;
  return result;
end;
$$;

revoke all on function public.save_public_model_test_ratings(text, text, text, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.save_public_model_test_ratings(text, text, text, uuid, jsonb, boolean) to anon;
revoke all on function public.record_public_model_test_vote(text, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.read_public_model_test_state(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_public_model_test_vote(text, text, text, uuid, jsonb) to anon;
grant execute on function public.read_public_model_test_state(text, text, uuid, text) to anon;

notify pgrst, 'reload schema';
commit;
