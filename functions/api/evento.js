// POST /api/evento — cuenta clics a WhatsApp y envios del formulario. Sin datos personales:
// no se guarda IP, ni agente de usuario, ni nada que identifique a la persona.
// Usa los mismos secretos de Cloudflare Pages que /api/lead: SUPABASE_URL y
// SUPABASE_PUBLISHABLE_KEY (la publishable va solo en el header apikey).

const ORIGENES = ['https://polysellos.net', 'https://www.polysellos.net'];
const TIPOS = ['clic_whatsapp', 'envio_formulario'];
const MAX_BYTES = 1024;
const UTM = ['utm_source', 'utm_medium', 'utm_campaign'];

const vacio = (status) => new Response(null, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export async function onRequestPost({ request, env }) {
  if (!ORIGENES.includes(request.headers.get('Origin'))) return vacio(403);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return vacio(415);

  const crudo = await leerCuerpo(request, MAX_BYTES);
  if (crudo === null) return vacio(413);

  let d;
  try { d = JSON.parse(crudo); } catch { return vacio(400); }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return vacio(400);

  const tipo = typeof d.tipo === 'string' ? d.tipo : '';
  const cta = typeof d.cta === 'string' ? d.cta : '';
  const pagina = typeof d.pagina === 'string' ? d.pagina : '';
  if (!TIPOS.includes(tipo)) return vacio(422);
  if (!/^[a-z0-9-]{1,40}$/.test(cta)) return vacio(422);
  if (!/^\/[A-Za-z0-9\-_\/.]{0,99}$/.test(pagina)) return vacio(422);

  // Solo las columnas que anon puede insertar; cualquier otro campo se descarta.
  const fila = { tipo, cta, pagina };
  for (const k of UTM) {
    const v = d[k];
    if (v === undefined || v === null || v === '') { fila[k] = null; continue; }
    if (typeof v !== 'string' || v.length > 100 || /[\u0000-\u001f\u007f]/.test(v)) return vacio(422);
    // Un valor que empiece con = + - @ se ejecutaria como formula si se exporta a Excel.
    fila[k] = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
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
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return vacio(502);
  }
  // Nunca devolvemos el error de Supabase: puede revelar la estructura de la base.
  if (!r.ok) return vacio(502);
  return vacio(204);
}

// Lee el cuerpo con tope en bytes. No se confia en Content-Length: puede faltar (envio por
// trozos) o mentir. Devuelve null si se pasa del tope.
async function leerCuerpo(request, max) {
  if (Number(request.headers.get('Content-Length') || 0) > max) return null;
  if (!request.body) return '';
  const lector = request.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { try { await lector.cancel(); } catch { /* ya cerrado */ } return null; }
    partes.push(value);
  }
  const todo = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) { todo.set(p, pos); pos += p.byteLength; }
  return new TextDecoder().decode(todo);
}

// Cualquier otro metodo: cerrado.
export const onRequest = () => vacio(405);
