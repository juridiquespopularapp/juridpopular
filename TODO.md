# Migração Kiwify ✅ PROGRESSO: 3/5

## ✅ Concluído
- [x] Kiwify API checkout (/api/criar-preferencia.js) - R$5 todos planos  
- [x] Preços UI hardcoded R$5,00 (ModalPlanos, Home)
- [x] .env configuração (aguardando chaves)

## 🔄 Em Andamento  
**1. Fix AssistenteAna.jsx** (parse error linha 97)
**2. Teste local Kiwify** (`npm run dev` → assinar plano)

## ⏳ Pendente
- [ ] api/webhook.js → Kiwify (de Stripe)
- [ ] Renomear lib/mercadopago.js → kiwify.js
- [ ] Deploy Vercel env vars + webhook Kiwify dashboard
- [ ] Teste end-to-end (pagamento → Supabase → plano ativo)

**Comando teste**: `npm run dev` → Login → Assinar PRO → redirect Kiwify

