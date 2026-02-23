-- ============================================
-- DOĞRULANMIŞ TELEFONLAR TABLOSU
-- Bir kez WhatsApp OTP ile doğrulanan numaralar
-- tekrar kod girmeden randevu alabilir.
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

CREATE TABLE IF NOT EXISTS verified_phones (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE verified_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verified_phones_all" ON verified_phones FOR ALL USING (true) WITH CHECK (true);
