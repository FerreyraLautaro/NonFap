import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const LOGIN_DOMAIN = "nonfap.example.com";
const CHALLENGE_YEAR = 2026;
const CHALLENGE_MONTH_INDEX = 8;
const CHALLENGE_START = new Date(CHALLENGE_YEAR, CHALLENGE_MONTH_INDEX, 1);
const CHALLENGE_END = new Date(CHALLENGE_YEAR, CHALLENGE_MONTH_INDEX, 30, 23, 59, 59);
const SESSION_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const SESSION_EXPIRY_KEY = "nonfap_session_expires_at";
let sessionExpiryTimer = null;

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
  profilePoints: document.querySelector("#profilePoints"), profileCheckinStreak: document.querySelector("#profileCheckinStreak"), profileRankBadge: document.querySelector("#profileRankBadge"), profileFlame: document.querySelector("#profileFlame"),
  profileForm: document.querySelector("#profileForm"), displayName: document.querySelector("#displayName"), avatarFile: document.querySelector("#avatarFile"), coverFile: document.querySelector("#coverFile"), profileMessage: document.querySelector("#profileMessage"),
  passwordForm: document.querySelector("#passwordForm"), newPassword: document.querySelector("#newPassword"), repeatPassword: document.querySelector("#repeatPassword"), passwordMessage: document.querySelector("#passwordMessage"),
  dailyCheckinButton: document.querySelector("#dailyCheckinButton"), dailyCheckinStatus: document.querySelector("#dailyCheckinStatus"), dailyCheckinMessage: document.querySelector("#dailyCheckinMessage"),
  fallForm: document.querySelector("#fallForm"), fallDay: document.querySelector("#fallDay"), fallLink: document.querySelector("#fallLink"), fallReason: document.querySelector("#fallReason"), fallMessage: document.querySelector("#fallMessage"), alreadyFallen: document.querySelector("#alreadyFallen"),
  publicProfileDialog: document.querySelector("#publicProfileDialog"), closePublicProfileButton: document.querySelector("#closePublicProfileButton"), publicProfileContent: document.querySelector("#publicProfileContent"),
  radioForm: document.querySelector("#radioForm"), radioComment: document.querySelector("#radioComment"), radioCharCount: document.querySelector("#radioCharCount"), radioMessage: document.querySelector("#radioMessage"), radioLoginHint: document.querySelector("#radioLoginHint"), radioList: document.querySelector("#radioList"), radioLeaderboard: document.querySelector("#radioLeaderboard"),
};

let session = null;
let currentProfile = null;
let profiles = [];
let falls = [];
let radioMessages = [];
let myCheckins = [];
let myScore = null;
let publicScores = new Map();
let gamificationAvailable = true;

const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
function safeUrl(value) { if (!value) return null; try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol) ? u.href : null; } catch { return null; } }
function initials(name = "NF") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase(); }
function showMessage(el, message, type = "ok") { if (!el) return; el.textContent = message; el.className = `form-message ${type}`; }
function clearMessage(el) { if (!el) return; el.textContent = ""; el.className = "form-message"; }
function isConfigured() { return !SUPABASE_URL.includes("TU-PROYECTO") && !SUPABASE_PUBLISHABLE_KEY.includes("TU_PUBLISHABLE_KEY"); }

function readSessionExpiry() {
  const value = Number(localStorage.getItem(SESSION_EXPIRY_KEY));
  return Number.isFinite(value) ? value : null;
}

function clearLocalSessionWindow() {
  localStorage.removeItem(SESSION_EXPIRY_KEY);
  if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
  sessionExpiryTimer = null;
}

function refreshLocalSessionWindow() {
  const expiresAt = Date.now() + SESSION_WINDOW_MS;
  localStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
  scheduleSessionExpiry(expiresAt);
}

function scheduleSessionExpiry(expiresAt = readSessionExpiry()) {
  if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
  if (!expiresAt) return;
  const delay = Math.max(0, expiresAt - Date.now());
  sessionExpiryTimer = setTimeout(expireLocalSessionIfNeeded, Math.min(delay, 2147483647));
}

async function expireLocalSessionIfNeeded() {
  const expiresAt = readSessionExpiry();
  if (!expiresAt || !session) return;
  if (Date.now() < expiresAt) { scheduleSessionExpiry(expiresAt); return false; }
  clearLocalSessionWindow();
  await supabase.auth.signOut();
  session = null;
  currentProfile = null;
  myCheckins = [];
  myScore = null;
  renderMemberState();
  return true;
}

async function refreshSessionWindowOnReturn() {
  if (!session?.user) return;
  const expired = await expireLocalSessionIfNeeded();
  if (!expired) refreshLocalSessionWindow();
}

async function applyLocalSessionWindow(activeSession, { refresh = true } = {}) {
  if (!activeSession?.user) {
    clearLocalSessionWindow();
    return null;
  }

  const expiresAt = readSessionExpiry();
  if (expiresAt && Date.now() > expiresAt) {
    clearLocalSessionWindow();
    await supabase.auth.signOut();
    return null;
  }

  if (refresh) refreshLocalSessionWindow();
  else scheduleSessionExpiry(expiresAt);
  return activeSession;
}

function argentinaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function currentChallengeDay(date = new Date()) {
  const [year, month, day] = argentinaDateKey(date).split("-").map(Number);
  if (year !== CHALLENGE_YEAR || month !== CHALLENGE_MONTH_INDEX + 1 || day < 1 || day > 30) return null;
  return day;
}

function survivalDaysFor(userId) {
  const fall = falls.find(f => f.user_id === userId);
  if (fall) return Math.max(0, Number(fall.fall_day) - 1);
  const [year, month, day] = argentinaDateKey().split("-").map(Number);
  if (year < CHALLENGE_YEAR || (year === CHALLENGE_YEAR && month < CHALLENGE_MONTH_INDEX + 1)) return 0;
  if (year > CHALLENGE_YEAR || (year === CHALLENGE_YEAR && month > CHALLENGE_MONTH_INDEX + 1)) return 30;
  return Math.min(Math.max(day, 0), 30);
}

function survivalBadge(days) {
  const ranges = [
    [0, 2, "Soldado", "🪖"], [3, 4, "Cabo", "🎗️"], [5, 6, "Tercer Sargento", "🥉"],
    [7, 8, "Segundo Sargento", "🥈"], [9, 10, "Primer Sargento", "🥇"], [11, 12, "Subteniente", "🛡️"],
    [13, 14, "APS", "⚔️"], [15, 16, "Segundo Teniente", "🏅"], [17, 18, "Primer Teniente", "🎖️"],
    [19, 20, "Capitan", "🎖️🎖️"], [21, 22, "Mayor", "🎖️🎖️🎖️"], [23, 24, "Coronel", "⭐"],
    [25, 26, "General", "🌟"], [27, 28, "Rey", "👑"], [29, 30, "Monje", "∞"],
  ];
  const found = ranges.find(([min, max]) => days >= min && days <= max) || ranges[0];
  return { label: found[2], icon: found[3], text: `${found[2]} ${found[3]}` };
}

function flameFor(streak = 0) {
  if (streak >= 20) return { text: "🔥 Blanco", className: "flame-white" };
  if (streak >= 10) return { text: "🔥 Violeta", className: "flame-purple" };
  if (streak >= 5) return { text: "🔥 Rojo", className: "flame-red" };
  if (streak >= 1) return { text: "🔥 Naranja", className: "flame-orange" };
  return { text: "Sin fuego", className: "flame-empty" };
}

function avatarMarkup(profile, sizeClass = "") {
  const label = escapeHtml(profile.display_name || profile.username);
  return profile.avatar_url
    ? `<img class="avatar ${sizeClass}" src="${escapeHtml(profile.avatar_url)}" alt="Foto de ${label}">`
    : `<div class="avatar ${sizeClass}">${escapeHtml(initials(profile.display_name || profile.username))}</div>`;
}

function nameWithBadges(profile) {
  const badge = survivalBadge(survivalDaysFor(profile.id));
  return `<span class="name-badge-wrap"><span>${escapeHtml(profile.display_name || profile.username)}</span><span class="rank-badge" title="${escapeHtml(badge.label)}">${escapeHtml(badge.icon)}</span></span>`;
}

function scoreForUser(userId) {
  return publicScores.get(userId) || { total_points: 0, checkin_streak: 0, checkin_points: 0, radio_points: 0 };
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
  return fall ? `Cayo el dia ${fall.fall_day}` : "Sigue en pie";
}

function openPublicProfile(userId) {
  const profile = profiles.find(p => p.id === userId);
  if (!profile) return;
  const fall = falls.find(f => f.user_id === userId);
  const link = safeUrl(fall?.link);
  const statusClass = fall ? "fallen-pill" : "alive-pill";
  const statusText = fall ? "💀 Soldado caido" : "🛡️ Sobreviviente";
  const badge = survivalBadge(survivalDaysFor(userId));
  const score = scoreForUser(userId);

  els.publicProfileContent.innerHTML = `
    <div class="public-profile-head">
      <div class="public-profile-cover-wrap">${coverMarkup(profile)}</div>
      ${avatarMarkup(profile, "avatar-public")}
      <div>
        <h2>${nameWithBadges(profile)}</h2>
        <p class="profile-username">@${escapeHtml(profile.username)}</p>
      </div>
    </div>
    <div class="profile-detail-grid">
      <div><span>Estado</span><strong class="${statusClass}">${statusText}</strong></div>
      <div><span>Reto</span><strong>${escapeHtml(challengeLabelForFall(fall))}</strong></div>
      <div><span>Insignia</span><strong>${escapeHtml(badge.text)}</strong></div>
      <div><span>Puntos</span><strong>${score.total_points}</strong></div>
      <div><span>Dias vivo</span><strong>${survivalDaysFor(userId)}</strong></div>
    </div>
    ${fall ? `<div class="profile-fall-box">
      <span>Motivo publico</span>
      <p>${escapeHtml(fall.reason)}</p>
      ${link ? `<a class="fallen-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Ver link ↗</a>` : ""}
    </div>` : `<p class="muted-copy">Todavia no registro ninguna caida. Respeto absoluto.</p>`}
  `;
  els.publicProfileDialog.showModal();
}

async function loadPublicData() {
  if (!isConfigured()) {
    els.ranking.innerHTML = `<div class="empty-state">Configura Supabase para cargar el ranking.</div>`;
    els.fallenList.innerHTML = `<div class="empty-state">Revisa README.md.</div>`;
    return;
  }

  const [{ data: profileData, error: pErr }, { data: fallData, error: fErr }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, cover_url, created_at").order("created_at"),
    supabase.from("falls").select("id, user_id, fall_day, reason, link, created_at").order("fall_day").order("created_at"),
  ]);
  if (pErr || fErr) { console.error(pErr || fErr); els.ranking.innerHTML = `<div class="empty-state">No se pudieron cargar los datos.</div>`; return; }
  profiles = profileData || [];
  falls = fallData || [];
  await loadGamificationData();
  renderPublicData();
  renderMemberState();
}

async function loadGamificationData() {
  gamificationAvailable = true;
  radioMessages = [];
  myCheckins = [];
  myScore = null;
  publicScores = new Map();

  try {
    const [{ data: messages, error: messageError }, { data: scoreRows, error: publicScoreError }] = await Promise.all([
      supabase.rpc("get_radio_feed", { p_limit: 200 }),
      supabase.rpc("get_public_scores"),
    ]);
    if (messageError) throw messageError;
    radioMessages = messages || [];
    if (publicScoreError) console.warn("Puntos publicos no disponibles. Ejecuta el SQL nuevo en Supabase.", publicScoreError);
    else publicScores = new Map((scoreRows || []).map(score => [score.user_id, score]));

    if (session?.user) {
      const [{ data: checkinData, error: checkinError }, { data: scoreData, error: scoreError }] = await Promise.all([
        supabase.from("daily_checkins").select("checkin_date, challenge_day, created_at").eq("user_id", session.user.id).order("checkin_date"),
        supabase.rpc("get_my_score"),
      ]);
      if (checkinError) throw checkinError;
      myCheckins = checkinData || [];
      if (!scoreError) myScore = Array.isArray(scoreData) ? scoreData[0] : scoreData;
    }
  } catch (error) {
    gamificationAvailable = false;
    console.warn("Gamificacion no disponible. Ejecuta el SQL nuevo en Supabase.", error);
  }
  renderRadio();
}

function renderPublicData() {
  const fallByUser = new Map(falls.map(f => [f.user_id, f]));
  const alive = profiles
    .filter(p => !fallByUser.has(p.id))
    .sort((a, b) => {
      const pointsDiff = Number(scoreForUser(b.id).total_points || 0) - Number(scoreForUser(a.id).total_points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      return new Date(a.created_at) - new Date(b.created_at);
    });

  els.ranking.innerHTML = alive.length ? alive.map((p, i) => `
    <button class="rank-row profile-trigger" type="button" data-user-id="${escapeHtml(p.id)}" aria-label="Ver perfil de ${escapeHtml(p.display_name || p.username)}">
      <div class="rank-position">${i + 1}</div>
      ${avatarMarkup(p, "avatar-small")}
      <div class="rank-name">${nameWithBadges(p)}</div>
      <div class="rank-points">${scoreForUser(p.id).total_points} pts</div>
    </button>`).join("") : `<div class="empty-state">No quedo nadie en pie. Oscuro septiembre.</div>`;

  els.fallenList.innerHTML = falls.length ? falls.map(f => {
    const p = profiles.find(x => x.id === f.user_id) || { id: f.user_id, username: "Desconocido", display_name: "Desconocido" };
    const link = safeUrl(f.link);
    return `<div class="fallen-row profile-trigger" role="button" tabindex="0" data-user-id="${escapeHtml(p.id || f.user_id)}" aria-label="Ver perfil de ${escapeHtml(p.display_name || p.username)}">
      ${avatarMarkup(p, "avatar-small")}
      <div><div class="fallen-name">${nameWithBadges(p)} · Dia ${f.fall_day}</div>
      <div class="fallen-meta">${escapeHtml(f.reason)}${link ? `<br><a class="fallen-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Ver link ↗</a>` : ""}</div></div>
    </div>`;
  }).join("") : `<div class="empty-state">Todavia no cayo ningun soldado.</div>`;

  els.aliveCount.textContent = alive.length;
  els.fallenCount.textContent = falls.length;
  els.survivalRate.textContent = profiles.length ? `${Math.round((alive.length / profiles.length) * 100)}%` : "0%";
}

function renderRadio() {
  if (!els.radioList) return;
  const logged = Boolean(session?.user);
  els.radioForm?.classList.toggle("hidden", !logged || !gamificationAvailable);
  els.radioLoginHint?.classList.toggle("hidden", logged && gamificationAvailable);
  if (!gamificationAvailable) {
    els.radioList.innerHTML = `<div class="empty-state">Radio Lactea espera el SQL nuevo en Supabase.</div>`;
    els.radioLeaderboard.innerHTML = `<div class="empty-state">Sin tabla, no hay chusmerio.</div>`;
    return;
  }

  els.radioList.innerHTML = radioMessages.length ? radioMessages.map(message => {
    const liked = Boolean(message.liked_by_me);
    return `<article class="radio-message">
      <div class="radio-author"><div class="anonymous-avatar avatar-tiny">👻</div><strong>Anonimo Lacteo</strong><span>${new Date(message.created_at).toLocaleDateString("es-AR")}</span></div>
      <p>${escapeHtml(message.body)}</p>
      <button class="like-button ${liked ? "liked" : ""}" type="button" data-message-id="${message.id}" ${logged ? "" : "disabled"}>${liked ? "♥" : "♡"} ${message.like_count || 0}</button>
    </article>`;
  }).join("") : `<div class="empty-state">Todavia no hablo nadie. Preocupante silencio.</div>`;

  const today = argentinaDateKey();
  const todaysMessages = radioMessages
    .filter(message => message.message_date === today && Number(message.like_count || 0) > 0)
    .sort((a, b) => Number(a.daily_rank || 9999) - Number(b.daily_rank || 9999));

  els.radioLeaderboard.innerHTML = todaysMessages.length ? todaysMessages.slice(0, 3).map((message, index) => {
    return `<div class="radio-top-row"><span>#${index + 1}</span><strong>${escapeHtml(message.body)}</strong><em>${message.like_count || 0} likes</em></div>`;
  }).join("") : `<div class="empty-state">Hoy nadie compitio por el premio lacteo.</div>`;
}

function longestCheckinStreak(checkins) {
  const days = [...new Set(checkins.map(c => c.checkin_date))].sort();
  let best = 0, current = 0, previous = null;
  for (const day of days) {
    const currentDate = new Date(`${day}T00:00:00`);
    const previousDate = previous ? new Date(`${previous}T00:00:00`) : null;
    current = previousDate && ((currentDate - previousDate) / 86400000 === 1) ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}

function renderChallengeDate() {
  const now = new Date();
  if (now < CHALLENGE_START) { els.challengeDay.textContent = "0"; els.challengeStatus.textContent = "Todavia no empezo"; return; }
  if (now > CHALLENGE_END) { els.challengeDay.textContent = "30"; els.challengeStatus.textContent = "Reto finalizado"; return; }
  const day = currentChallengeDay(now);
  els.challengeDay.textContent = day; els.challengeStatus.textContent = `de 30 · faltan ${30 - day} dias`;
}

function renderMemberState() {
  const logged = Boolean(session?.user);
  els.guestPanel.classList.toggle("hidden", logged);
  els.memberArea.classList.toggle("hidden", !logged);
  els.openLoginButton.classList.toggle("hidden", logged);
  els.logoutButton.classList.toggle("hidden", !logged);
  if (!logged) { renderRadio(); return; }

  currentProfile = profiles.find(p => p.id === session.user.id) || currentProfile;
  if (!currentProfile) return;
  els.sessionUsername.textContent = `@${currentProfile.username}`;
  els.profileDisplayName.innerHTML = nameWithBadges(currentProfile);
  els.displayName.value = currentProfile.display_name || currentProfile.username;
  els.profileAvatar.innerHTML = currentProfile.avatar_url ? `<img src="${escapeHtml(currentProfile.avatar_url)}" alt="Tu foto">` : escapeHtml(initials(currentProfile.display_name || currentProfile.username));
  els.profileCover.innerHTML = coverMarkup(currentProfile, "profile-cover-own");

  const badge = survivalBadge(survivalDaysFor(session.user.id));
  const streak = Number(myScore?.checkin_streak || longestCheckinStreak(myCheckins));
  const flame = flameFor(streak);
  if (els.profilePoints) els.profilePoints.textContent = myScore?.total_points ?? "—";
  if (els.profileCheckinStreak) els.profileCheckinStreak.textContent = `${streak} dias`;
  if (els.profileRankBadge) els.profileRankBadge.textContent = badge.text;
  if (els.profileFlame) { els.profileFlame.textContent = flame.text; els.profileFlame.className = flame.className; }

  const today = argentinaDateKey();
  const didCheckinToday = myCheckins.some(c => c.checkin_date === today);
  const currentDay = currentChallengeDay();
  if (els.dailyCheckinButton) {
    els.dailyCheckinButton.disabled = !gamificationAvailable || didCheckinToday || !currentDay;
    els.dailyCheckinButton.textContent = didCheckinToday ? "Check-in hecho" : "Sigo en pie";
  }
  if (els.dailyCheckinStatus) {
    if (!gamificationAvailable) els.dailyCheckinStatus.textContent = "Ejecuta el SQL nuevo para activar rachas y puntos.";
    else if (!currentDay) els.dailyCheckinStatus.textContent = "El check-in solo cuenta durante septiembre 2026.";
    else els.dailyCheckinStatus.textContent = didCheckinToday ? `Hoy ya sumaste. Racha actual: ${streak} dias.` : `Todavia no hiciste check-in hoy. Racha actual: ${streak} dias.`;
  }

  const fallen = falls.some(f => f.user_id === session.user.id);
  els.fallForm.classList.toggle("hidden", fallen);
  els.alreadyFallen.classList.toggle("hidden", !fallen);
  renderRadio();
}

async function syncSession() {
  if (!isConfigured()) return;
  const { data } = await supabase.auth.getSession();
  session = await applyLocalSessionWindow(data.session);
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
  event.preventDefault(); openPublicProfile(trigger.dataset.userId);
});

els.radioComment?.addEventListener("input", () => { els.radioCharCount.textContent = `${els.radioComment.value.length}/250`; });
els.radioForm?.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.radioMessage); if (!session?.user) return;
  const body = els.radioComment.value.trim();
  if (!body) return showMessage(els.radioMessage, "Escribi algo antes de transmitir.", "error");
  if (body.length > 250) return showMessage(els.radioMessage, "Maximo 250 caracteres, no una tesis degenerada.", "error");
  const { error } = await supabase.rpc("create_radio_message", { p_body: body });
  if (error) return showMessage(els.radioMessage, error.message, "error");
  els.radioForm.reset(); els.radioCharCount.textContent = "0/250"; showMessage(els.radioMessage, "Transmision enviada."); await loadPublicData();
});
els.radioList?.addEventListener("click", async (event) => {
  const button = event.target.closest(".like-button");
  if (!button || !session?.user) return;
  const messageId = Number(button.dataset.messageId);
  const alreadyLiked = radioMessages.some(message => Number(message.id) === messageId && message.liked_by_me);
  button.disabled = true;
  const response = alreadyLiked
    ? await supabase.from("radio_message_likes").delete().eq("message_id", messageId).eq("user_id", session.user.id)
    : await supabase.from("radio_message_likes").insert({ message_id: messageId, user_id: session.user.id });
  if (response.error) showMessage(els.radioMessage, response.error.message, "error");
  await loadPublicData();
});
els.dailyCheckinButton?.addEventListener("click", async () => {
  clearMessage(els.dailyCheckinMessage); if (!session?.user) return;
  const challengeDay = currentChallengeDay();
  if (!challengeDay) return showMessage(els.dailyCheckinMessage, "El check-in solo cuenta durante septiembre 2026.", "error");
  const { error } = await supabase.rpc("create_daily_checkin");
  if (error) return showMessage(els.dailyCheckinMessage, error.code === "23505" ? "Ya hiciste check-in hoy." : error.message, "error");
  showMessage(els.dailyCheckinMessage, "Check-in registrado. +5 puntos al bolsillo."); await loadPublicData();
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.loginMessage);
  const username = els.loginUsername.value.trim().toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(username)) return showMessage(els.loginMessage, "Usuario invalido.", "error");
  const { data, error } = await supabase.auth.signInWithPassword({ email: `${username}@${LOGIN_DOMAIN}`, password: els.loginPassword.value });
  if (error) return showMessage(els.loginMessage, error.message, "error");
  session = data.session; refreshLocalSessionWindow(); els.loginForm.reset(); els.loginDialog.close(); await loadPublicData();
});

els.logoutButton.addEventListener("click", async () => { clearLocalSessionWindow(); await supabase.auth.signOut(); session = null; currentProfile = null; myCheckins = []; myScore = null; renderMemberState(); });

els.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.profileMessage); if (!session?.user) return;
  const displayName = els.displayName.value.trim(); if (!displayName) return showMessage(els.profileMessage, "Ingresa un nombre visible.", "error");
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
  if (els.newPassword.value.length < 6) return showMessage(els.passwordMessage, "La contrasena debe tener al menos 6 caracteres.", "error");
  if (els.newPassword.value !== els.repeatPassword.value) return showMessage(els.passwordMessage, "Las contrasenas no coinciden.", "error");
  const { error } = await supabase.auth.updateUser({ password: els.newPassword.value });
  if (error) return showMessage(els.passwordMessage, error.message, "error");
  els.passwordForm.reset(); showMessage(els.passwordMessage, "Contrasena actualizada.");
});

els.fallForm.addEventListener("submit", async (event) => {
  event.preventDefault(); clearMessage(els.fallMessage); if (!session?.user) return;
  const day = Number(els.fallDay.value), reason = els.fallReason.value.trim(), link = els.fallLink.value.trim();
  if (!Number.isInteger(day) || day < 1 || day > 30) return showMessage(els.fallMessage, "El dia debe estar entre 1 y 30.", "error");
  if (!reason) return showMessage(els.fallMessage, "Agrega un motivo o descripcion.", "error");
  if (link && !safeUrl(link)) return showMessage(els.fallMessage, "El link no parece valido.", "error");
  const { error } = await supabase.from("falls").insert({ user_id: session.user.id, fall_day: day, reason, link: link || null });
  if (error) return showMessage(els.fallMessage, error.code === "23505" ? "Ya registraste una caida." : error.message, "error");
  els.fallForm.reset(); showMessage(els.fallMessage, "Parte de baja registrado. F."); await loadPublicData();
});

supabase.auth.onAuthStateChange(async (event, newSession) => {
  if (event === "SIGNED_OUT") {
    clearLocalSessionWindow();
    session = null;
    return;
  }
  session = await applyLocalSessionWindow(newSession, { refresh: event !== "TOKEN_REFRESHED" });
});
window.addEventListener("focus", refreshSessionWindowOnReturn);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshSessionWindowOnReturn(); });
renderChallengeDate();
syncSession();
