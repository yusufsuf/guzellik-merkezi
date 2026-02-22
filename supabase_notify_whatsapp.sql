-- ============================================
-- RANDEVU BİLDİRİM SİSTEMİ (WhatsApp)
-- Admin onayladığında veya reddettiğinde
-- müşteriye otomatik WhatsApp mesajı gider.
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Randevu bildirim fonksiyonu
CREATE OR REPLACE FUNCTION notify_appointment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_phone TEXT;
  msg TEXT;
BEGIN
  -- Sadece status değiştiğinde çalış
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Telefon numarasını temizle
    clean_phone := regexp_replace(NEW.customer_phone, '[^0-9]', '', 'g');
    IF clean_phone LIKE '0%' THEN
      clean_phone := '9' || clean_phone;
    END IF;

    -- Mesaj içeriği
    IF NEW.status = 'approved' THEN
      msg := '✅ Randevunuz Onaylandı!' || chr(10) || chr(10)
        || '💇 Güzellik Merkezi' || chr(10)
        || '📋 Hizmet: ' || COALESCE(NEW.service_title, '-') || chr(10)
        || '👩 Uzman: ' || COALESCE(NEW.specialist_name, '-') || chr(10)
        || '📅 Tarih: ' || COALESCE(NEW.appointment_time, '') || chr(10)
        || '🔑 Kod: ' || COALESCE(NEW.booking_code, '-') || chr(10) || chr(10)
        || 'Randevunuza zamanında gelmenizi rica ederiz. İyi günler! 💕';

    ELSIF NEW.status = 'rejected' THEN
      msg := '❌ Randevunuz Reddedildi' || chr(10) || chr(10)
        || '💇 Güzellik Merkezi' || chr(10)
        || '📋 Hizmet: ' || COALESCE(NEW.service_title, '-') || chr(10)
        || '🔑 Kod: ' || COALESCE(NEW.booking_code, '-') || chr(10) || chr(10)
        || 'Randevunuz maalesef reddedilmiştir. Farklı bir tarih veya saat için yeniden randevu oluşturabilirsiniz.';
    ELSE
      -- Diğer status değişikliklerinde mesaj gönderme
      RETURN NEW;
    END IF;

    -- WhatsApp mesajı gönder
    PERFORM net.http_post(
      url := 'https://evolution.yusufsunmez.com/message/sendText/notlar',
      headers := '{"Content-Type": "application/json", "apikey": "0B140FBE9CC0-4F77-B104-CF082081AC3B"}'::jsonb,
      body := jsonb_build_object(
        'number', clean_phone,
        'text', msg
      )
    );

  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: appointments tablosunda status güncellenince çalışır
DROP TRIGGER IF EXISTS trg_appointment_status_notify ON appointments;
CREATE TRIGGER trg_appointment_status_notify
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_status();
