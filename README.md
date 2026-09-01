# NonFap — Septiembre sin Fap 2026

Web estática hecha con **HTML + CSS + JavaScript puro**, usando **Supabase** como backend compartido.

## Qué incluye

- Ranking público de participantes que siguen en pie.
- Memorial público de soldados caídos.
- Login con **usuario + contraseña** (sin pedir emails reales).
- Sesión persistente en el navegador.
- Cada usuario logueado puede:
  - registrar su propia caída;
  - cambiar su nombre visible;
  - cambiar su contraseña;
  - subir/cambiar su foto de perfil.
- Un usuario **no puede modificar los datos de otro**, incluso intentando hacerlo desde DevTools, gracias a Row Level Security (RLS).
- Fotos guardadas en Supabase Storage.

---

# 1. Crear el proyecto en Supabase

1. Entrá a https://supabase.com y creá un proyecto.
2. Esperá a que termine de provisionarse.
3. En el dashboard abrí **SQL Editor**.
4. Copiá todo el contenido de `supabase-setup.sql` y ejecutalo.

Ese script crea:

- `profiles`
- `falls`
- políticas RLS
- trigger para crear perfiles automáticamente
- bucket público `avatars`
- políticas de seguridad para las fotos

> No hace falta crear las tablas manualmente desde la UI.

---

# 2. Configurar la web

En Supabase buscá los datos de API del proyecto (Project URL y Publishable/Anon key).

Abrí `supabase-config.js` y reemplazá:

```js
export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "TU_PUBLISHABLE_KEY";
```

por tus valores reales.

### ¿Es seguro poner esa key en JavaScript?

Sí: la **Publishable/Anon key** está pensada para usarse en el frontend. La seguridad real la aplican las políticas RLS configuradas en `supabase-setup.sql`.

**Nunca pongas la `service_role` / secret key dentro de `supabase-config.js`, `app.js` ni ningún archivo que vayas a desplegar.**

---

# 3. Crear los 16 usuarios iniciales

Para evitar cargarlos manualmente dejé `seed-users.mjs`.

Necesitás **Node.js 18 o superior** únicamente para ejecutar este script una vez.

Buscá en Supabase tu **service_role key** (API Keys / Legacy API keys, según la interfaz de tu proyecto).

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

Deberías ver algo como:

```text
✓ bistocco (...)
✓ ruben (...)
✓ dromuegue (...)
...
```

Una vez terminado, **no necesitás `seed-users.mjs` para que la página funcione**.

Las claves generadas están en:

```text
claves-iniciales.txt
```

Podés pasarle a cada participante únicamente su usuario y contraseña.

## Recomendación

Después de crear los usuarios, desactivá el registro público de usuarios en la configuración de Auth de Supabase. La web no tiene botón de registro, pero así evitás altas externas innecesarias.

---

# 4. Probar localmente

Como ahora `app.js` usa módulos JavaScript, no conviene abrir `index.html` directamente con doble click.

Desde la carpeta del proyecto ejecutá:

```bash
python -m http.server 8000
```

O, si tu instalación usa `python3`:

```bash
python3 -m http.server 8000
```

Abrí:

```text
http://localhost:8000
```

Probá iniciar sesión con alguna cuenta de `claves-iniciales.txt`.

---

# 5. Deploy

La aplicación sigue siendo **completamente estática**. No necesitás desplegar Node.js ni ningún backend propio.

## Opción A — GitHub Pages

1. Creá un repositorio en GitHub.
2. Subí:

```text
index.html
styles.css
app.js
supabase-config.js
```

`README.md` también puede quedar en el repo.

**No subas claves administrativas.** `seed-users.mjs` no contiene la service role key, así que puede estar en el repo, pero tampoco es necesario desplegarlo.

3. En GitHub entrá en:

```text
Settings → Pages
```

4. Seleccioná el branch principal (`main`) y la carpeta raíz.
5. Guardá.
6. GitHub te dará una URL similar a:

```text
https://tuusuario.github.io/nonfap/
```

## Opción B — Netlify

La más rápida si no querés usar GitHub:

1. Entrá a Netlify.
2. Elegí deploy manual / drag & drop.
3. Arrastrá la carpeta `nonfap`.
4. Listo.

No hace falta configurar comandos de build.

## Opción C — Vercel

1. Subí el proyecto a GitHub.
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

Ese email es técnico y el participante nunca necesita conocerlo ni utilizarlo.

### Nombre visible

Es lo que aparece en el ranking y puede cambiarse estando logueado.

Por ejemplo:

```text
Bistocco → Último sobreviviente
```

Cambiar el nombre visible **no cambia el usuario de login**.

---

# Seguridad

Las reglas principales están en `supabase-setup.sql`:

- Cualquiera puede leer perfiles y caídas para visualizar el ranking.
- Solo un usuario autenticado puede actualizar su propio perfil.
- Solo un usuario autenticado puede registrar una caída con su propio `user_id`.
- `falls.user_id` es único: cada participante puede caer una sola vez.
- Las fotos se suben dentro de una carpeta asociada al UUID del usuario.
- Un usuario no puede escribir dentro de la carpeta de fotos de otro usuario.

Por esto, esconder botones en el frontend **no es la medida de seguridad principal**. La restricción está aplicada en Supabase/Postgres.

---

# Archivos

```text
nonfap/
├── index.html                 # interfaz
├── styles.css                # diseño negro/naranja
├── app.js                    # lógica y conexión Supabase
├── supabase-config.js        # URL + publishable key
├── supabase-setup.sql        # tablas, RLS y Storage
├── seed-users.mjs            # alta inicial de participantes
├── claves-iniciales.txt      # credenciales para repartir
└── README.md                 # este instructivo
```

---

# Cambiar participantes antes de crear usuarios

Si todavía no ejecutaste `seed-users.mjs`, simplemente modificá el array `users` dentro de ese archivo y actualizá `claves-iniciales.txt`.

Después ejecutá nuevamente el paso 3.

Si los usuarios ya fueron creados en Supabase, no vuelvas a ejecutar el script con los mismos nombres porque Auth rechazará emails duplicados.

---

# Flujo final

```text
Visitante
   ↓
Ve ranking + soldados caídos

Participante
   ↓
Login usuario/contraseña
   ↓
┌─────────────────────────────┐
│ Mi perfil                   │
│ - nombre visible            │
│ - foto                      │
│ - cambiar contraseña        │
└─────────────────────────────┘
             +
┌─────────────────────────────┐
│ Registrar caída             │
│ - día                       │
│ - link opcional             │
│ - motivo                    │
└─────────────────────────────┘
   ↓
Supabase
   ↓
Ranking actualizado para todos
```
