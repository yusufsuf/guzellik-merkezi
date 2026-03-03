-- ============================================
-- RANDEVU BİLDİRİM SİSTEMİ v4 (WhatsApp)
-- Tarih bilgisi eklendi
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Eski trigger'ları temizle
DROP TRIGGER IF EXISTS trg_appointment_status_notify ON appointments;
DROP TRIGGER IF EXISTS trg_appointment_insert_notify ON appointments;

-- Bildirim fonksiyonu (INSERT + UPDATE + Admin bildirim + TARİH)
CREATE OR REPLACE FUNCTION notify_appointment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_phone TEXT;
  admin_phone TEXT;
  msg TEXT;
  admin_msg TEXT;
  should_send BOOLEAN := false;
  should_notify_admin BOOLEAN := false;
  tarih_str TEXT;
BEGIN
  -- Müşteri telefon numarasını temizle
  clean_phone := regexp_replace(NEW.customer_phone, '[^0-9]', '', 'g');
  IF clean_phone LIKE '0%' THEN
    clean_phone := '9' || clean_phone;
  ELSIF length(clean_phone) = 10 THEN
    clean_phone := '90' || clean_phone;
  END IF;

  -- Admin telefon numarasını al
  SELECT value INTO admin_phone FROM admin_settings WHERE key = 'admin_phone';
  IF admin_phone IS NOT NULL THEN
    admin_phone := regexp_replace(admin_phone, '[^0-9]', '', 'g');
    IF admin_phone LIKE '0%' THEN
      admin_phone := '9' || admin_phone;
    ELSIF length(admin_phone) = 10 THEN
      admin_phone := '90' || admin_phone;
    END IF;
  END IF;

  -- Tarih bilgisini oluştur (start_time: "2026-03-05T14:00:00")
  tarih_str := '-';
  IF NEW.start_time IS NOT NULL AND NEW.start_time != '' THEN
    tarih_str := SUBSTRING(NEW.start_time FROM 9 FOR 2) || '/'
              || SUBSTRING(NEW.start_time FROM 6 FOR 2) || '/'
              || SUBSTRING(NEW.start_time FROM 1 FOR 4);
  END IF;

  -- INSERT: Yeni randevu oluşturulduğunda
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' THEN
      msg := '✅ Randevunuz Onaylanmıştır!' || chr(10) || chr(10)
        || '💇 Güzellik Merkezi' || chr(10)
        || '📋 Hizmet: ' || COALESCE(NEW.service_title, '-') || chr(10)
        || '👩 Uzman: ' || COALESCE(NEW.specialist_name, '-') || chr(10)
        || '📅 Tarih: ' || tarih_str || chr(10)
        || '🕐 Saat: ' || COALESCE(NEW.appointment_time, '-') || chr(10)
        || '🔑 Kod: ' || COALESCE(NEW.booking_code, '-') || chr(10) || chr(10)
        || 'Randevunuza zamanında gelmenizi rica ederiz. İyi günler! 💕';
      should_send := true;

    ELSIF NEW.status = 'pending' THEN
      -- Müşteriye bilgi
      msg := '⏳ Randevu Talebiniz Alındı' || chr(10) || chr(10)
        || '💇 Güzellik Merkezi' || chr(10)
        || '📋 Hizmet: ' || COALESCE(NEW.service_title, '-') || chr(10)
        || '👩 Uzman: ' || COALESCE(NEW.specialist_name, '-') || chr(10)
        || '📅 Tarih: ' || tarih_str || chr(10)
        || '🕐 Saat: ' || COALESCE(NEW.appointment_time, '-') || chr(10)
        || '🔑 Kod: ' || COALESCE(NEW.booking_code, '-') || chr(10) || chr(10)
        || 'Randevunuz onay beklemektedir. Onaylandığında size bilgi verilecektir.';
      should_send := true;

      -- Admin'e bildirim
      admin_msg := '🔔 Yeni Onay Bekleyen Randevu!' || chr(10) || chr(10)
        || '👤 Müşteri: ' || COALESCE(NEW.customer_name, '-') || chr(10)
        || '📞 Telefon: ' || COALESCE(NEW.customer_phone, '-') || chr(10)
        || '📋 Hizmet: ' || COALESCE(NEW.service_title, '-') || chr(10)
        || '👩 Uzman: ' || COALESCE(NEW.specialist_name, '-') || chr(10)
        || '📅 Tarih: ' || tarih_str || chr(10)
        || '🕐 Saat: ' || COALESCE(NEW.appointment_time, '-') || chr(10)
        || '🔑 Kod: ' || COALESCE(NEW.booking_code, '-') || chr(10) || chr(10)
        || '👉 Onaylamak için admin panele gidin:' || chr(10)
        || 'https://guzellik-merkezi.yusufsunmez.com/#admin';
      should_notify_admin := true;
    END IF;

  -- UPDATE: Admin onayladığında/reddettiğinde
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'approved' THEN
        msg := '✅ Randevunuz Onaylandı!' || chr(10) || chr(10)
          || '💇 Güzellik Merkezi' || chr(10)
          || '📋 Hizmet: ' || COALESCE(NEW.service_title, '-') || chr(10)
          || '👩 Uzman: ' || COALESCE(NEW.specialist_name, '-') || chr(10)
          || '📅 Tarih: ' || tarih_str || chr(10)
          || '🕐 Saat: ' || COALESCE(NEW.appointment_time, '-') || chr(10)
          || '🔑 Kod: ' || COALESCE(NEW.booking_code, '-') || chr(10) || chr(10)
          || 'Randevunuza zamanında gelmenizi rica ederiz. İyi günler! 💕';
        should_send := true;

      ELSIF NEW.status = 'rejected' THEN
        msg := '❌ Randevunuz Reddedildi' || chr(10) || chr(10)
          || '💇 Güzellik Merkezi' || chr(10)
          || '📋 Hizmet: ' || COALESCE(NEW.service_title, '-') || chr(10)
          || '📅 Tarih: ' || tarih_str || chr(10)
          || '🔑 Kod: ' || COALESCE(NEW.booking_code, '-') || chr(10) || chr(10)
          || 'Randevunuz maalesef reddedilmiştir. Farklı bir tarih için yeniden randevu oluşturabilirsiniz.';
        should_send := true;
      END IF;
    END IF;
  END IF;

  -- Müşteriye mesaj gönder
  IF should_send AND msg IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://evolution.yusufsunmez.com/message/sendText/deneme',
      headers := '{"Content-Type": "application/json", "apikey": "085807753BAB-4EA8-BB6F-C42DB5453975"}'::jsonb,
      body := jsonb_build_object('number', clean_phone, 'text', msg)
    );
  END IF;

  -- Admin'e bildirim gönder
  IF should_notify_admin AND admin_msg IS NOT NULL AND admin_phone IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://evolution.yusufsunmez.com/message/sendText/deneme',
      headers := '{"Content-Type": "application/json", "apikey": "085807753BAB-4EA8-BB6F-C42DB5453975"}'::jsonb,
      body := jsonb_build_object('number', admin_phone, 'text', admin_msg)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger 1: Yeni randevu oluşturulduğunda
CREATE TRIGGER trg_appointment_insert_notify
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_status();

-- Trigger 2: Status güncellendiğinde
CREATE TRIGGER trg_appointment_status_notify
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_status();
