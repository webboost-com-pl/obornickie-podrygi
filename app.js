const SUPABASE_URL = "https://ditlraktguwijuaqrnyf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdGxyYWt0Z3V3aWp1YXFybnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDQ0OTksImV4cCI6MjA5NTgyMDQ5OX0.UsIpJFtK_YAONEhTjuR1RYPqI0Nz6tFwDuFp-69Il7k";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authBox = document.getElementById("authBox");
const gameBox = document.getElementById("gameBox");
const message = document.getElementById("message");

async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const nick = document.getElementById("nick").value;

  if (!email || !password || !nick) {
    message.textContent = "Wpisz email, hasło i nick.";
    return;
  }

  const { data, error } = await db.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  const user = data.user;

  await db.from("profiles").insert({
    id: user.id,
    nick: nick,
    podrygi: 1000
  });

  message.textContent = "Konto utworzone. Możesz się zalogować.";
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await db.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    message.textContent = "Błąd logowania: " + error.message;
    return;
  }

  loadGame();
}

async function loadGame() {
  const { data: userData } = await db.auth.getUser();
  const user = userData.user;

  if (!user) return;

  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    message.textContent = "Nie znaleziono profilu.";
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
