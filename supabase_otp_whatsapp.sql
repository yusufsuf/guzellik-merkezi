-- ============================================
-- WHATSAPP OTP DOĞRULAMA SİSTEMİ
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- 1) pg_net uzantısını etkinleştir (HTTP istekleri için)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2) OTP kodları tablosu
CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) RLS politikaları
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "otp_all" ON otp_codes FOR ALL USING (true) WITH CHECK (true);

-- 4) OTP GÖNDERME FONKSİYONU
CREATE OR REPLACE FUNCTION send_otp(phone_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  otp_code TEXT;
  clean_phone TEXT;
  recent_count INT;
BEGIN
  -- Telefon numarasını temizle (sadece rakamlar)
  clean_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');

  -- 0xxx → 90xxx (Türkiye formatı)
  IF clean_phone LIKE '0%' THEN
    clean_phone := '9' || clean_phone;
  END IF;

  -- Saat başı en fazla 3 kod gönder (spam engeli)
  SELECT COUNT(*) INTO recent_count
  FROM otp_codes
  WHERE phone = clean_phone
  AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 3 THEN
    RETURN json_build_object('success', false, 'message', 'Çok fazla deneme. 1 saat sonra tekrar deneyin.');
  END IF;

  -- 6 haneli rastgele kod üret
  otp_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Eski kodları sil
  DELETE FROM otp_codes WHERE phone = clean_phone;

  -- Yeni kodu kaydet (5 dakika geçerli)
  INSERT INTO otp_codes (phone, code, expires_at)
  VALUES (clean_phone, otp_code, NOW() + INTERVAL '5 minutes');

  -- Evolution API ile WhatsApp mesajı gönder
  PERFORM net.http_post(
    url := 'https://evolution.yusufsunmez.com/message/sendText/notlar',
    headers := '{"Content-Type": "application/json", "apikey": "0B140FBE9CC0-4F77-B104-CF082081AC3B"}'::jsonb,
    body := jsonb_build_object(
      'number', clean_phone,
      'text', '💇 Güzellik Merkezi' || chr(10) || chr(10) || 'Doğrulama kodunuz: ' || otp_code || chr(10) || chr(10) || 'Bu kod 5 dakika geçerlidir. Lütfen kimseyle paylaşmayın.'
    )
  );

  RETURN json_build_object('success', true, 'message', 'Doğrulama kodu gönderildi.');
END;
$$;

-- 5) OTP DOĞRULAMA FONKSİYONU
CREATE OR REPLACE FUNCTION verify_otp(phone_input TEXT, code_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_phone TEXT;
  is_valid BOOLEAN;
BEGIN
  clean_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
  IF clean_phone LIKE '0%' THEN
    clean_phone := '9' || clean_phone;
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

-- 6) Eski kodları otomatik temizle (isteğe bağlı)
-- Bu fonksiyon süresi dolmuş kodları siler
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW();
END;
$$;
