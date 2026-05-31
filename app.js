const SUPABASE_URL = "https://ditlraktguwijuaqrnyf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdGxyYWt0Z3V3aWp1YXFybnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDQ0OTksImV4cCI6MjA5NTgyMDQ5OX0.UsIpJFtK_YAONEhTjuR1RYPqI0Nz6tFwDuFp-69Il7k";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const message = document.getElementById("message");

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.add("hidden");
  });

  document.getElementById(screenId).classList.remove("hidden");
  message.textContent = "";
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  document.getElementById(pageId).classList.remove("hidden");

  if (pageId === "rankingPage") {
    loadRanking();
  }
}

async function register() {
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const nick = document.getElementById("registerNick").value.trim();

  if (!email || !password || !nick) {
    message.textContent = "Wpisz email, hasło i nick.";
    return;
  }

  const { error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        nick
      }
    }
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = "Konto utworzone. Potwierdź email i zaloguj się.";
  showScreen("loginScreen");
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    message.textContent = "Wpisz email i hasło.";
    return;
  }

  const { error } = await db.auth.signInWithPassword({
    email,
    password
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

  if (!user) {
    showScreen("startScreen");
    return;
  }

  let { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const nick = user.user_metadata?.nick || "Gracz";

    const { error: insertError } = await db.from("profiles").insert({
      id: user.id,
      nick: nick,
      podrygi: 1000,
      level: 1,
      xp: 0
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

  document.getElementById("helloText").textContent = profile.nick;
  document.getElementById("coinsAmount").textContent = profile.podrygi;
  document.getElementById("levelAmount").textContent = profile.level;
  document.getElementById("xpAmount").textContent = profile.xp;

  showScreen("appScreen");
  showPage("homePage");
}

async function logout() {
  await db.auth.signOut();
  showScreen("startScreen");
  message.textContent = "Wylogowano.";
}

async function loadRanking() {
  const rankingList = document.getElementById("rankingList");

  const { data, error } = await db
    .from("profiles")
    .select("nick, podrygi")
    .order("podrygi", { ascending: false });

  if (error) {
    rankingList.innerHTML = "Nie udało się załadować rankingu.";
    return;
  }

  rankingList.innerHTML = "";

  data.forEach((player, index) => {
    rankingList.innerHTML += `
      <div class="rankingItem">
        <b>${index + 1}. ${player.nick}</b>
        <span>${player.podrygi} GC</span>
      </div>
    `;
  });
}

function claimDailyReward() {
  message.textContent = "Codzienna nagroda będzie w następnym kroku.";
}

loadGame();

window.showScreen = showScreen;
window.showPage = showPage;
window.register = register;
window.login = login;
window.logout = logout;
window.claimDailyReward = claimDailyReward;
