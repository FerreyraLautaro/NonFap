# NonFap â€” Septiembre sin Fap 2026

Web estÃ¡tica hecha con **HTML + CSS + JavaScript puro**, usando **Supabase** como backend compartido.

## QuÃ© incluye

- Ranking pÃºblico de participantes que siguen en pie.
- SecciÃ³n `Novedades` para anunciar features nuevas con tono adulto/humorÃ­stico.
- Memorial pÃºblico de soldados caÃ­dos.
- Login con **usuario + contraseÃ±a** (sin pedir emails reales).
- SesiÃ³n persistente en el navegador.
- Cada usuario logueado puede:
  - registrar su propia caÃ­da;
  - cambiar su nombre visible;
  - cambiar su contraseÃ±a;
  - subir/cambiar su foto de perfil;
  - subir/cambiar su portada de perfil, incluyendo GIF.
- Un usuario **no puede modificar los datos de otro**, incluso intentando hacerlo desde DevTools, gracias a Row Level Security (RLS).
- Fotos guardadas en `avatars` y portadas guardadas en `covers` dentro de Supabase Storage.

---

# 1. Crear el proyecto en Supabase

1. EntrÃ¡ a https://supabase.com y creÃ¡ un proyecto.
2. EsperÃ¡ a que termine de provisionarse.
3. En el dashboard abrÃ­ **SQL Editor**.
4. CopiÃ¡ todo el contenido de `supabase-setup.sql` y ejecutalo.

Ese script crea:

- `profiles`
- `falls`
- polÃ­ticas RLS
- trigger para crear perfiles automÃ¡ticamente
- bucket pÃºblico `avatars`
- polÃ­ticas de seguridad para las fotos

> No hace falta crear las tablas manualmente desde la UI.

> Si ya habias ejecutado este setup antes, volve a ejecutar `supabase-setup.sql`: es idempotente y agrega `profiles.cover_url` junto con el bucket `covers` para las portadas GIF.

---

# 2. Configurar la web

En Supabase buscÃ¡ los datos de API del proyecto (Project URL y Publishable/Anon key).

AbrÃ­ `supabase-config.js` y reemplazÃ¡:

```js
export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "TU_PUBLISHABLE_KEY";
```

por tus valores reales.

### Â¿Es seguro poner esa key en JavaScript?

SÃ­: la **Publishable/Anon key** estÃ¡ pensada para usarse en el frontend. La seguridad real la aplican las polÃ­ticas RLS configuradas en `supabase-setup.sql`.

**Nunca pongas la `service_role` / secret key dentro de `supabase-config.js`, `app.js` ni ningÃºn archivo que vayas a desplegar.**

---

# 3. Crear los 16 usuarios iniciales

Para evitar cargarlos manualmente, versionamos `seed-users.example.mjs` como plantilla segura.
Copiala en tu maquina como `seed-users.mjs`, completa las claves reales ahi y mantene ese archivo fuera de git.

NecesitÃ¡s **Node.js 18 o superior** Ãºnicamente para ejecutar este script una vez.

BuscÃ¡ en Supabase tu **service_role key** (API Keys / Legacy API keys, segÃºn la interfaz de tu proyecto).

### Linux / macOS

```bash
export SUPABASE_URL="https://TU-PROYECTO.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
node seed-users.mjs
```

### Windows PowerShell

```powershell
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
node seed-users.mjs
```

DeberÃ­as ver algo como:

```text
âœ“ bistocco (...)
âœ“ ruben (...)
âœ“ dromuegue (...)
...
```

`seed-users.mjs` contiene claves reales de usuarios, por eso esta en `.gitignore`. Versiona solamente `seed-users.example.mjs`.

Una vez terminado, **no necesitas `seed-users.mjs` para que la pagina funcione**.

Las claves generadas estÃ¡n en:

```text
claves-iniciales.txt
```

PodÃ©s pasarle a cada participante Ãºnicamente su usuario y contraseÃ±a.

## RecomendaciÃ³n

DespuÃ©s de crear los usuarios, desactivÃ¡ el registro pÃºblico de usuarios en la configuraciÃ³n de Auth de Supabase. La web no tiene botÃ³n de registro, pero asÃ­ evitÃ¡s altas externas innecesarias.

---

# 4. Probar localmente

Como ahora `app.js` usa mÃ³dulos JavaScript, no conviene abrir `index.html` directamente con doble click.

Desde la carpeta del proyecto ejecutÃ¡:

```bash
python -m http.server 8000
```

O, si tu instalaciÃ³n usa `python3`:

```bash
python3 -m http.server 8000
```

AbrÃ­:

```text
http://localhost:8000
```

ProbÃ¡ iniciar sesiÃ³n con alguna cuenta de `claves-iniciales.txt`.

---

# 5. Deploy

La aplicaciÃ³n sigue siendo **completamente estÃ¡tica**. No necesitÃ¡s desplegar Node.js ni ningÃºn backend propio.

## OpciÃ³n A â€” GitHub Pages

1. CreÃ¡ un repositorio en GitHub.
2. SubÃ­:

```text
index.html
styles.css
app.js
supabase-config.js
favicon.svg
```

Tambien podes subir `seed-users.example.mjs` como plantilla administrativa, pero **no subas `seed-users.mjs` ni `claves-iniciales.txt`**.

`README.md` tambiÃ©n puede quedar en el repo.

**No subas claves administrativas ni credenciales de usuarios.** `seed-users.mjs` y `claves-iniciales.txt` quedan fuera de git; `seed-users.example.mjs` es la plantilla segura.

3. En GitHub entrÃ¡ en:

```text
Settings â†’ Pages
```

4. SeleccionÃ¡ el branch principal (`main`) y la carpeta raÃ­z.
5. GuardÃ¡.
6. GitHub te darÃ¡ una URL similar a:

```text
https://tuusuario.github.io/nonfap/
```

## OpciÃ³n B â€” Netlify

La mÃ¡s rÃ¡pida si no querÃ©s usar GitHub:

1. EntrÃ¡ a Netlify.
2. ElegÃ­ deploy manual / drag & drop.
3. ArrastrÃ¡ la carpeta `nonfap`.
4. Listo.

No hace falta configurar comandos de build.

## OpciÃ³n C â€” Vercel

1. SubÃ­ el proyecto a GitHub.
2. Importalo en Vercel.
3. Framework preset: **Other / Static**.
4. No agregues build command.
5. Deploy.

---

# Usuarios y nombres

El sistema distingue dos cosas:

### Usuario

Es fijo y sirve solamente para entrar.

Ejemplo:

```text
bistocco
```

Internamente se transforma en:

```text
bistocco@nonfap.example.com
```

Ese email es tÃ©cnico y el participante nunca necesita conocerlo ni utilizarlo.

### Nombre visible

Es lo que aparece en el ranking y puede cambiarse estando logueado.

Por ejemplo:

```text
Bistocco â†’ Ãšltimo sobreviviente
```

Cambiar el nombre visible **no cambia el usuario de login**.

---

# Seguridad

Las reglas principales estÃ¡n en `supabase-setup.sql`:

- Cualquiera puede leer perfiles y caÃ­das para visualizar el ranking.
- Solo un usuario autenticado puede actualizar su propio perfil.
- Solo un usuario autenticado puede registrar una caÃ­da con su propio `user_id`.
- `falls.user_id` es Ãºnico: cada participante puede caer una sola vez.
- Las fotos y portadas se suben dentro de una carpeta asociada al UUID del usuario.
- Un usuario no puede escribir dentro de la carpeta de fotos de otro usuario.

Por esto, esconder botones en el frontend **no es la medida de seguridad principal**. La restricciÃ³n estÃ¡ aplicada en Supabase/Postgres.

---

# Archivos

```text
nonfap/
|-- index.html                 # interfaz
|-- styles.css                # diseno negro/naranja
|-- app.js                    # logica y conexion Supabase
|-- supabase-config.js        # URL + publishable key
|-- supabase-setup.sql        # tablas, RLS y Storage
|-- seed-users.example.mjs    # plantilla segura para alta inicial
|-- seed-users.mjs            # seed local con claves reales, ignorado por git
|-- claves-iniciales.txt      # credenciales para repartir, ignorado por git
`-- README.md                 # este instructivo
```

---

# Cambiar participantes antes de crear usuarios

Si todavia no ejecutaste el seed, copia `seed-users.example.mjs` como `seed-users.mjs`, completa el array `users` con las claves reales y actualiza `claves-iniciales.txt` localmente.

Despues ejecuta nuevamente el paso 3.

Si los usuarios ya fueron creados en Supabase, no vuelvas a ejecutar el script con los mismos nombres porque Auth rechazarÃ¡ emails duplicados.

---

# Flujo final

```text
Visitante
   â†“
Ve ranking + soldados caÃ­dos

Participante
   â†“
Login usuario/contraseÃ±a
   â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Mi perfil                   â”‚
â”‚ - nombre visible            â”‚
â”‚ - foto                      â”‚
â”‚ - cambiar contraseÃ±a        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             +
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Registrar caÃ­da             â”‚
â”‚ - dÃ­a                       â”‚
â”‚ - link opcional             â”‚
â”‚ - motivo                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
   â†“
Supabase
   â†“
Ranking actualizado para todos
```


## Gamificacion: Radio Lactea, rachas e insignias

Cambios separados en 3 tareas para Supabase:

1. **Radio Lactea**
   - Tabla `radio_messages`: comentarios anonimos de maximo 250 caracteres. Se crean por RPC (`create_radio_message`) para que la fecha no pueda falsificarse desde el navegador.
   - Tabla `radio_message_likes`: likes por usuario y mensaje. No se expone publicamente quien escribio ni quien likeo; el feed sale por RPC `get_radio_feed`.
   - El top diario muestra como maximo 3 comentarios con al menos 1 like; el ganador se calcula por cantidad de likes y, en empate, gana el mensaje mas antiguo.
   - El premio es +10 puntos, calculado de forma privada en `get_my_score()`.

2. **Check-in diario**
   - Tabla `daily_checkins`: un check-in por usuario y dia. Se crea por RPC (`create_daily_checkin`) para que fecha y dia del reto sean server-owned.
   - Cada check-in suma +5 puntos.
   - Bonos por mejor racha consecutiva: 5 dias +20, 10 dias +50, 20 dias +100.
   - Los puntos se ven solo en el perfil del usuario autenticado; no hay ranking publico de puntos.

3. **Insignias y fueguito**
   - Las insignias se calculan en frontend usando dias vivo del reto y caidas registradas.
   - El fueguito se calcula usando la racha de `daily_checkins`.
   - No requiere columnas extra.

Para activar estas features en Supabase, ejecutar el bloque final de `supabase-setup.sql` desde `-- Tarea 1: Radio Lactea...` en adelante. Es idempotente y no modifica ni borra datos existentes. Importante: las inserciones directas de comentarios y check-ins quedan sin policy de insert; la app usa RPCs para preservar integridad.

## Sesion local de 3 dias

Despues de iniciar sesion, el navegador guarda una ventana local de 3 dias en `localStorage` (`nonfap_session_expires_at`).

- Si el usuario vuelve a abrir la web antes de que venza, la ventana se renueva por otros 3 dias.
- Si pasan 3 dias sin volver, al entrar se cierra la sesion automaticamente.
- Si el usuario toca **Salir**, la ventana local se borra en el momento.

Esto complementa la sesion persistente de Supabase: Supabase puede refrescar tokens, pero la app impone este limite local por dispositivo/navegador.
