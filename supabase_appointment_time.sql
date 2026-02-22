-- ============================================
-- SAAT SÜTUNU EKLEME
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Appointments tablosuna saat sütunu ekle (örn: "15:00")
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_time TEXT;
