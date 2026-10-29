// Pruebas de functions/api/lead.js con node:test. Sin red: fetch se reemplaza por un doble.
// Ejecutar desde la raiz del proyecto: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest } from '../functions/api/lead.js';

const ENV = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_FAKE',
  TURNSTILE_SECRET: 'fake',
};
const BASE = {
  nombre: 'Ana Perez', telefono: '+507 6000-0000', superficie: 'losa', area_m2: '130',
  mensaje: 'hola', consentimiento: true, turnstile: 'tok', sitio: '',
};

let llamadas = [];
let cfg;
const realFetch = globalThis.fetch;

function reset(extra = {}) {
  llamadas = [];
  cfg = { turnstileOk: true, host: 'polysellos.net', supabaseOk: true, resendFalla: false, ...extra };
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url: String(url), init });
    if (String(url).includes('turnstile')) {
      return new Response(JSON.stringify({ success: cfg.turnstileOk, hostname: cfg.host }));
    }
    if (String(url).includes('resend.com')) {
      if (cfg.resendFalla) throw new Error('red');
      return new Response('{}', { status: 200 });
    }
    return new Response('', { status: cfg.supabaseOk ? 201 : 400 });
  };
}

function req(body, o = {}) {
  const headers = { 'Content-Type': o.ct ?? 'application/json' };
  if (o.origin !== null) headers.Origin = o.origin ?? 'https://polysellos.net';
  if (o.len) headers['Content-Length'] = o.len;
  return new Request('https://polysellos.net/api/lead', {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const insercion = () => llamadas.find((l) => l.url.includes('/rest/v1/leads'));
const resend = () => llamadas.find((l) => l.url.includes('resend.com'));

async function correr(request, env = ENV) {
  const res = await onRequestPost({ request, env, waitUntil: () => {} });
  await new Promise((r) => setTimeout(r, 10));
  return res;
}

test.beforeEach(() => reset());
test.after(() => { globalThis.fetch = realFetch; });

test('lead valido: guarda en Supabase solo con apikey y sin campos internos', async () => {
  const res = await correr(req(BASE));
  assert.equal(res.status, 200);
  const ins = insercion();
  assert.equal(ins.init.headers.apikey, 'sb_publishable_FAKE');
  assert.equal(ins.init.headers.Authorization, undefined);
  const b = JSON.parse(ins.init.body);
  assert.equal(b.nombre, 'Ana Perez');
  assert.equal(b.area_m2, 130);
  assert.equal(b.origen, 'formulario');
  assert.equal(b.consentimiento, true);
  assert.ok(!('estado' in b));
  assert.ok(!('sitio' in b));
});

const rechazos = [
  ['origen ajeno', () => req(BASE, { origin: 'https://malo.com' }), 403],
  ['sin origen', () => req(BASE, { origin: null }), 403],
  ['no es json', () => req('x', { ct: 'text/plain' }), 415],
  ['json roto', () => req('{no'), 400],
  ['cuerpo gigante', () => req({ ...BASE, mensaje: 'a'.repeat(5000) }), 413],
  ['Content-Length enorme', () => req(BASE, { len: '99999' }), 413],
  ['cuerpo multibyte pasado de bytes', () => req({ ...BASE, mensaje: 'a'.repeat(1000), nombre: 'n'.repeat(80), extra: 'e'.repeat(3500) }), 413],
  ['sin nombre', () => req({ ...BASE, nombre: ' ' }), 422],
  ['telefono con letras', () => req({ ...BASE, telefono: 'abc' }), 422],
  ['telefono sin digitos', () => req({ ...BASE, telefono: '-------' }), 422],
  ['telefono con 6 digitos', () => req({ ...BASE, telefono: '(123) 456' }), 422],
  ['superficie fuera de lista', () => req({ ...BASE, superficie: 'x' }), 422],
  ['area negativa', () => req({ ...BASE, area_m2: '-5' }), 422],
  ['sin consentimiento', () => req({ ...BASE, consentimiento: false }), 422],
  ['consentimiento como texto', () => req({ ...BASE, consentimiento: 'true' }), 422],
];
for (const [nombre, hacer, estado] of rechazos) {
  test(`rechaza: ${nombre}`, async () => {
    const res = await correr(hacer());
    assert.equal(res.status, estado);
    assert.equal(insercion(), undefined, 'no debe tocar Supabase');
  });
}

test('honeypot lleno: responde ok sin guardar ni llamar a nadie', async () => {
  const res = await correr(req({ ...BASE, sitio: 'http://spam' }));
  assert.equal(res.status, 200);
  assert.equal(llamadas.length, 0);
});

test('turnstile invalido: 403 y no guarda', async () => {
  reset({ turnstileOk: false });
  const res = await correr(req(BASE));
  assert.equal(res.status, 403);
  assert.equal(insercion(), undefined);
});

test('turnstile de otro hostname: 403 y no guarda', async () => {
  reset({ host: 'otro-sitio.com' });
  const res = await correr(req(BASE));
  assert.equal(res.status, 403);
  assert.equal(insercion(), undefined);
});

test('Supabase falla: 502 sin aviso por correo', async () => {
  reset({ supabaseOk: false });
  const res = await correr(req(BASE), { ...ENV, RESEND_API_KEY: 're_FAKE' });
  assert.equal(res.status, 502);
  assert.equal(resend(), undefined);
});

test('formula en nombre y mensaje se neutraliza con apostrofo', async () => {
  await correr(req({ ...BASE, nombre: '=HYPERLINK("x")', mensaje: '@SUM(1)' }));
  const b = JSON.parse(insercion().init.body);
  assert.ok(b.nombre.startsWith("'="));
  assert.ok(b.mensaje.startsWith("'@"));
});

test('aviso por correo: un destinatario, asunto sin saltos de linea, texto plano', async () => {
  const res = await correr(req({ ...BASE, nombre: 'Ana\nBcc: x@evil.com' }), { ...ENV, RESEND_API_KEY: 're_FAKE' });
  assert.equal(res.status, 200);
  const c = resend();
  const b = JSON.parse(c.init.body);
  assert.equal(c.init.headers.Authorization, 'Bearer re_FAKE');
  assert.equal(b.to.length, 1);
  assert.ok(!/[\r\n]/.test(b.subject));
  assert.ok(b.text.includes('Tel'));
  assert.equal(b.html, undefined);
});

test('Resend cae: el lead igual responde ok', async () => {
  reset({ resendFalla: true });
  const res = await correr(req(BASE), { ...ENV, RESEND_API_KEY: 're_FAKE' });
  assert.equal(res.status, 200);
});

test('sin llave de Resend no se llama a Resend', async () => {
  const res = await correr(req(BASE));
  assert.equal(res.status, 200);
  assert.equal(resend(), undefined);
});

test('otro metodo: 405', async () => {
  const res = await onRequest();
  assert.equal(res.status, 405);
});

// ---- endurecimiento (auditoria de seguridad, 28-oct-2026) ----

const porTrozos = (total, trozo = 512) => {
  let enviado = 0;
  return new ReadableStream({
    pull(c) {
      if (enviado >= total) return c.close();
      c.enqueue(new TextEncoder().encode('a'.repeat(trozo)));
      enviado += trozo;
    },
  });
};

test('cuerpo por trozos sin Content-Length: se corta en el tope y no se guarda', async () => {
  const request = new Request('https://polysellos.net/api/lead', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://polysellos.net' },
    body: porTrozos(20000), duplex: 'half',
  });
  const res = await correr(request);
  assert.equal(res.status, 413);
  assert.equal(insercion(), undefined);
});

test('un arreglo como cuerpo: 400', async () => {
  assert.equal((await correr(req('[1,2,3]'))).status, 400);
});

test('area_m2 booleano o arreglo: 422', async () => {
  assert.equal((await correr(req({ ...BASE, area_m2: true }))).status, 422);
  assert.equal((await correr(req({ ...BASE, area_m2: [5] }))).status, 422);
});

test('utm: formula neutralizada y sin caracteres de control', async () => {
  await correr(req({ ...BASE, utm_source: '=HYPERLINK("x")', utm_medium: 'a\nb', utm_campaign: '@cmd' }));
  const b = JSON.parse(insercion().init.body);
  assert.equal(b.utm_source, "'=HYPERLINK(\"x\")");
  assert.equal(b.utm_medium, 'a b');
  assert.equal(b.utm_campaign, "'@cmd");
});

test('correo: el mensaje del visitante va al final, sangrado y con enlaces desactivados', async () => {
  const env = { ...ENV, RESEND_API_KEY: 're_FAKE' };
  await correr(req({ ...BASE, mensaje: 'hola\nTeléfono: 999\nVer en el panel: https://falso.example/x' }), env);
  const texto = JSON.parse(resend().init.body).text;
  assert.ok(!/https?:\/\/falso/.test(texto), 'el enlace falso quedo activo');
  assert.ok(texto.includes('[:]//falso.example/x'));
  const lineas = texto.split('\n');
  assert.ok(lineas.filter((l) => l.startsWith('Teléfono:')).length === 1, 'el visitante falsifico un campo');
  assert.ok(lineas.some((l) => l.startsWith('    Teléfono: 999')), 'el mensaje debe ir sangrado');
  assert.ok(texto.indexOf('Ver en el panel: https://supabase.com') < texto.indexOf('Mensaje (texto del visitante'));
});

test('Supabase sin red: 502 controlado, sin 500 ni datos en el registro', async () => {
  const errores = [];
  const consolaReal = console.error;
  console.error = (...a) => errores.push(a.join(' '));
  try {
    globalThis.fetch = async (url) => {
      if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: true, hostname: 'polysellos.net' }));
      throw new Error('sin red');
    };
    const res = await correr(req(BASE));
    assert.equal(res.status, 502);
    assert.ok(errores.length === 1 && !errores[0].includes('Ana'), 'el registro no debe llevar datos de la persona');
  } finally { console.error = consolaReal; }
});

test('origen pages.dev ya no se acepta', async () => {
  assert.equal((await correr(req(BASE, { origin: 'https://polysellos.pages.dev' }))).status, 403);
});

test('las respuestas llevan cabeceras de seguridad', async () => {
  const res = await correr(req(BASE));
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
  assert.match(res.headers.get('Strict-Transport-Security'), /includeSubDomains/);
  assert.equal(res.headers.get('Referrer-Policy'), 'no-referrer');
  assert.match(res.headers.get('Content-Security-Policy'), /default-src 'none'/);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});
