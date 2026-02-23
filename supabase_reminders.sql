-- ============================================
-- RANDEVU HATIRLATMA SİSTEMİ (DÜZELTME)
-- API bilgileri mevcut çalışan sistemle eşleştirildi
-- Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Eski flag'ları sıfırla (tekrar test için)
UPDATE appointments SET reminder_1day_sent = FALSE, reminder_2h_sent = FALSE;

CREATE OR REPLACE FUNCTION send_appointment_reminders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  msg TEXT;
  clean_phone TEXT;
  now_tr TIMESTAMP;
  tomorrow_date TEXT;
  today_date TEXT;
  sent_count INT := 0;
  found_count INT := 0;
  all_count INT := 0;
BEGIN
  now_tr := (NOW() AT TIME ZONE 'Europe/Istanbul');
  today_date := TO_CHAR(now_tr, 'YYYY-MM-DD');
  tomorrow_date := TO_CHAR(now_tr + INTERVAL '1 day', 'YYYY-MM-DD');

  SELECT COUNT(*) INTO all_count FROM appointments;

  -- ===== BUGÜN + YARIN HATIRLATMA =====
  FOR rec IN
    SELECT id, customer_name, customer_phone, service_title, specialist_name,
           appointment_time, start_time
    FROM appointments
    WHERE status IN ('approved', 'pending')
      AND reminder_1day_sent = FALSE
      AND start_time IS NOT NULL
      AND start_time != ''
      AND (LEFT(start_time, 10) = tomorrow_date OR LEFT(start_time, 10) = today_date)
  LOOP
    found_count := found_count + 1;

    clean_phone := regexp_replace(rec.customer_phone, '[^0-9]', '', 'g');
    IF clean_phone LIKE '0%' THEN
      clean_phone := '9' || clean_phone;
    ELSIF length(clean_phone) = 10 THEN
      clean_phone := '90' || clean_phone;
    END IF;

    IF LEFT(rec.start_time, 10) = today_date THEN
      msg := '⏰ *Randevu Hatırlatma*' || chr(10) || chr(10)
          || 'Merhaba ' || COALESCE(rec.customer_name, '') || ',' || chr(10)
          || '*Bugün* randevunuz bulunmaktadır.' || chr(10) || chr(10)
          || '💇 Hizmet: ' || COALESCE(rec.service_title, '-') || chr(10)
          || '👩 Uzman: ' || COALESCE(rec.specialist_name, '-') || chr(10)
          || '🕐 Saat: ' || COALESCE(rec.appointment_time, '-') || chr(10) || chr(10)
          || 'Güzellik Merkezi olarak sizi bekliyoruz! ✨';
    ELSE
      msg := '📅 *Randevu Hatırlatma*' || chr(10) || chr(10)
          || 'Merhaba ' || COALESCE(rec.customer_name, '') || ',' || chr(10)
          || '*Yarın* randevunuz bulunmaktadır.' || chr(10) || chr(10)
          || '💇 Hizmet: ' || COALESCE(rec.service_title, '-') || chr(10)
          || '👩 Uzman: ' || COALESCE(rec.specialist_name, '-') || chr(10)
          || '🕐 Saat: ' || COALESCE(rec.appointment_time, '-') || chr(10) || chr(10)
          || 'Güzellik Merkezi olarak sizi bekliyoruz! ✨';
    END IF;

    -- WhatsApp gönder (mevcut çalışan bildirimle AYNI ayarlar)
    PERFORM net.http_post(
      url := 'https://evolution.yusufsunmez.com/message/sendText/notlar',
      headers := '{"Content-Type": "application/json", "apikey": "0B140FBE9CC0-4F77-B104-CF082081AC3B"}'::jsonb,
      body := jsonb_build_object('number', clean_phone, 'text', msg)
    );

    UPDATE appointments SET reminder_1day_sent = TRUE WHERE id = rec.id;
    sent_count := sent_count + 1;
  END LOOP;

  -- ===== 2 SAAT ÖNCESİ HATIRLATMA =====
  FOR rec IN
    SELECT id, customer_name, customer_phone, service_title, specialist_name,
           appointment_time, start_time
    FROM appointments
    WHERE status IN ('approved', 'pending')
      AND reminder_2h_sent = FALSE
      AND start_time IS NOT NULL
      AND start_time != ''
      AND start_time::timestamp BETWEEN now_tr AND now_tr + INTERVAL '3 hours'
  LOOP
    clean_phone := regexp_replace(rec.customer_phone, '[^0-9]', '', 'g');
    IF clean_phone LIKE '0%' THEN
      clean_phone := '9' || clean_phone;
    ELSIF length(clean_phone) = 10 THEN
      clean_phone := '90' || clean_phone;
    END IF;

    msg := '⏰ *Randevu Hatırlatma*' || chr(10) || chr(10)
        || 'Merhaba ' || COALESCE(rec.customer_name, '') || ',' || chr(10)
        || 'Randevunuza az kaldı!' || chr(10) || chr(10)
        || '💇 Hizmet: ' || COALESCE(rec.service_title, '-') || chr(10)
        || '👩 Uzman: ' || COALESCE(rec.specialist_name, '-') || chr(10)
        || '🕐 Saat: ' || COALESCE(rec.appointment_time, '-') || chr(10) || chr(10)
        || 'Güzellik Merkezi olarak sizi bekliyoruz! ✨';

    PERFORM net.http_post(
      url := 'https://evolution.yusufsunmez.com/message/sendText/notlar',
      headers := '{"Content-Type": "application/json", "apikey": "0B140FBE9CC0-4F77-B104-CF082081AC3B"}'::jsonb,
      body := jsonb_build_object('number', clean_phone, 'text', msg)
    );

    UPDATE appointments SET reminder_2h_sent = TRUE WHERE id = rec.id;
    sent_count := sent_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'sent_count', sent_count,
    'found_count', found_count,
    'total_appointments', all_count,
    'today', today_date,
    'tomorrow', tomorrow_date
  );
END;
$$;
