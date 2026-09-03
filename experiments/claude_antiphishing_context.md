# Estrategia anti-phishing — instrucciones para Claude

> Este documento vive en `experiments/` junto a los demas `claude_*_context.md`
> (todos subidos ahi el 2026-09-03). **Las rutas de este doc son relativas a
> `experiments/`.**

> Documento operativo para futuras sesiones de Claude en este repo.
> Escrito el 2026-09-03, después de que Google levantase el aviso de "sitio engañoso"
> sobre `https://igorustarroz-bit.github.io/celonisvibecoding/`.
> Aplica a **todo el repo**, no solo a `experiments/3d-globe/`.

---

## 1. Qué pasó

El 2026-09-02 Chrome empezó a marcar el site como peligroso. La causa **no** eran los
enlaces salientes (esa fue la primera hipótesis del usuario y era falsa). La causa era que
las copias guardadas de celonis.com **se presentaban como el sitio original**:

- `<link rel="canonical" href="https://www.celonis.com/">`
- `og:title` / `og:url` / `twitter:*` con títulos y URLs de Celonis
- JSON-LD (`schema.org` Organization / WebSite / VideoObject) declarando la identidad de la marca
- `<meta name="robots" content="index">`, o sea indexable
- logo, imágenes y textos de marca servidos desde un dominio gratuito ajeno
- un enlace "Account" a `id.celonis.cloud/user/ui/login` y un "Try for free" a `signup.celonis.com`
- un iframe con formulario de captación (Pardot) y widgets de terceros con píxeles

Marca copiada + enlace a login + captura de datos + indexable = la firma exacta que busca
el clasificador de ingeniería social de Safe Browsing. Se resolvió eliminando la
suplantación, no los enlaces.

---

## 2. Reglas obligatorias al guardar una página nueva del cliente

Cada vez que se baje una copia nueva de una página de celonis.com para un experimento,
aplicar **todo** esto antes del primer push:

### 2.1 Identidad — lo que dispara el clasificador

1. Borrar `<link rel="canonical">` y cualquier `<link>` cuyo `href` apunte a
   `celonis.com` / `celonis.cloud` (incluye `rel="alternate"` con hreflang).
2. Borrar todos los `<meta property="og:*">` y `<meta name="twitter:*">`.
3. Borrar **todos** los bloques `<script type="application/ld+json">`. Este es el que se
   olvida: declara Organization / WebSite / VideoObject con nombre y URL de la marca.
4. Poner `<meta name="robots" content="noindex,nofollow">` en cada página.
5. `<title>` y `<meta name="description">` propios, del tipo
   `Vibecoding prototype - <qué es> (unofficial)`.

### 2.2 Enlaces

6. Todos los `<a href>` que empiecen por `http://`, `https://`, `//` o `/` pasan a
   `href="#"`. Los root-relative también, porque en GitHub Pages resuelven contra la raíz
   del host y dan 404.
7. Prioridad absoluta: los enlaces a `id.celonis.cloud` ("Account") y `signup.celonis.com`
   ("Try for free"). Marca copiada + enlace de login es phishing de manual.
8. **No** tocar `src` de imágenes/vídeo ni `<link rel="stylesheet">` ni `<use href>` de SVG:
   sin ellos los prototipos no se pueden juzgar y no son señal de suplantación.

### 2.3 Captura de datos y terceros

9. Fuera los iframes de: formulario Pardot (`3nkvm5.html`), chat de Qualified
   (`messenger.html`, `q-messenger-frame`), CrazyEgg (`saved_resource*.html`), reproductor
   de Vidyard (`cq3Rs2m6ZoJGv1b3krtPze*.html`). Los HTML de esos iframes se sustituyen por
   un stub con `noindex` que dice "Third-party widget disabled in this unofficial design prototype."
10. Fuera **todos** los scripts y píxeles de analítica y publicidad, tanto los
    `<script src>` locales dentro de `*_files/` u `original/` como **los snippets inline**:
    Adobe Launch (`_satellite["_runScriptN"]`), Facebook (`fbq`), LinkedIn Insight
    (`_linkedin_partner_id`, `lintrk`), Bing UET (`uetq`), AdRoll, RudderStack, StackAdapt,
    Oktopost, HockeyStack, Qualtrics, factors.ai, OneTrust/Optanon, píxeles `<img>` a
    `px.ads.linkedin.com` y compañía.
11. Se **conservan** solo: `aem.js`, `scripts.js`, `main.*.js` y `*.chunk.js` — son la
    maquetación del site, no tracking.
12. Los ficheros de tracking no se borran del disco, se dejan de publicar:
    `git rm --cached` + lista explícita en `.gitignore`. En la limpieza original fueron 184.

### 2.4 Aviso visible

13. El índice (`/index.html`) lleva el descargo completo en texto, arriba y visible.
14. Las páginas de experimento **no** llevan banner. Se probó un banner fijo en cada página
    y el usuario lo quitó porque estropea la valoración visual del prototipo. No volver a
    ponerlo sin que lo pida.

---

## 3. Cómo redactar el descargo

Hanzo (hanzo.es) es el estudio de diseño que construyó celonis.com; Celonis es cliente.
Eso cambia la redacción:

- **NO** escribir "not affiliated with, authorised by, or endorsed by Celonis SE". Es falso.
- **NO** afirmar que Celonis ha autorizado esta publicación. No hay nada por escrito.
- **SÍ**, y es cierto y suficiente: son experimentos de diseño de Hanzo sobre una web de
  cliente, **no es una página oficial de la marca y no la publica ni la respalda**.
- En el banner público **no se nombra al cliente** (decisión del usuario: publicar una
  referencia de cliente necesita su visto bueno). En el formulario de Google sí, porque ese
  formulario es privado.

Texto vigente en `/index.html` y en el `README.md`:

> Unofficial prototype. Front-end design experiments by Hanzo exploring improvements to a
> client website. This is not an official page of the brand shown, it is not published or
> endorsed by them, and it is not a working product. The experiment pages embed locally
> saved copies of public pages purely as a visual backdrop: every outbound link in them is
> disabled, no data is collected and no third-party scripts run. All trademarks belong to
> their respective owners.

---

## 4. Barrido de verificación

Ejecutar **antes de cada push** que toque HTML guardado, y siempre antes de pedir una
revisión a Google. Debe salir limpio: solo el fichero de verificación de Google
(sin robots, es correcto) y el índice (3 enlaces externos legítimos: hanzo.es x2 y el repo).

```bash
cd ~/repo/celonistvibecoding && python3 - <<'PY'
import subprocess,re,io
files=[f for f in subprocess.check_output(["git","ls-files"]).decode().split("\n") if f.lower().endswith(".html")]
bad=0
for f in files:
    h=io.open(f,encoding="utf-8",errors="surrogateescape").read()
    ck={"canonical":len(re.findall(r'rel="canonical"',h,re.I)),
        "og/twitter":len(re.findall(r'property="og:|name="twitter:',h,re.I)),
        "ldjson":len(re.findall(r'application/ld\+json',h,re.I)),
        "iframe":len(re.findall(r'<iframe',h,re.I)),
        "form":len(re.findall(r'<form',h,re.I)),
        "login":len(re.findall(r'type="(?:password|email)"',h,re.I))}
    ext=re.findall(r'<a [^>]*href="((?:https?:|//|/)[^"]*)"',h,re.I)
    rob=len(re.findall(r'name="robots"',h,re.I))
    flags=["%s:%d"%(k,v) for k,v in ck.items() if v]
    if not rob: flags.append("SIN-ROBOTS")
    if ext: flags.append("ext:%d %s"%(len(ext),ext[:3]))
    if flags: bad+=1; print("  !!",f,"->"," | ".join(flags))
print("\nhtml publicados: %d | con senales: %d"%(len(files),bad))
PY
```

Comprobación complementaria, más fiable que leer el HTML: abrir la página publicada en el
navegador y mirar las peticiones de red. **Todas deben ser same-origin.** Si aparece
cualquier host de terceros, ha quedado tracking.

---

## 5. El proceso con Google Search Console

Lo que funcionó, en este orden:

1. **Limpiar primero.** No pedir revisión con algo pendiente: una revisión denegada cuesta
   días y arriesga el estado de *Repeat Offender*.
2. **Verificar la propiedad.** Prefijo de URL `https://igorustarroz-bit.github.io/celonisvibecoding/`,
   método "Archivo HTML". El fichero (`google2f66358341be38aa.html`) va a la raíz del repo y
   se sirve en `/celonisvibecoding/google....html`. **No borrarlo nunca**: si se borra, la
   propiedad se desverifica.
   - Nota: para verificar la raíz del host `https://igorustarroz-bit.github.io/` haría falta
     un repo llamado exactamente `igorustarroz-bit.github.io`. No fue necesario.
   - Propiedad de dominio (`github.io`) es imposible: el DNS no es de Igor.
3. **Leer Problemas de seguridad** (Seguridad y acciones manuales) y comprobar que las URLs
   de ejemplo caen todas bajo `/celonisvibecoding/`. Hay cuatro Pages más en el mismo host
   (`joselito-design-to-code`, `Joselito-Opus-version`, `template-cowork-001`,
   `Test-IA-update`); si alguna URL de ejemplo apuntase ahí, habría que limpiar esa también.
4. **Solicitar revisión** describiendo el problema y las medidas. El texto que se envió,
   para reutilizar si vuelve a pasar:

> I work at Hanzo (hanzo.es), the design studio that built the website in question. This
> repository holds internal front-end prototypes in which we explore proposed improvements
> to that site for our client. It is prototyping work, not a commercial site and not a live
> product.
>
> The flag was our mistake. The prototype pages embed locally saved copies of the client's
> public pages as a visual backdrop, and those copies were still being served with the
> original site's canonical URL, Open Graph/Twitter tags and JSON-LD structured data, so
> they presented themselves as the original site. That was an oversight in how the pages
> were saved, never an attempt to impersonate anyone.
>
> Across all published pages we have: removed every canonical, og:*, twitter:* and JSON-LD
> identity tag; set `<meta name="robots" content="noindex,nofollow">` on every page;
> disabled every outbound link (`href="#"`), including the ones that previously pointed to
> the client's login and sign-up pages; removed all lead-capture forms, chat widgets and
> embedded video players; and removed all third-party analytics and advertising scripts and
> pixels. The pages now issue no third-party network requests and collect no user data of
> any kind. There is no login, sign-up or payment flow anywhere on the site.

5. **Esperar sin tocar las páginas publicadas.** Resuelto en ~1 día.

---

## 6. Errores que Claude no debe repetir

- **No poner un login en JavaScript.** Se pidió (`hanzo` / `hanzo2026`) y se rechazó, con
  razón: en GitHub Pages no hay servidor, así que las credenciales van en el código fuente
  y los ficheros siguen siendo accesibles por URL directa. Pero sobre todo, **una pantalla
  de login delante de páginas que replican celonis.com es exactamente la firma del
  phishing**: habría tumbado la revisión. Si vuelve a surgir, la respuesta es Basic Auth
  real en otro host, nunca un formulario en HTML aquí.
- **No apagar GitHub Pages con una revisión pendiente.** Claude lo recomendó y tuvo que
  rectificar: el revisor necesita recrawlear y ver las páginas ya limpias. Si devuelven 404,
  se lo pones difícil.
- **No crear un repo nuevo ni una dirección nueva para escapar del aviso.** La marca opera
  a nivel de host (`igorustarroz-bit.github.io`), no de ruta, porque `github.io` está en la
  Public Suffix List. Un repo nuevo bajo la misma cuenta sale marcado igual. Y una cuenta
  nueva tampoco: el clasificador mira el contenido.
- **No usar "no me sale el aviso en Safari/Chrome" como prueba de nada.** Safari trabaja
  contra una copia local de prefijos de hash con la cadencia de Apple y va desfasado en
  ambos sentidos. La fuente de verdad es Search Console.
- **Cuidado con el Repeat Offender**: alternar entre publicar y quitar la suplantación
  bloquea la posibilidad de pedir revisión durante 30 días.
- **No decir al cliente que se salte el interstitial.** Si el cliente tiene que abrirlo en
  su equipo, la única salida válida es que la marca esté levantada o servirlo desde un host
  limpio con autenticación.

---

## 7. Si hay que compartirlo con el cliente sin exponerlo en público

Pendiente de montar, decidido pero no hecho:

- **Cloudflare Pages** con Basic Auth en `functions/_middleware.js`. Gratis, host nuevo sin
  historial, y la contraseña en variable de entorno de Cloudflare — **nunca en el repo**.
- **Dominio `labs.hanzo.es`**, no el `*.pages.dev` por defecto: un filtro corporativo deja
  pasar un subdominio de empresa con reputación mucho antes que un `pages.dev` aleatorio.
- **Basic Auth nativo del navegador**, no un formulario maquetado. El diálogo del navegador
  sobre un dominio de Hanzo se lee como "el proveedor protege su entorno".
- Avisar al contacto del cliente por otro canal antes de mandar el enlace. Un empleado de
  Celonis recibiendo un link que parece Celonis y le pide contraseña va a pensar lo peor.

---

## 8. Notas operativas del repo

- El repo publicado es **`celonisvibecoding`**; la carpeta local es **`celonistvibecoding`**
  (con T). El enlace del pie del índice apunta al correcto — no "arreglarlo" al revés.
- `github-token.txt` está en `.gitignore` y **nunca entró en el historial** (verificado con
  `git log --all -- github-token.txt`). No subirlo jamás.
- Push:
  ```bash
  T=$(tr -d ' \n\r' < github-token.txt)
  git push "https://x-access-token:$T@github.com/igorustarroz-bit/celonisvibecoding.git" main
  ```
  El token es un PAT *fine-grained*: **no puede crear repositorios** (403). Si hace falta un
  repo nuevo, lo crea Igor a mano.
- En la carpeta montada git no puede borrar ficheros. Cuando aparezca `.git/index.lock`:
  ```bash
  mv .git/index.lock _to_delete/index.lock.$(date +%s)
  ```
  antes de seguir. Los `warning: unable to unlink .git/objects/tmp_obj_*` son inocuos.
- GitHub Pages tarda ~60 s en reconstruir. Para comprobar la URL publicada hay que usar el
  navegador: `curl` a `github.io` no sale ni desde el equipo local ni desde el contenedor.

---

## 9. Estado a 2026-09-03

- Aviso de Safe Browsing **levantado**.
- 34 páginas HTML publicadas: 0 canonical, 0 og/twitter, 0 JSON-LD, 0 iframes, 0
  formularios, 0 campos de usuario o contraseña, `noindex,nofollow` en todas.
- Únicos enlaces salientes: hanzo.es y el repo de GitHub, ambos en el índice.
- Cero peticiones a terceros en las páginas publicadas (verificado en el navegador).
