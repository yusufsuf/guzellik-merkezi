-- ============================================
-- UZMAN-HİZMET EŞLEŞTİRME TABLOSU
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

CREATE TABLE IF NOT EXISTS specialist_services (
  id BIGSERIAL PRIMARY KEY,
  specialist_id BIGINT REFERENCES specialists(id) ON DELETE CASCADE,
  service_id BIGINT REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(specialist_id, service_id)
);

-- Hangi uzman hangi hizmetleri veriyor
INSERT INTO specialist_services (specialist_id, service_id) VALUES
  (1, 1),  -- Ayşe Yılmaz -> Saç Kesimi
  (1, 2),  -- Ayşe Yılmaz -> Saç Boyama
  (2, 5),  -- Fatma Demir -> Cilt Bakımı
  (2, 6),  -- Fatma Demir -> Kaş Dizaynı
  (2, 7),  -- Fatma Demir -> Lazer Epilasyon
  (3, 3),  -- Zeynep Kaya -> Manikür
  (3, 4),  -- Zeynep Kaya -> Pedikür
  (4, 8)   -- Elif Şahin -> Masaj
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE specialist_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specialist_services_read_all" ON specialist_services FOR SELECT USING (true);
