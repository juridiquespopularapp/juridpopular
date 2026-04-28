-- Criação das tabelas necessárias para webhooks Kiwify

-- Tabela profiles (usuários e planos)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  plano TEXT DEFAULT 'gratuito',
  plano_ativo BOOLEAN DEFAULT false,
  plano_inicio TIMESTAMPTZ,
  plano_expira TIMESTAMPTZ,
  email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cria política se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Service pode gerenciar profiles'
  ) THEN
    CREATE POLICY "Service pode gerenciar profiles" 
    ON profiles FOR ALL 
    USING (true) WITH CHECK (true);
  END IF;
END
$$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'processos_avulsos' 
    AND policyname = 'Service pode gerenciar avulsos'
  ) THEN
    CREATE POLICY "Service pode gerenciar avulsos" 
    ON processos_avulsos FOR ALL 
    USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_avulsos_usuario_hash ON processos_avulsos(usuario_id, processo_hash);
CREATE INDEX IF NOT EXISTS idx_avulsos_expira ON processos_avulsos(expira_em);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();