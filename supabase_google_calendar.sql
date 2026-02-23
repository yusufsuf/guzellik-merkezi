-- ============================================
-- GOOGLE CALENDAR ENTEGRASYONU v2
-- Randevu onay/red/silme işlemlerinde Google Calendar'ı günceller
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- 1) Specialists tablosuna calendar_id sütunu ekle (yoksa)
ALTER TABLE specialists ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT '';

-- 2) Google Apps Script webhook URL'sini admin_settings'e kaydet
INSERT INTO admin_settings (key, value)
VALUES ('google_calendar_webhook', '')
ON CONFLICT (key) DO NOTHING;

-- 3) Google Calendar sync fonksiyonu (DELETE desteği ile)
CREATE OR REPLACE FUNCTION sync_to_google_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url TEXT;
  spec_calendar_id TEXT;
  action_type TEXT;
  rec RECORD;
BEGIN
  -- Webhook URL'sini al
  SELECT value INTO webhook_url FROM admin_settings WHERE key = 'google_calendar_webhook';
  
  -- URL yoksa veya boşsa çık
  IF webhook_url IS NULL OR webhook_url = '' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- DELETE işleminde OLD kullan, diğerlerinde NEW kullan
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  -- Uzmanın calendar_id'sini al
  IF rec.specialist_id IS NOT NULL THEN
    SELECT calendar_id INTO spec_calendar_id FROM specialists WHERE id = rec.specialist_id;
  END IF;
  
  -- Calendar ID yoksa çık
  IF spec_calendar_id IS NULL OR spec_calendar_id = '' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- DELETE: Randevu silindi → takvimden sil
  IF TG_OP = 'DELETE' THEN
    action_type := 'delete';

  -- INSERT: Yeni randevu (approved ise ekle)
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    action_type := 'create';
  
  -- UPDATE: Status değişikliği
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      action_type := 'create';
    ELSIF NEW.status = 'rejected' THEN
      action_type := 'delete';
    END IF;
  END IF;

  -- Aksiyon varsa webhook'u çağır
  IF action_type IS NOT NULL THEN
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'action', action_type,
        'calendar_id', spec_calendar_id,
        'title', COALESCE(rec.service_title, 'Randevu'),
        'start_time', rec.start_time,
        'duration', COALESCE(rec.duration, 30),
        'customer_name', COALESCE(rec.customer_name, ''),
        'customer_phone', COALESCE(rec.customer_phone, ''),
        'service_title', COALESCE(rec.service_title, ''),
        'specialist_name', COALESCE(rec.specialist_name, ''),
        'booking_code', COALESCE(rec.booking_code, '')
      )
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- 4) Trigger oluştur (DELETE desteği eklendi)
DROP TRIGGER IF EXISTS trg_google_calendar_sync ON appointments;

CREATE TRIGGER trg_google_calendar_sync
  AFTER INSERT OR UPDATE OF status OR DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_google_calendar();
