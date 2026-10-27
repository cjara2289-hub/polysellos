#!/usr/bin/env python3
"""Verificador del sitio de Polysellos. Solo lectura, solo biblioteca estandar.

Uso, desde la raiz del proyecto:  python3 scripts/check_site.py
Sale con codigo 1 si algo falla. Complementa a validar.py (reglas de marca, FAQ, secretos):
este revisa la estructura del sitio entero, no solo index.html.
"""
import json
import os
import re
import sys

RAIZ = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
ORIGEN = "https://polysellos.pages.dev"
SALTAR = {".git", ".cloudflare", ".wrangler", "node_modules", "blueprints", "dist"}
# Cifras y frases que ya NO son validas (ficha K102 manda desde 2026-10-27).
PROHIBIDAS = [
    "380 %", "380%", "18 MPa", "≤4 s", "≤4 segundos", "poliurea pura",
    "transitable el mismo día", "0 % permeabilidad", "0% permeabilidad",
    "curado casi instantáneo", "vida útil",
]
errores = []


def err(msg):
    errores.append(msg)


def leer(ruta):
    with open(os.path.join(RAIZ, ruta), encoding="utf-8") as f:
        return f.read()


def existe(ruta):
    return os.path.exists(os.path.join(RAIZ, ruta))


paginas = sorted(f for f in os.listdir(RAIZ) if f.endswith(".html"))
if "index.html" not in paginas:
    err("falta index.html")
html = {p: leer(p) for p in paginas}


def limpio(s):
    """El HTML sin scripts ni comentarios: lo que el visitante realmente recibe como marcado."""
    return re.sub(r"<script\b.*?</script>|<!--.*?-->", "", s, flags=re.S)


def indexable(p):
    return not re.search(r'<meta name="robots" content="[^"]*noindex', html[p])


def url_de(p):
    return ORIGEN + "/" if p == "index.html" else ORIGEN + "/" + p[: -len(".html")]


# ---------------------------------------------------------------- cabeza de cada pagina
descripciones = {}
for p, s in html.items():
    if 'lang="es-PA"' not in s:
        err(f"{p}: falta lang=\"es-PA\"")
    t = re.search(r"<title>(.*?)</title>", s, re.S)
    if not t or not t.group(1).strip():
        err(f"{p}: falta <title>")
    elif len(t.group(1).strip()) > 75:
        err(f"{p}: <title> de {len(t.group(1).strip())} caracteres (maximo 75)")
    if len(re.findall(r"<h1[\s>]", s)) != 1:
        err(f"{p}: debe tener exactamente un h1")
    if indexable(p):
        d = re.search(r'<meta name="description" content="([^"]*)"', s)
        if not d:
            err(f"{p}: falta meta description")
        else:
            n = len(d.group(1))
            if not 50 <= n <= 170:
                err(f"{p}: meta description de {n} caracteres (entre 50 y 170)")
            if d.group(1) in descripciones:
                err(f"{p}: meta description repetida con {descripciones[d.group(1)]}")
            descripciones[d.group(1)] = p
        c = re.search(r'<link rel="canonical" href="([^"]*)"', s)
        if not c:
            err(f"{p}: falta canonical")
        elif c.group(1) != url_de(p):
            err(f"{p}: canonical {c.group(1)} debe ser {url_de(p)} (sin .html: Cloudflare lo redirige)")
    for i, b in enumerate(re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S), 1):
        try:
            json.loads(b)
        except ValueError as e:
            err(f"{p}: JSON-LD #{i} invalido: {e}")
    for tag in re.findall(r"<img\b[^>]*>", limpio(s)):
        src = re.search(r'src="([^"]*)"', tag)
        nombre = src.group(1) if src else "?"
        if " alt=" not in tag:
            err(f"{p}: <img {nombre}> sin alt")
        if " width=" not in tag or " height=" not in tag:
            err(f"{p}: <img {nombre}> sin width y height")

# ---------------------------------------------------------------- cabecera y pie compartidos
def bloque(s, patron):
    m = re.search(patron, s, re.S)
    return re.sub(r"\s+", " ", m.group(0)).strip() if m else None


internas = [p for p in paginas if p != "index.html"]
for nombre, patron in (("header", r'<header class="site".*?</header>'), ("footer", r"<footer>.*?</footer>")):
    vistos = {}
    for p in internas:
        b = bloque(html[p], patron)
        if b is None:
            err(f"{p}: falta <{nombre}>")
            continue
        vistos.setdefault(b, []).append(p)
    if len(vistos) > 1:
        err(f"<{nombre}> distinto entre paginas internas: " + " | ".join(",".join(v) for v in vistos.values()))

# ---------------------------------------------------------------- enlaces internos y anclas
def destino(href):
    ruta = href.split("#")[0].split("?")[0]
    if ruta in ("", "/"):
        return "index.html"
    ruta = ruta.lstrip("/")
    for cand in (ruta, ruta + ".html", os.path.join(ruta, "index.html")):
        if existe(cand) and os.path.isfile(os.path.join(RAIZ, cand)):
            return cand
    return None


for p, s0 in html.items():
    s = limpio(s0)
    for href in set(re.findall(r'(?:href|src)="([^"]+)"', s)):
        if re.match(r"(https?:|mailto:|tel:|data:|//)", href) or href.startswith("#") and len(href) == 1:
            continue
        if href.startswith("#"):
            if f'id="{href[1:]}"' not in s:
                err(f"{p}: ancla {href} sin destino")
            continue
        d = destino(href)
        if d is None:
            err(f"{p}: enlace roto {href}")
            continue
        if href.endswith(".html") or ".html#" in href:
            err(f"{p}: enlace {href} termina en .html (usar la URL sin extension)")
        if "#" in href and d.endswith(".html"):
            ancla = href.split("#", 1)[1]
            if ancla and f'id="{ancla}"' not in html.get(d, leer(d)):
                err(f"{p}: ancla #{ancla} no existe en {d}")

# ---------------------------------------------------------------- sitemap
if not existe("sitemap.xml"):
    err("falta sitemap.xml")
else:
    locs = re.findall(r"<loc>(.*?)</loc>", leer("sitemap.xml"))
    for l in locs:
        if not l.startswith(ORIGEN):
            err(f"sitemap: {l} no es de {ORIGEN}")
        elif l.endswith(".html"):
            err(f"sitemap: {l} termina en .html")
        elif destino(l[len(ORIGEN):] or "/") is None:
            err(f"sitemap: {l} no corresponde a ningun archivo")
    for p in paginas:
        if indexable(p) and url_de(p) not in locs:
            err(f"sitemap: falta {url_de(p)}")

# ---------------------------------------------------------------- frases y cifras prohibidas
for dp, dns, fs in os.walk(RAIZ):
    dns[:] = [d for d in dns if d not in SALTAR and d != "tests" and d != "scripts"]
    for f in fs:
        if not f.endswith((".html", ".css", ".js", ".txt", ".xml", ".cloudflare")):
            continue
        rel = os.path.relpath(os.path.join(dp, f), RAIZ)
        texto = open(os.path.join(dp, f), encoding="utf-8").read()
        for frase in PROHIBIDAS:
            if frase in texto:
                err(f"{rel}: contiene \"{frase}\" (ya no es valido)")


# ---------------------------------------------------------------- accesibilidad estatica
for p, s0 in html.items():
    s = limpio(s0)
    if 'class="skip-link"' not in s:
        err(f"{p}: falta el enlace 'Ir al contenido' (class=\"skip-link\")")
    if 'id="contenido"' not in s:
        err(f"{p}: falta id=\"contenido\" en <main>, destino del enlace 'Ir al contenido'")
    for tag in re.findall(r"<(?:input|select|textarea)\b[^>]*>", s):
        if re.search(r'type="(hidden|checkbox)"', tag) or 'tabindex="-1"' in tag:
            continue
        ident = re.search(r'\bid="([^"]+)"', tag)
        if "aria-label" in tag:
            continue
        if not ident or f'for="{ident.group(1)}"' not in s:
            err(f"{p}: campo sin etiqueta asociada: {tag[:70]}")
    for b in re.findall(r"<button\b[^>]*>(.*?)</button>", s, re.S):
        if not re.sub(r"<[^>]+>", "", b).strip():
            err(f"{p}: boton sin texto")
if existe("styles.css"):
    css = leer("styles.css")
    if "prefers-reduced-motion" not in css:
        err("styles.css: falta @media (prefers-reduced-motion)")
    if ":focus-visible" not in css:
        err("styles.css: falta :focus-visible")
else:
    err("falta styles.css")

# ---------------------------------------------------------------- FAQ visible igual al JSON-LD, en cada pagina
for p, s0 in html.items():
    ld = [json.loads(b) for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s0, re.S)
          if b.strip().startswith("{")]
    faq = next((d for d in ld if d.get("@type") == "FAQPage"), None)
    visibles = re.findall(r"<summary><h3>(.*?)</h3>.*?</summary>\s*<p>(.*?)</p>", s0, re.S)
    if faq is None:
        if visibles:
            err(f"{p}: hay preguntas visibles pero no FAQPage en el JSON-LD")
        continue
    qs = faq["mainEntity"]
    if len(qs) != len(visibles):
        err(f"{p}: FAQ con {len(visibles)} visibles y {len(qs)} en JSON-LD")
        continue
    for q, (vq, va) in zip(qs, visibles):
        if q["name"] != vq.strip() or q["acceptedAnswer"]["text"] != va.strip():
            err(f"{p}: FAQ desalineado: {vq.strip()[:50]}")

# ---------------------------------------------------------------- llms.txt (si existe, todas sus URLs existen)
if existe("llms.txt"):
    for u in re.findall(r"\((https://polysellos\.pages\.dev[^)\s]*)\)", leer("llms.txt")):
        if destino(u[len(ORIGEN):] or "/") is None:
            err(f"llms.txt: {u} no corresponde a ningun archivo")

# ---------------------------------------------------------------- peso de imagenes
if existe("assets"):
    for dp, _, fs in os.walk(os.path.join(RAIZ, "assets")):
        for f in fs:
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")) and not f.startswith("og-"):
                kb = os.path.getsize(os.path.join(dp, f)) // 1024
                if kb > 200:
                    err(f"assets/{f}: {kb} KB (maximo 200 KB)")

# ---------------------------------------------------------------- comando de build cubre todo
if not existe("scripts/cloudflare-build.txt"):
    err("falta scripts/cloudflare-build.txt (copia del comando de build de Cloudflare)")
else:
    cmd = leer("scripts/cloudflare-build.txt")
    esperados = paginas + ["styles.css", "robots.txt", "sitemap.xml", "assets"] + (["llms.txt"] if existe("llms.txt") else [])
    for e in esperados:
        if not re.search(r"(?<![\w.-])" + re.escape(e) + r"(?![\w.-])", cmd):
            err(f"scripts/cloudflare-build.txt no copia {e} a dist/")
    if "_headers" not in cmd:
        err("scripts/cloudflare-build.txt no activa las cabeceras (_headers)")

print(f"Verificando sitio: {RAIZ}  ({len(paginas)} paginas)")
for e in errores:
    print("  ERROR ", e)
print(f"\n{len(errores)} error(es)")
sys.exit(1 if errores else 0)
