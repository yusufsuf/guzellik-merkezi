-- ============================================
-- TATİL / KAPALI GÜNLER TABLOSU
-- Bu SQL'i Supabase SQL Editor'de çalıştırınız.
-- ============================================

CREATE TABLE IF NOT EXISTS closed_days (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  reason TEXT DEFAULT 'Kapalı',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE closed_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closed_days_all" ON closed_days FOR ALL USING (true) WITH CHECK (true);
