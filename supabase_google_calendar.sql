-- ============================================
-- GOOGLE CALENDAR ENTEGRASYONU
-- Randevu onaylandığında uzmanın Google Calendar'ına ekler
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- 1) Specialists tablosuna calendar_id sütunu ekle (yoksa)
ALTER TABLE specialists ADD COLUMN IF NOT EXISTS calendar_id TEXT DEFAULT '';

-- 2) Google Apps Script webhook URL'sini admin_settings'e kaydet
-- Bu URL'yi Apps Script dağıtımından alacaksınız
INSERT INTO admin_settings (key, value)
VALUES ('google_calendar_webhook', '')
ON CONFLICT (key) DO NOTHING;

-- 3) Google Calendar sync fonksiyonu
CREATE OR REPLACE FUNCTION sync_to_google_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url TEXT;
  spec_calendar_id TEXT;
  action_type TEXT;
BEGIN
  -- Webhook URL'sini al
  SELECT value INTO webhook_url FROM admin_settings WHERE key = 'google_calendar_webhook';
  
  -- URL yoksa veya boşsa çık
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- Uzmanın calendar_id'sini al
  IF NEW.specialist_id IS NOT NULL THEN
    SELECT calendar_id INTO spec_calendar_id FROM specialists WHERE id = NEW.specialist_id;
  END IF;
  
  -- Calendar ID yoksa çık
  IF spec_calendar_id IS NULL OR spec_calendar_id = '' THEN
    RETURN NEW;
  END IF;

  -- INSERT: Yeni randevu (approved ise ekle)
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
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
        'title', COALESCE(NEW.service_title, 'Randevu'),
        'start_time', NEW.start_time,
        'duration', COALESCE(NEW.duration, 30),
        'customer_name', COALESCE(NEW.customer_name, ''),
        'customer_phone', COALESCE(NEW.customer_phone, ''),
        'service_title', COALESCE(NEW.service_title, ''),
        'specialist_name', COALESCE(NEW.specialist_name, ''),
        'booking_code', COALESCE(NEW.booking_code, '')
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Trigger oluştur
DROP TRIGGER IF EXISTS trg_google_calendar_sync ON appointments;

CREATE TRIGGER trg_google_calendar_sync
  AFTER INSERT OR UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION sync_to_google_calendar();
