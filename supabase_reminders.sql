-- ============================================
-- RANDEVU HATIRLATMA SİSTEMİ
-- WhatsApp ile otomatik hatırlatma gönderir
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- 1) Hatırlatma takibi için sütunlar ekle
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_1day_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT FALSE;

-- 2) Hatırlatma gönderen fonksiyon
CREATE OR REPLACE FUNCTION send_appointment_reminders()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  msg TEXT;
  clean_phone TEXT;
  api_url TEXT;
  api_key TEXT;
  instance_name TEXT;
  now_tr TIMESTAMPTZ;
  sent_count INT := 0;
  response_status INT;
BEGIN
  -- Türkiye saati
  now_tr := NOW() AT TIME ZONE 'Europe/Istanbul';

  -- Evolution API bilgileri
  api_url := current_setting('app.settings.evolution_api_url', true);
  api_key := current_setting('app.settings.evolution_api_key', true);
  instance_name := current_setting('app.settings.evolution_instance', true);

  IF api_url IS NULL THEN
    api_url := 'https://evolution.yusufsunmez.com';
  END IF;
  IF api_key IS NULL THEN
    api_key := 'B4F652CE0638-4C01-A0AA-11C034BFEC16';
  END IF;
  IF instance_name IS NULL THEN
    instance_name := 'guzellikmerkezi';
  END IF;

  -- ===== 1 GÜN ÖNCESİ HATIRLATMA =====
  -- Yarın olan randevular (şimdiden 20-28 saat sonrası)
  FOR rec IN
    SELECT id, customer_name, customer_phone, service_title, specialist_name,
           appointment_time, start_time
    FROM appointments
    WHERE status = 'approved'
      AND reminder_1day_sent = FALSE
      AND start_time IS NOT NULL
      AND (start_time AT TIME ZONE 'Europe/Istanbul')::date = (now_tr + INTERVAL '1 day')::date
  LOOP
    -- Telefon numarasını temizle
    clean_phone := regexp_replace(rec.customer_phone, '[^0-9]', '', 'g');
    IF LEFT(clean_phone, 1) = '0' THEN
      clean_phone := '90' || SUBSTRING(clean_phone FROM 2);
    END IF;
    IF LEFT(clean_phone, 2) != '90' THEN
      clean_phone := '90' || clean_phone;
    END IF;

    -- Mesaj oluştur
    msg := '📅 *Randevu Hatırlatma*' || chr(10) || chr(10)
        || 'Merhaba ' || COALESCE(rec.customer_name, '') || ',' || chr(10)
        || '*Yarın* randevunuz bulunmaktadır.' || chr(10) || chr(10)
        || '💇 Hizmet: ' || COALESCE(rec.service_title, '-') || chr(10)
        || '👩 Uzman: ' || COALESCE(rec.specialist_name, '-') || chr(10)
        || '🕐 Saat: ' || COALESCE(rec.appointment_time, '-') || chr(10) || chr(10)
        || 'Güzellik Merkezi olarak sizi bekliyoruz! ✨';

    -- WhatsApp gönder
    BEGIN
      SELECT status INTO response_status FROM net.http_post(
        url := api_url || '/message/sendText/' || instance_name,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', api_key
        ),
        body := jsonb_build_object(
          'number', clean_phone,
          'text', msg
        )
      );

      -- Gönderildi olarak işaretle
      UPDATE appointments SET reminder_1day_sent = TRUE WHERE id = rec.id;
      sent_count := sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Hata olursa devam et
      NULL;
    END;
  END LOOP;

  -- ===== 2 SAAT ÖNCESİ HATIRLATMA =====
  -- 2 saat içinde olan randevular
  FOR rec IN
    SELECT id, customer_name, customer_phone, service_title, specialist_name,
           appointment_time, start_time
    FROM appointments
    WHERE status = 'approved'
      AND reminder_2h_sent = FALSE
      AND start_time IS NOT NULL
      AND (start_time AT TIME ZONE 'Europe/Istanbul') BETWEEN now_tr + INTERVAL '1 hour 30 minutes' AND now_tr + INTERVAL '2 hours 30 minutes'
  LOOP
    clean_phone := regexp_replace(rec.customer_phone, '[^0-9]', '', 'g');
    IF LEFT(clean_phone, 1) = '0' THEN
      clean_phone := '90' || SUBSTRING(clean_phone FROM 2);
    END IF;
    IF LEFT(clean_phone, 2) != '90' THEN
      clean_phone := '90' || clean_phone;
    END IF;

    msg := '⏰ *Randevu Hatırlatma*' || chr(10) || chr(10)
        || 'Merhaba ' || COALESCE(rec.customer_name, '') || ',' || chr(10)
        || 'Randevunuza *2 saat* kaldı!' || chr(10) || chr(10)
        || '💇 Hizmet: ' || COALESCE(rec.service_title, '-') || chr(10)
        || '👩 Uzman: ' || COALESCE(rec.specialist_name, '-') || chr(10)
        || '🕐 Saat: ' || COALESCE(rec.appointment_time, '-') || chr(10) || chr(10)
        || 'Güzellik Merkezi olarak sizi bekliyoruz! ✨';

    BEGIN
      SELECT status INTO response_status FROM net.http_post(
        url := api_url || '/message/sendText/' || instance_name,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', api_key
        ),
        body := jsonb_build_object(
          'number', clean_phone,
          'text', msg
        )
      );

      UPDATE appointments SET reminder_2h_sent = TRUE WHERE id = rec.id;
      sent_count := sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'sent_count', sent_count,
    'checked_at', now_tr::text
  );
END;
$$;

-- 3) pg_cron ile otomatik çalıştırma (her 30 dakikada)
-- NOT: pg_cron'u Supabase Dashboard > Database > Extensions'dan aktifleştirmeniz gerekir!

-- pg_cron aktifleştirildikten sonra bu satırı çalıştırın:
-- SELECT cron.schedule('appointment-reminders', '*/30 * * * *', 'SELECT send_appointment_reminders()');

-- Eğer pg_cron aktif DEĞİLSE, alternatif olarak bu fonksiyonu dışarıdan çağırabilirsiniz:
-- SELECT send_appointment_reminders();

-- ============================================
-- TEST: Fonksiyonu manuel çalıştırmak için:
-- SELECT send_appointment_reminders();
-- ============================================
