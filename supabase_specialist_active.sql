-- ============================================
-- UZMAN AKTİF/PASİF ÖZELLİĞİ
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Specialists tablosuna is_active kolonu ekle
ALTER TABLE specialists ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Tüm mevcut uzmanları aktif yap
UPDATE specialists SET is_active = true WHERE is_active IS NULL;

-- RLS: Uzmanların güncellenmesine izin ver
CREATE POLICY "specialists_update_all" ON specialists FOR UPDATE USING (true);
