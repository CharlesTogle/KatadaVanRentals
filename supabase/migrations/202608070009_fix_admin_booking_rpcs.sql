drop function if exists public.admin_start_trip(uuid, numeric, uuid, public.payment_channel, text, text);

create function public.admin_start_trip(
  target_booking_id uuid,
  collected_amount numeric,
  payment_method_id uuid default null,
  payment_channel public.payment_channel default 'cash',
  p_reference_number text default null,
  receipt_path text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_record public.bookings%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into booking_record from public.bookings where id = target_booking_id for update;
  if booking_record.id is null then raise exception 'Booking not found'; end if;
  if booking_record.status = 'on_trip' then return booking_record; end if;
  if booking_record.status <> 'confirmed' then raise exception 'Trip can only be started from confirmed status'; end if;
  if collected_amount < 0 or collected_amount > booking_record.remaining_amount then
    raise exception 'Collected amount exceeds the outstanding balance';
  end if;

  if collected_amount > 0 then
    insert into public.payments (booking_id, payment_method_id, channel, status, amount, reference_number, receipt_path, paid_at, submitted_by)
    values (target_booking_id, payment_method_id, payment_channel, 'submitted', collected_amount, p_reference_number, receipt_path, now(), auth.uid());
  end if;

  update public.bookings set status = 'on_trip', updated_at = now()
  where id = target_booking_id returning * into booking_record;
  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;
   update public.booking_status_events
   set note = format('Trip started. Submitted: %s', collected_amount)
   where id = (
     select id from public.booking_status_events
     where booking_id = target_booking_id
       and from_status = 'confirmed'
       and to_status = 'on_trip'
     order by created_at desc limit 1
   );
  return booking_record;
end;
$$;

grant execute on function public.admin_start_trip(uuid, numeric, uuid, public.payment_channel, text, text) to authenticated;

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
      actual_toll_amount = coalesce($7, booking_record.actual_toll_amount, 0),
      actual_fuel_amount = coalesce($8, booking_record.actual_fuel_amount, 0),
      price_line_items = final_line_items,
      total_amount = taxable_total + tax_amount
  where id = target_booking_id;
  perform public.recalculate_booking_financials(target_booking_id);
  select * into booking_record from public.bookings where id = target_booking_id;
   update public.booking_status_events
   set note = coalesce(note, 'Booking completed.')
   where id = (
     select id from public.booking_status_events
     where booking_id = target_booking_id
       and from_status = 'on_trip'
       and to_status = 'completed'
     order by created_at desc limit 1
   );
  return booking_record;
end;
$$;

grant execute on function public.admin_complete_booking(uuid, numeric, uuid, public.payment_channel, text, text, numeric, numeric, text) to authenticated;
