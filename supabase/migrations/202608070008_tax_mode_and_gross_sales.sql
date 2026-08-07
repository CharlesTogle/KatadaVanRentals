alter table public.app_settings
  add column if not exists tax_mode text not null default 'percentage_tax'
  check (tax_mode in ('unregistered', 'percentage_tax', 'vat'));

update public.app_settings
set tax_mode = case
  when vat_percent >= 10 then 'vat'
  when vat_percent > 0 then 'percentage_tax'
  else 'unregistered'
end;

create or replace view public.annual_gross_sales as
select date_trunc('year', completed_at) as tax_year,
       sum(total_amount - coalesce((
         select sum((item->>'amount')::numeric)
         from jsonb_array_elements(coalesce(price_line_items, '[]'::jsonb)) item
         where item->>'label' ilike '%vat%'
            or item->>'label' ilike '%tax%'
       ), 0)) as gross_sales
from public.bookings
where status = 'completed'
  and completed_at is not null
group by 1;

create or replace function public.admin_set_manual_price(
  target_booking_id uuid,
  price numeric,
  reason text default 'Manual pricing set'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  previous_status public.booking_status;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if price <= 0 then raise exception 'Manual price must be greater than zero'; end if;

  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status not in ('for_review', 'awaiting_documents') then
    raise exception 'Manual price can only be set on for_review or awaiting_documents bookings';
  end if;
  if booking_record.total_amount = price and not coalesce(booking_record.flagged_for_manual_pricing, false) then
    return booking_record;
  end if;

  previous_status := booking_record.status;
  update public.bookings
  set total_amount = price,
      subtotal_amount = price,
      remaining_amount = price,
      deposit_amount = 0,
      delivery_fee = 0,
      recovery_fee = 0,
      fuel_estimate_amount = 0,
      fuel_estimate_liters = 0,
      toll_estimate_amount = 0,
      flagged_for_manual_pricing = false,
      price_line_items = jsonb_build_array(jsonb_build_object('label', 'Base', 'detail', 'Manual pricing (pre-tax)', 'amount', price)),
      status = 'pending_price_approval',
      updated_at = now()
  where id = target_booking_id
  returning * into booking_record;

  perform public.recalculate_booking_financials(target_booking_id);
  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, previous_status, 'pending_price_approval', format('Manual pre-tax price set to %s. Reason: %s', price, reason), auth.uid());
  select * into booking_record from public.bookings where id = target_booking_id;
  return booking_record;
end;
$$;

create or replace function public.admin_complete_booking(
  target_booking_id uuid,
  collected_amount numeric default 0,
  payment_method_id uuid default null,
  payment_channel public.payment_channel default 'cash',
  reference_number text default null,
  receipt_path text default null,
  actual_toll_amount numeric default null,
  actual_fuel_amount numeric default null,
  note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
  reconciliation_delta numeric(12,2) := 0;
  existing_tax_amount numeric(12,2) := 0;
  taxable_total numeric(12,2);
  tax_rate numeric(5,2);
  tax_label text;
  tax_detail text;
  tax_amount numeric(12,2);
  final_line_items jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status = 'completed' then return booking_record; end if;
  if booking_record.status <> 'on_trip' then raise exception 'Booking can only be completed from on_trip status'; end if;

  if booking_record.rental_model = 'all_in' then
    if actual_toll_amount is null or actual_fuel_amount is null then
      raise exception 'Actual toll and fuel are required for all-in bookings';
    end if;
    reconciliation_delta := actual_toll_amount + actual_fuel_amount;
  end if;

  select coalesce(sum((item->>'amount')::numeric), 0)
  into existing_tax_amount
  from jsonb_array_elements(coalesce(booking_record.price_line_items, '[]'::jsonb)) item
  where item->>'label' ilike '%vat%' or item->>'label' ilike '%tax%';

  select case s.tax_mode when 'vat' then 12 when 'percentage_tax' then 3 else 0 end,
         case s.tax_mode when 'vat' then 'VAT' when 'percentage_tax' then 'Percentage Tax' else null end
  into tax_rate, tax_label
  from public.app_settings s
  where s.id = true;
  tax_rate := coalesce(tax_rate, 0);
  tax_detail := case when tax_label is null then null else tax_label || ' ' || tax_rate || '%' end;
  taxable_total := greatest(booking_record.total_amount - existing_tax_amount, 0) + reconciliation_delta;
  tax_amount := round(taxable_total * tax_rate / 100, 2);

  select coalesce(jsonb_agg(item order by ordinality), '[]'::jsonb)
  into final_line_items
  from jsonb_array_elements(coalesce(booking_record.price_line_items, '[]'::jsonb)) with ordinality as entries(item, ordinality)
  where item->>'label' not ilike '%vat%' and item->>'label' not ilike '%tax%';
  if tax_amount > 0 then
    final_line_items := final_line_items || jsonb_build_array(jsonb_build_object('label', tax_label, 'detail', tax_detail, 'amount', tax_amount));
  end if;

  if collected_amount < 0 or collected_amount > booking_record.remaining_amount + reconciliation_delta + tax_amount then
    raise exception 'Collected amount exceeds the outstanding balance';
  end if;
  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'submitted', collected_amount, reference_number, receipt_path, now(), auth.uid());
  end if;

  update public.bookings
  set status = 'completed', completed_at = now(), updated_at = now(),
      actual_toll_amount = coalesce(actual_toll_amount, booking_record.actual_toll_amount, 0),
      actual_fuel_amount = coalesce(actual_fuel_amount, booking_record.actual_fuel_amount, 0),
      price_line_items = final_line_items,
      total_amount = taxable_total + tax_amount
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;
  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, 'on_trip', 'completed', coalesce(note, 'Booking completed.'), auth.uid());
  return booking_record;
end;
$$;

grant execute on function public.admin_set_manual_price(uuid, numeric, text) to authenticated;
grant execute on function public.admin_complete_booking(uuid, numeric, uuid, public.payment_channel, text, text, numeric, numeric, text) to authenticated;

alter table public.app_settings drop column vat_percent;
