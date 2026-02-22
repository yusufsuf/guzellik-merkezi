-- ============================================
-- START_TIME SÜTUNUNU TEXT'E ÇEVİR
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- start_time sütununu TEXT tipine çevir (saat bilgisi kaybolmasın)
ALTER TABLE appointments ALTER COLUMN start_time TYPE TEXT;
