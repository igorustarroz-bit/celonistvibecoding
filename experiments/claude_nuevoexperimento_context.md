# Cómo se hace un experimento nuevo — el proceso, de principio a fin

> Este documento vive en `experiments/` junto a los demas `claude_*_context.md`.
> **Las rutas de este doc son relativas a `experiments/`.**
> Es el PUNTO DE ENTRADA: si vas a montar un experimento nuevo, empieza aquí.

Todo experimento sigue siempre el mismo camino: se **guarda la página del cliente
desde el navegador**, se le aplica la **limpieza anti-phishing**, se le aplica el
**nav-fx**, se construye encima el efecto nuevo y se enlaza en el índice.

Docs que hay que tener a mano (no se duplican aquí):
- `claude_antiphishing_context.md` — reglas obligatorias de limpieza + barrido de
  verificación. **No es opcional**: el 2026-09-02 Google marcó el site como engañoso
  por saltarse esto.
- `claude_navfx_context.md` — el efecto del menú, común a todas las páginas.
- El doc del experimento del que copies mecánica (`claude_globe_context.md`,
  `claude_datacore_context.md`).

---

## 1. Guardar la página desde el navegador

En Chrome, sobre la página real (p. ej. `https://www.celonis.com/<ruta>/`):
`Cmd+S` → formato **"Página web, completa"**. Produce dos cosas:

```
<Nombre de la pagina>.html
<Nombre de la pagina>_files/        CSS, JS de maquetación, imágenes, vídeo
```

- **No** usar "Solo HTML" ni imprimir a PDF: sin los CSS/JS de maquetación y los
  assets el prototipo no se puede juzgar en contexto, que es para lo que sirve.
- Guardar directamente dentro de la carpeta del experimento nuevo (paso 2).
- Si la página tiene vídeo de hero, comprobar que el `.mp4` ha bajado: es la
  referencia de contraste y ritmo para replicarlo.

## 2. Carpeta y nombres

La carpeta se llama por **lo que ES el experimento**, en inglés y en kebab-case,
nunca por la página del cliente (`3d-globe`, no `celonis-home`).

```
experiments/<nombre-experimento>/
  original.html        copia INTACTA (con vídeo), solo limpiada de tracking
  index.html           copia de trabajo: aquí va el experimento
  original/            los assets del navegador (el `<Nombre>_files/` renombrado)
  <tema>-fx/           nuestro JS propio (o anime-<tema>/, como en los actuales)
```

Las dos páginas (`index.html` y `original.html`) comparten la carpeta de assets, así
que se pueden comparar lado a lado: el original con vídeo y la réplica.

⚠️ Variación histórica: `datacore/` conservó los nombres del navegador
(`Data Core _ Celonis.html` + `Data Core _ Celonis_files/`) y `3d-globe/` renombró la
carpeta a `original/`. Para los nuevos, usar `original/`.

## 3. Limpieza anti-phishing — ANTES del primer push

Aplicar **todo** el apartado 2 de `claude_antiphishing_context.md`. Lo que más se
olvida, en orden de peligro:

1. Los bloques `<script type="application/ld+json">` (declaran la identidad de la marca).
2. `<link rel="canonical">` y los `<meta property="og:*">` / `<meta name="twitter:*">`.
3. `<meta name="robots" content="noindex,nofollow">` + `<title>`/`description` propios
   (`Vibecoding prototype - <qué es> (unofficial)`).
4. Todos los `<a href>` que empiecen por `http`, `//` o `/` → `href="#"`. Los de
   **login y signup primero** (marca copiada + enlace de login = phishing de manual).
5. Fuera iframes de formulario y chat, y **todos** los scripts y píxeles de analítica,
   incluidos los snippets inline. Se conservan `aem.js`, `scripts.js`, `main.*.js`,
   `*.chunk.js` (maquetación, no tracking).
6. Los ficheros de tracking NO se borran del disco: `git rm --cached` + regla explícita
   en `.gitignore` (las rutas del `.gitignore` van con el prefijo
   `/experiments/<nombre>/...`; al renombrar o mover una carpeta hay que actualizarlas).
7. **No** poner banner en la página del experimento; el descargo va solo en el índice.

Y el **barrido de verificación** del apartado 4 de ese doc antes de cada push, más la
comprobación en el navegador de que todas las peticiones de red son same-origin.

## 4. Aplicar nav-fx

Añadir en **todas** las páginas guardadas de la carpeta (index y original), justo
antes de `</body>`:

```html
<script src="../nav-fx.js?v=N"></script>
```

- El script es único y común: `experiments/nav-fx.js`. No copiarlo a la carpeta.
- Requisito: el `header.css` guardado ya trae `.nav-hidden` y `.cloned-cta` — el de
  celonis.com sí; si una página nueva no los trae, ver `claude_navfx_context.md`.
- Al tocar el JS hay que **subir el `?v=`** en las 6+ páginas: Pages cachea ~10 min.

## 5. Construir el efecto

El JS propio va en la subcarpeta del experimento, cargado desde `index.html` con su
propio `?v=`. Método que ha funcionado siempre (detallado en
`claude_sitefx_context.md`): el site vivo es AEM Edge Delivery, así que se leen los
bloques en `celonis.com/dist/blocks/<bloque>/<bloque>.js` y los tokens de movimiento
de `dist/chunks/tokens.js`, y se REIMPLEMENTA en vanilla JS; luego se compara
muestreando transforms cada 50 ms en vivo vs réplica a 1440×900.

Reglas de Igor: **nada en español en la interfaz** (UI en inglés; docs y comentarios
en español), y los parámetros visuales se afinan en la consola de DevTools antes de
fijarlos en el código.

## 6. Enlazar en el índice raíz

En `/index.html`, un bloque por experimento:

```html
<article class="exp">
  <span class="date">Sep 3, 2026</span>
  <div class="num">Experiment N</div>
  <h2>Título corto de qué se ha hecho</h2>
  <p>Dos o tres líneas: qué se sustituye y con qué.</p>
  <div class="links">
    <a href="experiments/<nombre>/index.html" target="_blank" rel="noopener">Open experiment</a>
    <a class="alt" href="experiments/<nombre>/original.html" target="_blank" rel="noopener">Saved original (with video)</a>
  </div>
</article>
```

Todos los enlaces del índice abren en **ventana nueva** (`target="_blank"
rel="noopener"`). El índice es la única navegación: las páginas de experimento no se
enlazan entre sí.

## 7. Publicar

```bash
cd ~/repo/celonistvibecoding
git add -A && git commit -m "..."
TOK=$(tr -d ' \n\r' < github-token.txt)
git push "https://x-access-token:${TOK}@github.com/igorustarroz-bit/celonisvibecoding.git" main
```

`github-token.txt` es un PAT fine-grained y **nunca** se sube (está en `.gitignore`).
URL resultante: `https://igorustarroz-bit.github.io/celonisvibecoding/experiments/<nombre>/index.html`.

Desde Cowork: `rm` en la carpeta montada está bloqueado por defecto (hay que pedir
permiso de borrado); `mv` y `git mv` funcionan. Y para comprobar un publish reciente,
usar el navegador —WebFetch cachea 15 min por URL—.

## 8. Documentar el experimento

Crear `experiments/claude_<tema>_context.md` con las decisiones cerradas, los valores
exactos y los fallos ya cometidos. **Todos los docs de contexto viven en
`experiments/`**, al nivel de las carpetas, nunca dentro de una de ellas, y sus rutas
son relativas a `experiments/`.

## Checklist final antes de decir "publicado"

- [ ] Barrido anti-phishing limpio (apartado 4 del doc de anti-phishing).
- [ ] Peticiones de red de la página publicada: todas same-origin.
- [ ] `<script src="../nav-fx.js?v=N">` en todas las páginas de la carpeta, con el
      `?v=` subido si se tocó el JS.
- [ ] Enlaces nuevos en el índice, con `target="_blank" rel="noopener"`.
- [ ] Reglas de `.gitignore` con el prefijo correcto para el tracking de la carpeta nueva.
- [ ] La página publicada abierta en el navegador y comprobada a 1440×900 y en móvil.
- [ ] `experiments/claude_<tema>_context.md` escrito.
