// POST /api/evento — cuenta clics a WhatsApp y envios del formulario. Sin datos personales:
// no se guarda IP, ni agente de usuario, ni nada que identifique a la persona.
// Usa los mismos secretos de Cloudflare Pages que /api/lead: SUPABASE_URL y
// SUPABASE_PUBLISHABLE_KEY (la publishable va solo en el header apikey).

const ORIGENES = ['https://polysellos.pages.dev'];
const TIPOS = ['clic_whatsapp', 'envio_formulario'];
const MAX_BYTES = 1024;
const UTM = ['utm_source', 'utm_medium', 'utm_campaign'];

const vacio = (status) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!ORIGENES.includes(request.headers.get('Origin'))) return vacio(403);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return vacio(415);

  // Se mide antes de leer el cuerpo, y otra vez en bytes despues.
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) return vacio(413);
  const crudo = await request.text();
  if (new TextEncoder().encode(crudo).length > MAX_BYTES) return vacio(413);

  let d;
  try { d = JSON.parse(crudo); } catch { return vacio(400); }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return vacio(400);

  const tipo = typeof d.tipo === 'string' ? d.tipo : '';
  const cta = typeof d.cta === 'string' ? d.cta : '';
  const pagina = typeof d.pagina === 'string' ? d.pagina : '';
  if (!TIPOS.includes(tipo)) return vacio(422);
  if (!/^[a-z0-9-]{1,40}$/.test(cta)) return vacio(422);
  if (!pagina.startsWith('/') || pagina.length > 100) return vacio(422);

  // Solo las columnas que anon puede insertar; cualquier otro campo se descarta.
  const fila = { tipo, cta, pagina };
  for (const k of UTM) {
    const v = d[k];
    if (v === undefined || v === null || v === '') { fila[k] = null; continue; }
    if (typeof v !== 'string' || v.length > 100) return vacio(422);
    fila[k] = v;
  }

  let r;
  try {
    r = await fetch(`${env.SUPABASE_URL}/rest/v1/eventos`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(fila),
    });
  } catch {
    return vacio(502);
  }
  // Nunca devolvemos el error de Supabase: puede revelar la estructura de la base.
  if (!r.ok) return vacio(502);
  return vacio(204);
}

// Cualquier otro metodo: cerrado.
export const onRequest = () => vacio(405);
