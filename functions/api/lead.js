// POST /api/lead — recibe el formulario de la landing y lo guarda en Supabase.
// Las llaves viven como secretos cifrados de Cloudflare Pages, nunca en el repo:
//   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, TURNSTILE_SECRET, RESEND_API_KEY
// La llave de Supabase es la publishable: la tabla solo permite INSERT (RLS).

const ORIGENES = ['https://polysellos.net', 'https://www.polysellos.net', 'https://polysellos.pages.dev'];
const SUPERFICIES = ['techo', 'losa', 'estacionamiento', 'piso industrial', 'otro'];
const MAX_BYTES = 4096;
// Aviso por correo a cada lead nuevo. Sin dominio verificado, Resend solo envia desde
// onboarding@resend.dev y solo a la direccion con la que se creo la cuenta de Resend.
const AVISO_A = 'polysellospanama@gmail.com';
const AVISO_DE = 'Polysellos CRM <onboarding@resend.dev>';
const PANEL = 'https://supabase.com/dashboard/project/lqkobqcsegyobjimxwdp/editor';

const json = (cuerpo, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Un nombre o mensaje que empiece con = + - @ se ejecutaria como formula si alguien
// exporta los leads a Excel o CSV. El apostrofo lo vuelve texto.
const sinFormula = (v) => (/^[=+\-@]/.test(v) ? "'" + v : v);

export async function onRequestPost({ request, env, waitUntil }) {
  if (!ORIGENES.includes(request.headers.get('Origin'))) return json({ ok: false }, 403);
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return json({ ok: false }, 415);

  // Se mide antes de leer el cuerpo, y otra vez en bytes despues (no en caracteres).
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) return json({ ok: false }, 413);
  const crudo = await request.text();
  if (new TextEncoder().encode(crudo).length > MAX_BYTES) return json({ ok: false }, 413);

  let d;
  try { d = JSON.parse(crudo); } catch { return json({ ok: false }, 400); }
  if (!d || typeof d !== 'object') return json({ ok: false }, 400);

  // Campo trampa: un humano no lo ve. Respondemos "ok" para no darle pistas al bot.
  if (texto(d.sitio, 50)) return json({ ok: true });

  const nombre = sinFormula(texto(d.nombre, 80));
  const telefono = texto(d.telefono, 20);
  const superficie = texto(d.superficie, 30);
  const mensaje = sinFormula(texto(d.mensaje, 1000));
  const area = d.area_m2 === '' || d.area_m2 == null ? null : Number(d.area_m2);

  if (nombre.length < 2) return json({ ok: false, campo: 'nombre' }, 422);
  if (!/^[0-9+()\-\s]{7,20}$/.test(telefono) || telefono.replace(/\D/g, '').length < 7) return json({ ok: false, campo: 'telefono' }, 422);
  if (superficie && !SUPERFICIES.includes(superficie)) return json({ ok: false, campo: 'superficie' }, 422);
  if (area !== null && !(area > 0 && area <= 100000)) return json({ ok: false, campo: 'area_m2' }, 422);
  if (d.consentimiento !== true) return json({ ok: false, campo: 'consentimiento' }, 422);

  // Turnstile: sin esto cualquier script puede llenar la base de basura.
  const verif = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: texto(d.turnstile, 2048),
      remoteip: request.headers.get('CF-Connecting-IP') || '',
    }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  // Ademas de que el token sea valido, tiene que haberse generado en nuestro sitio.
  const hosts = ORIGENES.map((o) => new URL(o).hostname);
  if (!verif.success || !hosts.includes(verif.hostname)) return json({ ok: false, campo: 'turnstile' }, 403);

  const fila = {
    nombre,
    telefono,
    superficie: superficie || null,
    area_m2: area,
    mensaje: mensaje || null,
    origen: 'formulario',
    utm_source: texto(d.utm_source, 100) || null,
    utm_medium: texto(d.utm_medium, 100) || null,
    utm_campaign: texto(d.utm_campaign, 100) || null,
    consentimiento: true,
  };

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fila),
  });

  if (!r.ok) {
    // Nunca devolvemos el error de Supabase: puede revelar la estructura de la base.
    return json({ ok: false }, 502);
  }
  const aviso = avisar(env, fila);
  if (waitUntil) waitUntil(aviso); else await aviso;
  return json({ ok: true });
}

// Aviso por correo: mejor esfuerzo. Si falla o no hay llave, el lead ya esta guardado y
// la persona no se entera. Va como texto plano (sin HTML) y sin saltos de linea en el asunto.
async function avisar(env, f) {
  if (!env.RESEND_API_KEY) return;
  const una = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ');
  const cuerpo = [
    `Nombre: ${una(f.nombre)}`,
    `Teléfono: ${una(f.telefono)}`,
    `Superficie: ${f.superficie || 'sin definir'}`,
    `Área aproximada: ${f.area_m2 ? f.area_m2 + ' m²' : 'sin definir'}`,
    `Mensaje: ${f.mensaje || '-'}`,
    f.utm_source ? `Origen: ${una(f.utm_source)} / ${una(f.utm_medium)} / ${una(f.utm_campaign)}` : '',
    '',
    `Ver en el panel: ${PANEL}`,
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: AVISO_DE, to: [AVISO_A], subject: `Nuevo lead: ${una(f.nombre)}`.slice(0, 120), text: cuerpo }),
  }).catch(() => {});
}

// Cualquier otro método: cerrado.
export const onRequest = () => json({ ok: false }, 405);
