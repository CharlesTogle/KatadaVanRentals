UPDATE profiles
SET mobile = '+63' || regexp_replace(regexp_replace(regexp_replace(mobile, '\D', '', 'g'), '^63', ''), '^0', '')
WHERE mobile IS NOT NULL;

UPDATE bookings
SET guest_mobile = '+63' || regexp_replace(regexp_replace(regexp_replace(guest_mobile, '\D', '', 'g'), '^63', ''), '^0', '')
WHERE guest_mobile IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.contact_inquiries') IS NOT NULL THEN
    UPDATE contact_inquiries
    SET phone = '+63' || regexp_replace(regexp_replace(regexp_replace(phone, '\D', '', 'g'), '^63', ''), '^0', '')
    WHERE phone IS NOT NULL;
  END IF;
END $$;

UPDATE app_settings
SET support_phone = '+63' || regexp_replace(regexp_replace(regexp_replace(support_phone, '\D', '', 'g'), '^63', ''), '^0', '')
WHERE support_phone IS NOT NULL;
