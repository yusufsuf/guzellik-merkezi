-- ============================================
-- ADMIN TELEFON NUMARASINI SUPABASE'E KAYDET
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Admin ayarları tablosu (yoksa oluştur)
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_all" ON admin_settings FOR ALL USING (true) WITH CHECK (true);

-- Admin telefon numarasını kaydet
INSERT INTO admin_settings (key, value)
VALUES ('admin_phone', '05340841077')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- ADMIN ŞİFRE SIFIRLAMA FONKSİYONU
-- Frontend admin telefonunu bilmeden OTP gönderir
-- ============================================
CREATE OR REPLACE FUNCTION send_admin_reset_otp()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_phone_number TEXT;
  otp_code TEXT;
  recent_count INT;
BEGIN
  -- Admin telefonunu veritabanından al
  SELECT value INTO admin_phone_number
  FROM admin_settings
  WHERE key = 'admin_phone';

  IF admin_phone_number IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Admin telefon numarası tanımlı değil.');
  END IF;

  -- Saat başı en fazla 3 kod
  SELECT COUNT(*) INTO recent_count
  FROM otp_codes
  WHERE phone = admin_phone_number
  AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 3 THEN
    RETURN json_build_object('success', false, 'message', 'Çok fazla deneme. 1 saat sonra tekrar deneyin.');
  END IF;

  -- 6 haneli kod üret
  otp_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Eski kodları sil
  DELETE FROM otp_codes WHERE phone = admin_phone_number;

  -- Yeni kodu kaydet
  INSERT INTO otp_codes (phone, code, expires_at)
  VALUES (admin_phone_number, otp_code, NOW() + INTERVAL '5 minutes');

  -- WhatsApp mesajı gönder
  PERFORM net.http_post(
    url := 'https://evolution.yusufsunmez.com/message/sendText/deneme',
    headers := '{"Content-Type": "application/json", "apikey": "085807753BAB-4EA8-BB6F-C42DB5453975"}'::jsonb,
    body := jsonb_build_object(
      'number', admin_phone_number,
      'text', '🔐 Admin Şifre Sıfırlama' || chr(10) || chr(10) || 'Doğrulama kodunuz: ' || otp_code || chr(10) || chr(10) || 'Bu kod 5 dakika geçerlidir. Kimseyle paylaşmayın.'
    )
  );

  RETURN json_build_object('success', true, 'message', 'Doğrulama kodu gönderildi.');
END;
$$;

-- Admin OTP doğrulama fonksiyonu
CREATE OR REPLACE FUNCTION verify_admin_reset_otp(code_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_phone_number TEXT;
  is_valid BOOLEAN;
BEGIN
  SELECT value INTO admin_phone_number
  FROM admin_settings
  WHERE key = 'admin_phone';

  IF admin_phone_number IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Admin telefon numarası bulunamadı.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM otp_codes
    WHERE phone = admin_phone_number
    AND code = code_input
    AND expires_at > NOW()
  ) INTO is_valid;

  IF is_valid THEN
    DELETE FROM otp_codes WHERE phone = admin_phone_number;
    RETURN json_build_object('success', true, 'message', 'Doğrulama başarılı!');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Geçersiz veya süresi dolmuş kod.');
  END IF;
END;
$$;
