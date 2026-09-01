import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const LOGIN_DOMAIN = "nonfap.example.com";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const els = {
  ranking: document.querySelector("#ranking"), fallenList: document.querySelector("#fallenList"),
  aliveCount: document.querySelector("#aliveCount"), fallenCount: document.querySelector("#fallenCount"), survivalRate: document.querySelector("#survivalRate"),
  challengeDay: document.querySelector("#challengeDay"), challengeStatus: document.querySelector("#challengeStatus"),
  guestPanel: document.querySelector("#guestPanel"), memberArea: document.querySelector("#memberArea"),
  openLoginButton: document.querySelector("#openLoginButton"), guestLoginButton: document.querySelector("#guestLoginButton"), logoutButton: document.querySelector("#logoutButton"),
  loginDialog: document.querySelector("#loginDialog"), closeLoginButton: document.querySelector("#closeLoginButton"), loginForm: document.querySelector("#loginForm"), loginUsername: document.querySelector("#loginUsername"), loginPassword: document.querySelector("#loginPassword"), loginMessage: document.querySelector("#loginMessage"),
  sessionUsername: document.querySelector("#sessionUsername"), profileAvatar: document.querySelector("#profileAvatar"), profileCover: document.querySelector("#profileCover"), profileDisplayName: document.querySelector("#profileDisplayName"),
  profileForm: document.querySelector("#profileForm"), displayName: document.querySelector("#displayName"), avatarFile: document.querySelector("#avatarFile"), coverFile: document.querySelector("#coverFile"), profileMessage: document.querySelector("#profileMessage"),
  passwordForm: document.querySelector("#passwordForm"), newPassword: document.querySelector("#newPassword"), repeatPassword: document.querySelector("#repeatPassword"), passwordMessage: document.querySelector("#passwordMessage"),
  fallForm: document.querySelector("#fallForm"), fallDay: document.querySelector("#fallDay"), fallLink: document.querySelector("#fallLink"), fallReason: document.querySelector("#fallReason"), fallMessage: document.querySelector("#fallMessage"), alreadyFallen: document.querySelector("#alreadyFallen"),
  publicProfileDialog: document.querySelector("#publicProfileDialog"), closePublicProfileButton: document.querySelector("#closePublicProfileButton"), publicProfileContent: document.querySelector("#publicProfileContent"),
};

let session = null;
let currentProfile = null;
let profiles = [];
let falls = [];

const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
function safeUrl(value) { if (!value) return null; try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol) ? u.href : null; } catch { return null; } }
function initials(name = "NF") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase(); }
function showMessage(el, message, type = "ok") { el.textContent = message; el.className = `form-message ${type}`; }
function clearMessage(el) { el.textContent = ""; el.className = "form-message"; }
function isConfigured() { return !SUPABASE_URL.includes("TU-PROYECTO") && !SUPABASE_PUBLISHABLE_KEY.includes("TU_PUBLISHABLE_KEY"); }

function avatarMarkup(profile, sizeClass = "") {
  const label = escapeHtml(profile.display_name || profile.username);
  return profile.avatar_url
    ? `<img class="avatar ${sizeClass}" src="${escapeHtml(profile.avatar_url)}" alt="Foto de ${label}">`
    : `<div class="avatar ${sizeClass}">${escapeHtml(initials(profile.display_name || profile.username))}</div>`;
}

function coverMarkup(profile, extraClass = "") {
  return profile.cover_url
    ? `<img class="profile-cover ${extraClass}" src="${escapeHtml(profile.cover_url)}" alt="Portada de ${escapeHtml(profile.display_name || profile.username)}">`
    : `<div class="profile-cover profile-cover-empty ${extraClass}"><span>NONFAP</span></div>`;
}

async function detectImageMime(file) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "image/gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  return "unknown";
}

async function uploadProfileImage(file, kind, maxSize, allowedTypes) {
  const label = kind === "cover" ? "portada" : "imagen";
  if (file.size > maxSize) throw new Error(`La ${label} supera los ${Math.round(maxSize / 1024 / 1024)} MB.`);
  if (!allowedTypes.includes(file.type)) throw new Error(`Formato de ${label} no permitido.`);
  const detectedType = await detectImageMime(file);
  if (detectedType !== file.type) throw new Error(`El archivo dice ser ${file.type}, pero no es una imagen valida de ese tipo. Converti la ${label} y volve a subirla.`);
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${session.user.id}/${kind}-${Date.now()}.${ext}`;
  const bucket = kind === "cover" ? "covers" : "avatars";
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600" });
  if (uploadError) throw new Error(`No se pudo subir la ${kind === "cover" ? "portada" : "foto"}: ${uploadError.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function challengeLabelForFall(fall) {
  return fall ? `Cayó el día ${fall.fall_day}` : "Sigue en pie";
}

function openPublicProfile(userId) {
  const profile = profiles.find(p => p.id === userId);
  if (!profile) return;
  const fall = falls.find(f => f.user_id === userId);
  const link = safeUrl(fall?.link);
  const statusClass = fall ? "fallen-pill" : "alive-pill";
  const statusText = fall ? "💀 Soldado caído" : "🛡️ Sobreviviente";

  els.publicProfileContent.innerHTML = `
    <div class="public-profile-head">
      <div class="public-profile-cover-wrap">${coverMarkup(profile)}</div>
      ${avatarMarkup(profile, "avatar-public")}
      <div>
        <h2>${escapeHtml(profile.display_name || profile.username)}</h2>
        <p class="profile-username">@${escapeHtml(profile.username)}</p>
      </div>
    </div>
    <div class="profile-detail-grid">
      <div><span>Estado</span><strong class="${statusClass}">${statusText}</strong></div>
      <div><span>Reto</span><strong>${escapeHtml(challengeLabelForFall(fall))}</strong></div>
    </div>
    ${fall ? `<div class="profile-fall-box">
      <span>Motivo público</span>
      <p>${escapeHtml(fall.reason)}</p>
      ${link ? `<a class="fallen-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Ver link ↗</a>` : ""}
    </div>` : `<p class="muted-copy">Todavía no registró ninguna caída. Respeto absoluto.</p>`}
  `;
  els.publicProfileDialog.showModal();
}

async function loadPublicData() {
  if (!isConfigured()) {
    els.ranking.innerHTML = `<div class="empty-state">Configurá Supabase para cargar el ranking.</div>`;
    els.fallenList.innerHTML = `<div class="empty-state">Revisá README.md.</div>`;
    return;
  }

  const [{ data: profileData, error: pErr }, { data: fallData, error: fErr }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, cover_url, created_at").order("created_at"),
    supabase.from("falls").select("id, user_id, fall_day, reason, link, created_at").order("fall_day").order("created_at"),
  ]);
  if (pErr || fErr) { console.error(pErr || fErr); els.ranking.innerHTML = `<div class="empty-state">No se pudieron cargar los datos.</div>`; return; }
  profiles = profileData || [];
  falls = fallData || [];
  renderPublicData();
  renderMemberState();
}

function renderPublicData() {
  const fallByUser = new Map(falls.map(f => [f.user_id, f]));
  const alive = profiles.filter(p => !fallByUser.has(p.id));

  els.ranking.innerHTML = alive.length ? alive.map((p, i) => `
    <button class="rank-row profile-trigger" type="button" data-user-id="${escapeHtml(p.id)}" aria-label="Ver perfil de ${escapeHtml(p.display_name || p.username)}">
      <div class="rank-position">${i + 1}</div>
      ${avatarMarkup(p, "avatar-small")}
      <div class="rank-name">${escapeHtml(p.display_name || p.username)}</div>
      <div class="rank-status">EN PIE</div>
    </button>`).join("") : `<div class="empty-state">No quedó nadie en pie. Oscuro septiembre.</div>`;

  els.fallenList.innerHTML = falls.length ? falls.map(f => {
    const p = profiles.find(x => x.id === f.user_id) || { username: "Desconocido", display_name: "Desconocido" };
    const link = safeUrl(f.link);
    return `<div class="fallen-row profile-trigger" role="button" tabindex="0" data-user-id="${escapeHtml(p.id || f.user_id)}" aria-label="Ver perfil de ${escapeHtml(p.display_name || p.username)}">
      ${avatarMarkup(p, "avatar-small")}
      <div><div class="fallen-name">${escapeHtml(p.display_name || p.username)} · Día ${f.fall_day}</div>
      <div class="fallen-meta">${escapeHtml(f.reason)}${link ? `<br><a class="fallen-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Ver link ↗</a>` : ""}</div></div>
    </div>`;
  }).join("") : `<div class="empty-state">Todavía no cayó ningún soldado.</div>`;

  els.aliveCount.textContent = alive.length;
  els.fallenCount.textContent = falls.length;
  els.survivalRate.textContent = profiles.length ? `${Math.round((alive.length / profiles.length) * 100)}%` : "0%";
}

function renderChallengeDate() {
  const now = new Date(); const start = new Date(2026, 8, 1); const end = new Date(2026, 8, 30, 23, 59, 59);
  if (now < start) { els.challengeDay.textContent = "0"; els.challengeStatus.textContent = "Todavía no empezó"; return; }
  if (now > end) { els.challengeDay.textContent = "30"; els.challengeStatus.textContent = "Reto finalizado"; return; }
  const day = Math.floor((now - start) / 86400000) + 1;
  els.challengeDay.textContent = day; els.challengeStatus.textContent = `de 30 · faltan ${30 - day} días`;
}

function renderMemberState() {
  const logged = Boolean(session?.user);
  els.guestPanel.classList.toggle("hidden", logged);
  els.memberArea.classList.toggle("hidden", !logged);
  els.openLoginButton.classList.toggle("hidden", logged);
  els.logoutButton.classList.toggle("hidden", !logged);
  if (!logged) return;

  currentProfile = profiles.find(p => p.id === session.user.id) || currentProfile;
  if (!currentProfile) return;
  els.sessionUsername.textContent = `@${currentProfile.username}`;
  els.profileDisplayName.textContent = currentProfile.display_name || currentProfile.username;
  els.displayName.value = currentProfile.display_name || currentProfile.username;
  els.profileAvatar.innerHTML = currentProfile.avatar_url ? `<img src="${escapeHtml(currentProfile.avatar_url)}" alt="Tu foto">` : escapeHtml(initials(currentProfile.display_name || currentProfile.username));
  els.profileCover.innerHTML = coverMarkup(currentProfile, "profile-cover-own");

  const fallen = falls.some(f => f.user_id === session.user.id);
  els.fallForm.classList.toggle("hidden", fallen);
  els.alreadyFallen.classList.toggle("hidden", !fallen);
}

async function syncSession() {
  if (!isConfigured()) return;
  const { data } = await supabase.auth.getSession(); session = data.session;
  await loadPublicData();
}

function openLogin() { clearMessage(els.loginMessage); els.loginDialog.showModal(); setTimeout(() => els.loginUsername.focus(), 0); }
els.openLoginButton.addEventListener("click", openLogin); els.guestLoginButton.addEventListener("click", openLogin);
els.closeLoginButton.addEventListener("click", () => els.loginDialog.close());
els.closePublicProfileButton.addEventListener("click", () => els.publicProfileDialog.close());
els.ranking.addEventListener("click", event => {
  const trigger = event.target.closest(".profile-trigger");
  if (trigger?.dataset.userId) openPublicProfile(trigger.dataset.userId);
});
els.fallenList.addEventListener("click", event => {
  if (event.target.closest("a")) return;
  const trigger = event.target.closest(".profile-trigger");
  if (trigger?.dataset.userId) openPublicProfile(trigger.dataset.userId);
});
els.fallenList.addEventListener("keydown", event => {
  if (!["Enter", " "].includes(event.key)) return;
  const trigger = event.target.closest(".profile-trigger");
  if (!trigger?.dataset.userId) return;
  event.preventDefault();
  openPublicProfile(trigger.dataset.userId);
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.loginMessage);
  const username = els.loginUsername.value.trim().toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(username)) return showMessage(els.loginMessage, "Usuario inválido.", "error");
  const { data, error } = await supabase.auth.signInWithPassword({ email: `${username}@${LOGIN_DOMAIN}`, password: els.loginPassword.value });
  if (error) return showMessage(els.loginMessage, "Usuario o contraseña incorrectos.", "error");
  session = data.session; els.loginForm.reset(); els.loginDialog.close(); await loadPublicData();
});

els.logoutButton.addEventListener("click", async () => { await supabase.auth.signOut(); session = null; currentProfile = null; renderMemberState(); });

els.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.profileMessage); if (!session?.user) return;
  const displayName = els.displayName.value.trim(); if (!displayName) return showMessage(els.profileMessage, "Ingresá un nombre visible.", "error");
  let avatarUrl = currentProfile?.avatar_url || null;
  let coverUrl = currentProfile?.cover_url || null;
  const avatarFile = els.avatarFile.files[0];
  const coverFile = els.coverFile.files[0];
  try {
    if (avatarFile) avatarUrl = await uploadProfileImage(avatarFile, "avatar", 2 * 1024 * 1024, ['image/jpeg','image/png','image/webp']);
    if (coverFile) coverUrl = await uploadProfileImage(coverFile, "cover", 10 * 1024 * 1024, ['image/jpeg','image/png','image/webp','image/gif']);
  } catch (error) {
    return showMessage(els.profileMessage, error.message, "error");
  }
  const { error } = await supabase.from("profiles").update({ display_name: displayName, avatar_url: avatarUrl, cover_url: coverUrl }).eq("id", session.user.id);
  if (error) return showMessage(els.profileMessage, error.message, "error");
  els.avatarFile.value = ""; els.coverFile.value = ""; showMessage(els.profileMessage, "Perfil actualizado."); await loadPublicData();
});

els.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.passwordMessage); if (!session?.user) return;
  if (els.newPassword.value.length < 6) return showMessage(els.passwordMessage, "La contraseña debe tener al menos 6 caracteres.", "error");
  if (els.newPassword.value !== els.repeatPassword.value) return showMessage(els.passwordMessage, "Las contraseñas no coinciden.", "error");
  const { error } = await supabase.auth.updateUser({ password: els.newPassword.value });
  if (error) return showMessage(els.passwordMessage, error.message, "error");
  els.passwordForm.reset(); showMessage(els.passwordMessage, "Contraseña actualizada.");
});

els.fallForm.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.fallMessage); if (!session?.user) return;
  const day = Number(els.fallDay.value), reason = els.fallReason.value.trim(), link = els.fallLink.value.trim();
  if (!Number.isInteger(day) || day < 1 || day > 30) return showMessage(els.fallMessage, "El día debe estar entre 1 y 30.", "error");
  if (!reason) return showMessage(els.fallMessage, "Agregá un motivo o descripción.", "error");
  if (link && !safeUrl(link)) return showMessage(els.fallMessage, "El link no parece válido.", "error");
  const { error } = await supabase.from("falls").insert({ user_id: session.user.id, fall_day: day, reason, link: link || null });
  if (error) return showMessage(els.fallMessage, error.code === "23505" ? "Ya registraste una caída." : error.message, "error");
  els.fallForm.reset(); showMessage(els.fallMessage, "Parte de baja registrado. F."); await loadPublicData();
});

supabase.auth.onAuthStateChange((_event, newSession) => { session = newSession; });
renderChallengeDate();
syncSession();
