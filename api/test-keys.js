export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.json({
    VITE_OPENROUTER_API_KEY: process.env.VITE_OPENROUTER_API_KEY ? 'SET' : 'MISSING',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'MISSING',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
  })
}
