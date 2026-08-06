create or replace function public.admin_set_manual_price(
  target_booking_id uuid,
  price numeric,
  reason text default 'Manual pricing set'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
  vat_percent numeric(5,2);
  vat_amount numeric(12,2);
  final_price numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if price <= 0 then
    raise exception 'Manual price must be greater than zero';
  end if;

  select status into current_status
  from public.bookings
  where id = target_booking_id;

  if current_status is null then
    raise exception 'Booking not found';
  end if;

  if current_status not in ('for_review', 'awaiting_documents') then
    raise exception 'Manual price can only be set on for_review or awaiting_documents bookings';
  end if;

  select coalesce(s.vat_percent, 0)
    into vat_percent
  from public.app_settings s
  where s.id = true;

  vat_amount := round(price * greatest(vat_percent, 0) / 100, 2);
  final_price := price + vat_amount;

  update public.bookings
  set total_amount = final_price,
      subtotal_amount = price,
      remaining_amount = final_price,
      deposit_amount = 0,
      delivery_fee = 0,
      recovery_fee = 0,
      fuel_estimate_amount = 0,
      fuel_estimate_liters = 0,
      toll_estimate_amount = 0,
      flagged_for_manual_pricing = false,
      price_line_items = jsonb_build_array(
        jsonb_build_object('label', 'Base', 'detail', 'Manual pricing', 'amount', price)
      ) || case when vat_amount > 0 then jsonb_build_array(
        jsonb_build_object('label', 'VAT', 'detail', vat_percent || '%', 'amount', vat_amount)
      ) else '[]'::jsonb end,
      status = 'pending_price_approval',
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, 'pending_price_approval', format('Manual price set to %s including VAT. Reason: %s', final_price, reason), auth.uid());
end;
$$;

grant execute on function public.admin_set_manual_price(uuid, numeric, text) to authenticated;
