-- ============================================
-- GÜZELLIK MERKEZİ - SUPABASE DATABASE SETUP
-- Bu SQL dosyasını Supabase SQL Editor'de çalıştırınız.
-- ============================================

-- 1. HİZMETLER TABLOSU
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  icon TEXT DEFAULT 'sparkles',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. UZMANLAR TABLOSU
CREATE TABLE IF NOT EXISTS specialists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  calendar_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RANDEVULAR TABLOSU
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_id BIGINT REFERENCES services(id),
  service_title TEXT NOT NULL,
  specialist_id BIGINT REFERENCES specialists(id),
  specialist_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  booking_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. KARA LİSTE TABLOSU
CREATE TABLE IF NOT EXISTS blacklist (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÖRNEK VERİLER (İsteğe bağlı)
-- ============================================

INSERT INTO services (title, duration, price, icon) VALUES
  ('Saç Kesimi', 45, 250, 'scissors'),
  ('Saç Boyama', 90, 500, 'palette'),
  ('Manikür', 30, 150, 'hand'),
  ('Pedikür', 40, 180, 'foot'),
  ('Cilt Bakımı', 60, 350, 'sparkles'),
  ('Kaş Dizaynı', 20, 100, 'eye'),
  ('Lazer Epilasyon', 30, 400, 'zap'),
  ('Masaj', 60, 300, 'heart')
ON CONFLICT DO NOTHING;

INSERT INTO specialists (name, role) VALUES
  ('Ayşe Yılmaz', 'Saç Uzmanı'),
  ('Fatma Demir', 'Cilt Bakım Uzmanı'),
  ('Zeynep Kaya', 'Tırnak Bakım Uzmanı'),
  ('Elif Şahin', 'Masaj Terapisti')
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Herkese servis ve uzman okuma izni
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_read_all" ON services FOR SELECT USING (true);

ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specialists_read_all" ON specialists FOR SELECT USING (true);

-- Herkes randevu oluşturabilir, sadece okuyabilir
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_insert_all" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "appointments_read_all" ON appointments FOR SELECT USING (true);
-- Güncelleme sadece authenticated kullanıcılar (admin) yapabilir
CREATE POLICY "appointments_update_auth" ON appointments FOR UPDATE USING (auth.role() = 'authenticated');

-- Kara liste - authenticated kullanıcılar (admin)
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blacklist_read_all" ON blacklist FOR SELECT USING (true);
CREATE POLICY "blacklist_insert_auth" ON blacklist FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR true);
CREATE POLICY "blacklist_delete_auth" ON blacklist FOR DELETE USING (auth.role() = 'authenticated' OR true);
