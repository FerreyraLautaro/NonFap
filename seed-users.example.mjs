// Ejecutar SOLO en tu computadora. No subir la secret/service_role key ni claves reales al frontend/repositorio.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  process.exit(1);
}

const users = [
  ['bistocco','Bistocco','CAMBIAR_ESTA_CLAVE'],
  ['ruben','Ruben','CAMBIAR_ESTA_CLAVE'],
  // Agrega el resto de participantes siguiendo el mismo formato.
];

const adminHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

const listResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, { headers: adminHeaders });
if (!listResponse.ok) {
  console.error('No se pudo consultar la lista de usuarios existentes.');
  process.exit(1);
}

const listResult = await listResponse.json();
const existingEmails = new Set((listResult.users || []).map(user => user.email?.toLowerCase()));

for (const [username, displayName, password] of users) {
  const email = `${username}@nonfap.example.com`;

  if (existingEmails.has(email.toLowerCase())) {
    console.log(`↷ ${username}: ya existe, se omite`);
    continue;
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username, display_name: displayName } })
  });
  const result = await response.json();
  if (!response.ok) console.error(`✗ ${username}:`, result.msg || result.message || result);
  else console.log(`✓ ${username} (${result.id})`);
}
