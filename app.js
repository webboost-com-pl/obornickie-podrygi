const SUPABASE_URL = "https://ditlraktguwijuaqrnyf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdGxyYWt0Z3V3aWp1YXFybnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDQ0OTksImV4cCI6MjA5NTgyMDQ5OX0.UsIpJFtK_YAONEhTjuR1RYPqI0Nz6tFwDuFp-69Il7k";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authBox = document.getElementById("authBox");
const gameBox = document.getElementById("gameBox");
const message = document.getElementById("message");

async function register() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const nick = document.getElementById("nick").value.trim();

  if (!email || !password || !nick) {
    message.textContent = "Wpisz email, hasło i nick.";
    return;
  }

  const { error } = await db.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        nick: nick
      }
    }
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = "Konto utworzone. Sprawdź maila i potwierdź konto.";
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    message.textContent = "Wpisz email i hasło.";
    return;
  }

  const { error } = await db.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    message.textContent = "Błąd logowania: " + error.message;
    return;
  }

  await loadGame();
}

async function loadGame() {
  const { data: userData } = await db.auth.getUser();
  const user = userData.user;

  if (!user) return;

  let { data: profile, error: profileError } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const nick = user.user_metadata?.nick || "Gracz";

    const { error: insertError } = await db.from("profiles").insert({
      id: user.id,
      nick: nick,
      podrygi: 1000
    });

    if (insertError) {
      message.textContent = "Nie udało się utworzyć profilu: " + insertError.message;
      return;
    }

    const result = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    profile = result.data;
  }

  if (!profile) {
    message.textContent = "Nie udało się załadować profilu.";
    return;
  }

  authBox.classList.add("hidden");
  gameBox.classList.remove("hidden");

  document.getElementById("helloText").textContent = "Siema, " + profile.nick;
  document.getElementById("podrygiAmount").textContent = profile.podrygi;
  message.textContent = "";
}

async function logout() {
  await db.auth.signOut();

  authBox.classList.remove("hidden");
  gameBox.classList.add("hidden");

  message.textContent = "Wylogowano.";
}

loadGame();

window.register = register;
window.login = login;
window.logout = logout;
