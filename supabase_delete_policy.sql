-- ============================================
-- RANDEVU SİLME İZNİ
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- Appointments tablosu için DELETE izni
CREATE POLICY "appointments_delete_all" ON appointments FOR DELETE USING (true);

-- Blacklist tablosu için DELETE izni (zaten varsa hata verir, göz ardı edin)
CREATE POLICY "blacklist_delete_all" ON blacklist FOR DELETE USING (true);

-- Appointments tablosu için UPDATE izni (approve/reject için)
CREATE POLICY "appointments_update_all" ON appointments FOR UPDATE USING (true);
