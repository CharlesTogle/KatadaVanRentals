create or replace function public.admin_adjust_booking_price(
  target_booking_id uuid,
  adjusted_total numeric,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status public.booking_status;
  current_total numeric;
  current_remaining numeric;
  next_status public.booking_status;
  was_manual boolean;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select status, total_amount, remaining_amount, coalesce(flagged_for_manual_pricing, false)
    into current_status, current_total, current_remaining, was_manual
  from public.bookings
  where id = target_booking_id;

  if current_status is null then
    raise exception 'Booking not found';
  end if;

  if current_status not in ('for_review', 'awaiting_documents', 'pending_price_approval') then
    raise exception 'Booking price cannot be adjusted from current status';
  end if;

  if was_manual then
    next_status := 'pending_price_approval'::public.booking_status;
  else
    next_status := case
      when adjusted_total > current_total then 'pending_price_approval'::public.booking_status
      else 'confirmed'::public.booking_status
    end;
  end if;

  update public.bookings
  set total_amount = adjusted_total,
      remaining_amount = case when was_manual then adjusted_total else greatest(current_remaining + (adjusted_total - current_total), 0) end,
      status = next_status,
      flagged_for_manual_pricing = false,
      in_service_area = true,
      subtotal_amount = adjusted_total,
      updated_at = now()
  where id = target_booking_id;

  insert into public.booking_status_events (booking_id, from_status, to_status, note, actor_id)
  values (target_booking_id, current_status, next_status, format('Price set to %s.%s Reason: %s', adjusted_total, case when was_manual then ' (manual pricing)' else '' end, reason), auth.uid());
end;
$$;

grant execute on function public.admin_adjust_booking_price(uuid, numeric, text) to authenticated;
