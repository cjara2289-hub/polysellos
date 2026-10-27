// Pruebas estaticas del sitio con node:test: estructura, contenido minimo y accesibilidad
// de las paginas. Sin red. Ejecutar desde la raiz del proyecto: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const leer = (f) => readFileSync(f, 'utf8');
const SISTEMAS = ['poliurea', 'poliurea-en-frio', 'poliuretano', 'acrilico', 'polimero-ms', 'cementicio'];
const PAGINAS = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
const INTERNAS = PAGINAS.filter((f) => f !== 'index.html');
const CONTENIDO = [...SISTEMAS.map((s) => `${s}.html`), 'guia-filtraciones.html', 'casos.html'];
const palabras = (s) => s.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

test('las paginas de contenido existen', () => {
  for (const f of CONTENIDO) assert.ok(PAGINAS.includes(f), `falta ${f}`);
});

test('respuesta directa de 40 a 60 palabras al inicio', () => {
  for (const f of CONTENIDO) {
    const m = leer(f).match(/<p class="answer">([\s\S]*?)<\/p>/);
    assert.ok(m, `${f}: falta <p class="answer">`);
    const n = palabras(m[1]);
    assert.ok(n >= 40 && n <= 60, `${f}: la respuesta directa tiene ${n} palabras`);
  }
});

test('cuatro preguntas frecuentes en cada sistema y en la guia', () => {
  for (const f of [...SISTEMAS.map((s) => `${s}.html`), 'guia-filtraciones.html']) {
    const n = (leer(f).match(/<summary><h3>/g) || []).length;
    assert.equal(n, 4, `${f}: ${n} preguntas visibles`);
  }
});

test('cada sistema enlaza a los otros cinco y a la guia', () => {
  for (const s of SISTEMAS) {
    const html = leer(`${s}.html`);
    for (const otro of [...SISTEMAS.filter((x) => x !== s), 'guia-filtraciones']) {
      assert.ok(html.includes(`href="/${otro}"`), `${s}.html no enlaza a /${otro}`);
    }
  }
});

test('migas de pan en las paginas de contenido', () => {
  for (const f of CONTENIDO) {
    assert.ok(leer(f).includes('<nav class="breadcrumb" aria-label="Migas de pan">'), `${f}: sin migas de pan`);
  }
});

test('ninguna pagina interna depende de data-reveal', () => {
  for (const f of INTERNAS) assert.ok(!leer(f).includes('data-reveal'), `${f}: usa data-reveal`);
});

test('todo enlace a WhatsApp lleva data-cta', () => {
  for (const f of PAGINAS) {
    const enlaces = leer(f).match(/<a\b[^>]*href="https:\/\/wa\.me\/[^"]*"[^>]*>/g) || [];
    for (const a of enlaces) assert.ok(/\sdata-cta="[a-z0-9-]+"/.test(a), `${f}: enlace a WhatsApp sin data-cta`);
  }
});

test('encabezados sin saltos de nivel y un solo h1', () => {
  for (const f of PAGINAS) {
    const niveles = [...leer(f).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    assert.equal(niveles.filter((n) => n === 1).length, 1, `${f}: debe haber un h1`);
    let previo = 0;
    for (const n of niveles) {
      assert.ok(!previo || n <= previo + 1, `${f}: salto de h${previo} a h${n}`);
      previo = n;
    }
  }
});
