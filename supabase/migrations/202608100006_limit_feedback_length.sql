alter table public.booking_feedback
  add constraint booking_feedback_length_check
  check (feedback is null or char_length(feedback) <= 150) not valid;
