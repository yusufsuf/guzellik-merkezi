-- ============================================
-- ADMIN ŞİFRE SIFIRLAMA OTP DÜZELTMESİ
-- Telefon numarası formatını temizler
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Fonksiyonu düzelt (telefon temizleme ekle)
CREATE OR REPLACE FUNCTION send_admin_reset_otp()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  raw_phone TEXT;
  clean_phone TEXT;
  otp_code TEXT;
  recent_count INT;
BEGIN
  -- Admin telefonunu veritabanından al
  SELECT value INTO raw_phone
  FROM admin_settings
  WHERE key = 'admin_phone';

  IF raw_phone IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Admin telefon numarası tanımlı değil.');
  END IF;

  -- Telefon numarasını temizle (sadece rakamlar)
  clean_phone := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  -- + işareti ile başlıyorsa kaldır
  IF clean_phone LIKE '90%' AND length(clean_phone) = 12 THEN
    -- Zaten doğru format: 905XXXXXXXXX
    NULL;
  ELSIF clean_phone LIKE '0%' THEN
    -- 05XXXXXXXXX → 905XXXXXXXXX
    clean_phone := '9' || clean_phone;
  ELSIF length(clean_phone) = 10 THEN
    -- 5XXXXXXXXX → 905XXXXXXXXX
    clean_phone := '90' || clean_phone;
  END IF;

  -- Saat başı en fazla 3 kod
  SELECT COUNT(*) INTO recent_count
  FROM otp_codes
  WHERE phone = clean_phone
  AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 3 THEN
    RETURN json_build_object('success', false, 'message', 'Çok fazla deneme. 1 saat sonra tekrar deneyin.');
  END IF;

  -- 6 haneli kod üret
  otp_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Eski kodları sil
  DELETE FROM otp_codes WHERE phone = clean_phone;

  -- Yeni kodu kaydet
  INSERT INTO otp_codes (phone, code, expires_at)
  VALUES (clean_phone, otp_code, NOW() + INTERVAL '5 minutes');

  -- WhatsApp mesajı gönder
  PERFORM net.http_post(
    url := 'https://evolution.yusufsunmez.com/message/sendText/deneme',
    headers := '{"Content-Type": "application/json", "apikey": "085807753BAB-4EA8-BB6F-C42DB5453975"}'::jsonb,
    body := jsonb_build_object(
      'number', clean_phone,
      'text', '🔐 Admin Şifre Sıfırlama' || chr(10) || chr(10) || 'Doğrulama kodunuz: ' || otp_code || chr(10) || chr(10) || 'Bu kod 5 dakika geçerlidir.'
    )
  );

  RETURN json_build_object('success', true, 'message', 'Doğrulama kodu gönderildi.', 'debug_phone', clean_phone);
END;
$$;

-- Doğrulama fonksiyonunu da düzelt
CREATE OR REPLACE FUNCTION verify_admin_reset_otp(code_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  raw_phone TEXT;
  clean_phone TEXT;
  is_valid BOOLEAN;
BEGIN
  SELECT value INTO raw_phone
  FROM admin_settings
  WHERE key = 'admin_phone';

  IF raw_phone IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Admin telefon numarası bulunamadı.');
  END IF;

  -- Aynı temizleme
  clean_phone := regexp_replace(raw_phone, '[^0-9]', '', 'g');
  IF clean_phone LIKE '90%' AND length(clean_phone) = 12 THEN
    NULL;
  ELSIF clean_phone LIKE '0%' THEN
    clean_phone := '9' || clean_phone;
  ELSIF length(clean_phone) = 10 THEN
    clean_phone := '90' || clean_phone;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM otp_codes
    WHERE phone = clean_phone
    AND code = code_input
    AND expires_at > NOW()
  ) INTO is_valid;

  IF is_valid THEN
    DELETE FROM otp_codes WHERE phone = clean_phone;
    RETURN json_build_object('success', true, 'message', 'Doğrulama başarılı!');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Geçersiz veya süresi dolmuş kod.');
  END IF;
END;
$$;
