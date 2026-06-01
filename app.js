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

  if (pageId === "inventoryPage") {
    loadInventory();
  }

  if (pageId === "attackPage") {
    loadPlayersForAttack();
  }

  if (pageId === "historyPage") {
    loadHistory();
  }

  if (pageId === "stocksPage") {
    loadStocks();
    loadPortfolio();
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
      data: { nick }
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
  const nick = user.user_metadata?.nick;

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
    .select("nick, podrygi, level")
    .order("podrygi", { ascending: false });

  if (error) {
    rankingList.innerHTML = "Nie udało się załadować rankingu.";
    return;
  }

  rankingList.innerHTML = "";

data.forEach((player, index) => {
  rankingList.innerHTML += `
    <div class="rankingItem">
      <div>
        <b>${index + 1}. ${player.nick}</b><br>
        <span>⭐ Level ${player.level}</span>
      </div>
      <span>${player.podrygi} GC</span>
    </div>
  `;
});
}

async function claimDailyReward() {
  const { data, error } = await db.rpc("claim_daily_reward");

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = `Odebrano ${data} Gomancoins.`;
  await loadGame();
}

async function buyItem(itemName) {
  const { data, error } = await db.rpc("buy_item", {
    item: itemName
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = data;
  await loadGame();
  await loadInventory();
}

async function loadInventory() {
  const inventoryList = document.getElementById("inventoryList");

const { data, error } = await db
  .from("inventory")
  .select("item_name, quantity")
  .gt("quantity", 0);

  if (error) {
    inventoryList.innerHTML = "Nie udało się załadować ekwipunku.";
    return;
  }

  if (!data || data.length === 0) {
    inventoryList.innerHTML = `<p class="empty">Nie masz jeszcze przedmiotów.</p>`;
    return;
  }

  inventoryList.innerHTML = "";

  data.forEach(item => {
    let name = item.item_name;

    if (name === "shield") name = "🛡️ Tarcza Gomanowa";
    if (name === "attack_ticket") name = "💣 Bilet Napadu";
    if (name === "chest") name = "🎁 Skrzynka Gomanów";

    inventoryList.innerHTML += `
      <div class="rankingItem">
        <b>${name}</b>
        <span>x${item.quantity}</span>
      </div>
    `;
  });
}

async function loadPlayersForAttack() {
  const playersList = document.getElementById("playersList");

  const { data: userData } = await db.auth.getUser();
  const currentUser = userData.user;

  const { data, error } = await db
    .from("profiles")
    .select("id, nick, podrygi")
    .neq("id", currentUser.id)
    .order("podrygi", { ascending: false });

  if (error) {
    playersList.innerHTML = "Nie udało się załadować graczy.";
    return;
  }

  if (!data || data.length === 0) {
    playersList.innerHTML = `<p class="empty">Nie ma jeszcze innych graczy.</p>`;
    return;
  }

  playersList.innerHTML = "";

  data.forEach(player => {
    playersList.innerHTML += `
      <div class="rankingItem">
        <div>
          <b>${player.nick}</b><br>
          <span>${player.podrygi} GC</span>
        </div>
        <button class="smallBtn" onclick="attackPlayer('${player.id}')">Atakuj</button>
      </div>
    `;
  });
}

async function attackPlayer(targetId) {
  const { data, error } = await db.rpc("attack_player", {
    target: targetId
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = data;
  await loadGame();
  await loadPlayersForAttack();
  await loadRanking();
}
async function openChestWithAnimation() {
  const box = document.getElementById("chestAnimation");

  const icons = ["🪙", "🎟️", "🛡️", "💎", "⭐", "👑", "🔥"];
  let counter = 0;

  box.classList.remove("hidden");
  box.innerHTML = "🎁 Otwieranie...";

  const animation = setInterval(() => {
    box.innerHTML = icons[counter % icons.length];
    counter++;
  }, 120);

  setTimeout(async () => {
    clearInterval(animation);

    const { data, error } = await db.rpc("open_chest");

    if (error) {
      box.innerHTML = "❌ " + error.message;
      message.textContent = error.message;
      return;
    }

    box.innerHTML = data;
    message.textContent = data;

    await loadGame();
    await loadInventory();
  }, 3000);
}
async function loadStocks() {
  const stocksList = document.getElementById("stocksList");

  const { data, error } = await db
    .from("stocks")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    stocksList.innerHTML = "Nie udało się załadować giełdy.";
    return;
  }

  stocksList.innerHTML = "";

  data.forEach(stock => {
    stocksList.innerHTML += `
      <div class="stockCard">
        <h3>${stock.name}</h3>
        <p>Aktualna cena: <b>${Number(stock.price).toFixed(2)} GC</b></p>

        <div class="stockActions">
          <button onclick="buyStock(${stock.id}, 1)">Kup 1</button>
          <button onclick="buyStock(${stock.id}, 10)">Kup 10</button>
          <button onclick="sellStock(${stock.id}, 1)">Sprzedaj 1</button>
          <button onclick="sellStock(${stock.id}, 10)">Sprzedaj 10</button>
        </div>
      </div>
    `;
  });
}

async function loadPortfolio() {
  const portfolioList = document.getElementById("portfolioList");

  const { data, error } = await db
    .from("player_stocks")
    .select(`
      quantity,
      stocks (
        name,
        price
      )
    `)
    .gt("quantity", 0);

  if (error) {
    portfolioList.innerHTML = "Nie udało się załadować portfela.";
    return;
  }

  if (!data || data.length === 0) {
    portfolioList.innerHTML = `<p class="empty">Nie masz jeszcze akcji.</p>`;
    return;
  }

  portfolioList.innerHTML = "";

  data.forEach(item => {
    const value = item.quantity * Number(item.stocks.price);

    portfolioList.innerHTML += `
      <div class="rankingItem">
        <div>
          <b>${item.stocks.name}</b><br>
          <span>${item.quantity} szt.</span>
        </div>
        <span>${value.toFixed(2)} GC</span>
      </div>
    `;
  });
}

async function buyStock(stockId, amount) {
  const { data, error } = await db.rpc("buy_stock", {
    stock: stockId,
    amount: amount
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = data;

  await loadGame();
  await loadStocks();
  await loadPortfolio();
}

async function sellStock(stockId, amount) {
  const { data, error } = await db.rpc("sell_stock", {
    stock: stockId,
    amount: amount
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  message.textContent = data;

  await loadGame();
  await loadStocks();
  await loadPortfolio();
}
loadGame();
async function loadHistory() {
  const historyList = document.getElementById("historyList");

  const { data: userData } = await db.auth.getUser();
  const currentUser = userData.user;

  const { data, error } = await db
    .from("actions_log")
    .select("*")
    .or(`user_id.eq.${currentUser.id},target_id.eq.${currentUser.id}`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    historyList.innerHTML = "Nie udało się załadować historii.";
    return;
  }

  historyList.innerHTML = "";

  data.forEach(action => {

    let text = "";

    if (action.action_type === "daily_reward") {
      text = `🎁 Odebrano ${action.amount} GC`;
    }

    if (action.action_type === "buy_shield") {
      text = `🛡️ Kupiono tarczę`;
    }

    if (action.action_type === "buy_attack_ticket") {
      text = `💣 Kupiono bilet napadu`;
    }

    if (action.action_type === "attack_failed") {
      text = `⚔️ Nieudany napad`;
    }

    if (action.action_type === "attack_blocked") {
      text = `🛡️ Tarcza zablokowała atak`;
    }

    if (action.action_type === "attack_success") {
      text = `⚔️ Udany napad (+${action.amount} GC)`;
    }

    historyList.innerHTML += `
      <div class="rankingItem">
        ${text}
      </div>
    `;
  });
}
window.showScreen = showScreen;
window.showPage = showPage;
window.register = register;
window.login = login;
window.logout = logout;
window.claimDailyReward = claimDailyReward;
window.buyItem = buyItem;
window.attackPlayer = attackPlayer;
window.openChestWithAnimation = openChestWithAnimation;
window.buyStock = buyStock;
window.sellStock = sellStock;
