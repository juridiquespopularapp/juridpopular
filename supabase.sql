-- Criação das tabelas necessárias para webhooks Kiwify

-- Tabela profiles (usuários e planos)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  plano TEXT DEFAULT 'gratuito',
  plano_ativo BOOLEAN DEFAULT false,
  plano_inicio TIMESTAMPTZ,
  plano_expira TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para profiles (service key permite upsert)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service key pode upsert profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Tabela processos_avulsos
CREATE TABLE IF NOT EXISTS processos_avulsos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT REFERENCES profiles(id),
  processo_hash TEXT NOT NULL,
  pago_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para processos_avulsos
ALTER TABLE processos_avulsos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service key pode upsert avulsos" ON processos_avulsos FOR ALL USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_avulsos_usuario_hash ON processos_avulsos(usuario_id, processo_hash);
CREATE INDEX IF NOT EXISTS idx_avulsos_expira ON processos_avulsos(expira_em);
