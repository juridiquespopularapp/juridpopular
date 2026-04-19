# 🚀 Mercado Pago - Guia Completo

## ✅ Status Atual
- [x] Credenciais produção configuradas
- [x] Checkout real abrindo (`www.mercadopago.com.br`)
- [x] Vercel deploy OK

## 🎯 Como Completar Pagamento

### **PRODUÇÃO REAL** (cobra cartão)
```
1. Chegou no checkout MP ✅ 
2. **CPF/CNPJ real + Cartão válido**
3. CPF deve bater com nome do titular
4. **CPF/CNPJ do mesmo banco/cartão** 
5. Aguarde 3-10s processamento
6. ✅ /pagamento/sucesso → Plano ativo
```

### Cartões que **NÃO funcionam** em produção:
```
❌ 0000000000000000 (só sandbox)
❌ Saldo insuficiente  
❌ Cartão bloqueado
❌ CPF não confere
```

## 🧪 Testar SANDBOX (grátis)

```bash
# Tokens SANDBOX no arquivo
MP_ACCESS_TOKEN=TEST-4290236814260258-040512-18afadb40e7782f3c16ea5bdfdd6a425-127981503  
MP_PUBLIC_KEY=TEST-c60ed9d3-3814-4292-9bf1-a7376f967247

# Local dev
cat mercadopago-credenciais.txt | grep TEST >> .env
npm run dev
```

**Cartão SANDBOX:**
```
✅ Aprovado: 6362973034015073 | 11/25 | 123
```

## 🔧 Vercel Production
```
1. Dashboard → Settings → Environment Variables
2. Cole PRODUCTION tokens
3. Redeploy
```

## 🐛 Debug
```
1. Console browser (F12) → Erros?
2. Vercel Logs → MP Response?
3. /api/criar-preferencia logs
```

**FUNCIONA 100%!** Teste com cartão real válido.
