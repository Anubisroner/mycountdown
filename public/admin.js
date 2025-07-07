let allUsers = [];

async function loadUsers() {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: {
      "x-user-id": localStorage.getItem("userId")
    }
  });

  allUsers = await res.json();
  filterAndDisplayUsers();
}

function displayUsers(users) {
  const container = document.getElementById("user-list");
  const currentUsername = localStorage.getItem("username");

  users.sort((a, b) => a.username.localeCompare(b.username));

  container.innerHTML = "";

  users.forEach(user => {
    const card = document.createElement("div");
    card.className = "admin-card";

    const topLine = document.createElement("div");
    topLine.className = "admin-card-top";

    const title = document.createElement("h4");
    title.innerHTML = user.username;

    if (user.isAdmin) {
      const crown = document.createElement("i");
      crown.className = "fas fa-crown admin-crown";
      crown.title = "Administrateur";
      title.appendChild(crown);
    }
    topLine.appendChild(title);

    if (user.username !== currentUsername) {
      const trash = document.createElement("i");
      trash.className = "fas fa-trash trash-icon";
      trash.title = "Supprimer cet utilisateur";
      trash.onclick = () => confirmUserDeletion(user._id, user.username);
      topLine.appendChild(trash);
    }

    const count = document.createElement("p");
    count.textContent = `${user.count} contenu(s) ajouté(s)`;

    card.appendChild(topLine);
    card.appendChild(count);
    container.appendChild(card);
  });
}

window.onload = () => {
  document.getElementById("user-search").addEventListener("input", filterAndDisplayUsers);
  document.getElementById("user-role-filter").addEventListener("change", filterAndDisplayUsers);

  const userId = localStorage.getItem("userId");
  if (!userId) {
    window.location.href = "/";
    return;
  }

  fetch(`${API_BASE}/api/users/check-admin/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.isAdmin) {
        window.location.href = "/";
        return;
      }
      updateLoginIcon();
      loadUsers();
    })
    .catch(err => {
      console.error("Erreur vérification admin :", err);
      window.location.href = "/";
    });

  updateLoginIcon();
  loadUsers();

  const searchInput = document.getElementById("user-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      const filtered = allUsers.filter(user =>
        user.username.toLowerCase().includes(query)
      );
      displayUsers(filtered);
    });
  }

  // === Loupe (recherche globale)
  const searchIcon = document.getElementById("search-icon");
  const searchContainer = document.getElementById("global-search-container");
  const searchInputGlobal = document.getElementById("global-search");

  if (searchIcon && searchContainer && searchInputGlobal) {
    searchIcon.style.display = "inline-block";

    searchIcon.onclick = () => {
      if (window.location.pathname !== "/" && window.location.pathname !== "/index.html") {
        localStorage.setItem("openSearch", "true");
        window.location.href = "/";
        return;
      }

      localStorage.removeItem("filter-type");
      localStorage.removeItem("filter-platform");

      const platformFilter = document.getElementById("platform-filters");
      if (platformFilter) platformFilter.style.display = "none";

      loadContent();

      const visible = searchContainer.style.display === "block";
      searchContainer.style.display = visible ? "none" : "block";

      if (!visible) {
        searchInputGlobal.value = "";
        searchInputGlobal.focus();
      }
    };

    searchInputGlobal.addEventListener("input", () => {
      const query = searchInputGlobal.value.trim().toLowerCase();
      const filtered = allContent.filter(item =>
        item.name.toLowerCase().includes(query)
      );
      displayContent(filtered);
    });
  }

  // Header actions + filtres
  document.getElementById("home").onclick = () => {
    localStorage.removeItem("filter-type");
    localStorage.removeItem("filter-platform");
    localStorage.removeItem("show-platforms");
    window.location.href = "/";
  };

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      localStorage.setItem("filter-type", type);

      if (type === "JEU") {
        localStorage.setItem("show-platforms", "true");
      } else {
        localStorage.removeItem("filter-platform");
        localStorage.removeItem("show-platforms");
      }

      window.location.href = "/";
    });
  });

  document.querySelectorAll(".platform-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const platform = btn.dataset.platform;
      localStorage.setItem("filter-platform", platform);
      window.location.href = "/";
    });
  });

  document.getElementById("help").onclick = () => openModal("modal-help");
  document.getElementById("admin-btn").onclick = () => location.href = "/admin.html";

  const loginIcon = document.getElementById("login");
  loginIcon.onclick = () => {
    if (isConnected()) {
      logout();
    } else {
      resetLoginForm();
      switchForm("register");
      openModal("modal-login");
    }
  };

  const addBtn = document.getElementById("add-btn");
  if (addBtn) {
    addBtn.onclick = () => {
      resetAddForm();
      openModal("modal-add");
    };
  }

  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.onclick = () => {
      window.location.href = "/profil.html";
    };
  }

  const notifBtn = document.getElementById("notif-btn");
  if (notifBtn) {
    notifBtn.onclick = async () => {
      const input = document.getElementById("notif-email");
      const msg = document.getElementById("notif-msg");
      const title = document.querySelector("#modal-notif h2");
      const emailInfo = document.getElementById("notif-email-info");
      const inscriptionBlock = document.getElementById("notif-inscription");
      const desinscriptionBlock = document.getElementById("notif-desinscription");
      const emailSaved = document.getElementById("notif-email-saved");

      const userId = localStorage.getItem("userId");
      if (!userId) return;

      // Réinitialisation
      if (input) input.value = "";
      if (msg) {
        msg.textContent = "";
        msg.style.color = "crimson";
      }
      if (emailInfo) emailInfo.textContent = "";

      // Vérifie l’inscription
      try {
        const res = await fetch(`${API_BASE}/api/notifications/status/${userId}`);
        const data = await res.json();
        const isSubscribed = res.ok && data.subscribed;

        if (isSubscribed) {
          if (title) title.textContent = "Déjà inscrit 😎";
          if (inscriptionBlock) inscriptionBlock.style.display = "none";
          if (desinscriptionBlock) desinscriptionBlock.style.display = "block";
          if (emailSaved) emailSaved.textContent = data.email;
        } else {
          if (title) title.textContent = "Reste informé des sorties 😉";
          if (inscriptionBlock) inscriptionBlock.style.display = "block";
          if (desinscriptionBlock) desinscriptionBlock.style.display = "none";
        }

        openModal("modal-notif");
      } catch (err) {
        console.error("Erreur vérification newsletter :", err);
      }
    };
  }
};

// Suppression utilisateur
let deleteUserId = null;
function confirmUserDeletion(id, name) {
  deleteUserId = id;
  document.getElementById("delete-user-text").textContent = `Supprimer ${name} :`;
  openModal("modal-delete-user");
}

async function deleteUser(mode) {
  if (!deleteUserId) return;

  let url = `${API_BASE}/api/admin/user/${deleteUserId}`;
  if (mode === "releases") url += "/releases";
  if (mode === "full") url += "/full";

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "x-user-id": localStorage.getItem("userId") }
    });

    let data = {};
    try {
      data = await res.json(); // tente de parser
    } catch (err) {
      console.warn("Réponse non JSON :", err);
    }

    if (res.ok) {
      closeModal("modal-delete-user");
      deleteUserId = null;
      loadUsers();
    } else {
      console.error("Erreur suppression :", data?.message || res.statusText);
    }

  } catch (err) {
    console.error("Erreur réseau :", err);
  }
}

function filterAndDisplayUsers() {
  const query = document.getElementById("user-search").value.trim().toLowerCase();
  const role = document.getElementById("user-role-filter").value;

  let filtered = allUsers.filter(user =>
    user.username.toLowerCase().includes(query)
  );

  if (role === "admins") {
    filtered = filtered.filter(user => user.isAdmin);
  } else if (role === "users") {
    filtered = filtered.filter(user => !user.isAdmin);
  }

  displayUsers(filtered);
}


async function checkNotificationStatus() {
  const emailSaved = localStorage.getItem("notif-email");
  const isSubscribed = !!emailSaved;

  const inscription = document.getElementById("notif-inscription");
  const desinscription = document.getElementById("notif-desinscription");
  const emailField = document.getElementById("notif-email-saved");

  if (isSubscribed) {
    inscription.style.display = "none";
    desinscription.style.display = "block";
    if (emailField) emailField.textContent = emailSaved;
  } else {
    inscription.style.display = "block";
    desinscription.style.display = "none";
  }
}

async function submitNotification() {
  const email = document.getElementById("notif-email").value.trim();
  const msg = document.getElementById("notif-msg");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    msg.textContent = "Adresse email invalide.";
    msg.style.color = "crimson";
    return;
  }

  const payload = {
    userId: localStorage.getItem("userId"),
    username: localStorage.getItem("username"),
    email
  };

  const res = await fetch(`${API_BASE}/api/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  msg.style.color = res.ok ? "green" : "crimson";
  msg.textContent = data.message;

  if (res.ok) {
    localStorage.setItem("notif-email", email);

    // Mise à jour du header (cloche en vert)
    if (typeof updateLoginIcon === "function") updateLoginIcon();

    // Ferme immédiatement la modale
    closeModal("modal-notif");
  }
}

async function unsubscribeNotification() {
  const userId = localStorage.getItem("userId");
  const msg = document.getElementById("notif-msg");

  if (!userId) return;

  try {
    const res = await fetch(`${API_BASE}/api/notifications/${userId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    msg.style.color = res.ok ? "green" : "crimson";
    msg.textContent = data.message;

    if (res.ok) {
      // Supprime l'email stocké localement
      localStorage.removeItem("notif-email");

      // Remet la cloche en blanc
      const notifBtn = document.getElementById("notif-btn");
      if (notifBtn) notifBtn.style.color = "white";

      // Met à jour le header complet si besoin
      if (typeof updateLoginIcon === "function") updateLoginIcon();

      // Ferme la modale
      closeModal("modal-notif");
    }
  } catch (err) {
    console.error("Erreur désinscription :", err);
    msg.style.color = "crimson";
    msg.textContent = "Erreur serveur lors de la désinscription.";
  }
}

document.getElementById("notif-btn").onclick = () => {
  document.getElementById("notif-email").value = "";
  document.getElementById("notif-msg").textContent = "";
  openModal("modal-notif");
};

async function submitNotification() {
  const email = document.getElementById("notif-email").value.trim();
  const msg = document.getElementById("notif-msg");
  const emailInfo = document.getElementById("notif-email-info");
  const title = document.querySelector("#modal-notif h2");

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    msg.style.color = "crimson";
    msg.textContent = "Adresse email invalide.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username, email })
    });

    const data = await res.json();

    msg.style.color = res.ok ? "green" : "crimson";
    msg.textContent = data.message;

    if (res.ok) {
      // Mise à jour de l'état
      document.getElementById("notif-inscription").style.display = "none";
      document.getElementById("notif-desinscription").style.display = "block";
      if (emailInfo) emailInfo.classList.remove("hidden");
      if (title) title.textContent = "Déjà inscrit 😎";

      // Change couleur cloche
      const notifBtn = document.getElementById("notif-btn");
      if (notifBtn) notifBtn.style.color = "#0f0";

      // Ferme la modale
      closeModal("modal-notif");
    }
  } catch (err) {
    msg.style.color = "crimson";
    msg.textContent = "Erreur lors de l'inscription.";
    console.error(err);
  }
}
