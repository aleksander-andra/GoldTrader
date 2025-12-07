-- purpose: add unique index for asset_events upsert on (asset, source_url)
-- affects: public.asset_events
-- notes: required for ON CONFLICT (asset, source_url) in newsRefreshService

begin;

create unique index if not exists idx_asset_events_asset_source_url_unique
  on public.asset_events (asset, source_url);

commit;


