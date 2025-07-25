// 🌐 API locale pour le développement
// const API_BASE = "http://localhost:3000";

// 🌍 API distante pour la production
const API_BASE = "https://mycountdown.onrender.com";

let isAdmin = false;

// === Connexion / Déconnexion ===
function isConnected() {
    return !!localStorage.getItem("token");
}

function logout() {
    localStorage.clear();
    isAdmin = false;
    updateLoginIcon();
    window.location.href = "/";
}

// === Gestion des modales ===
function openModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = "flex";
    modal.onclick = (e) => {
        if (e.target === modal) closeModal(id);
    };
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = "none";
    modal.onclick = null;
}

// === Switch formulaire inscription / connexion ===
function switchForm(target) {
    const regForm = document.getElementById("form-register");
    const logForm = document.getElementById("form-login");
    const regTab = document.getElementById("tab-register");
    const logTab = document.getElementById("tab-login");

    if (target === "login") {
        regForm.classList.add("hidden-form");
        logForm.classList.remove("hidden-form");
        regTab.classList.remove("active");
        logTab.classList.add("active");
    } else {
        logForm.classList.add("hidden-form");
        regForm.classList.remove("hidden-form");
        logTab.classList.remove("active");
        regTab.classList.add("active");
    }
}

// === Réinitialisation des formulaires ===
function resetLoginForm() {
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-password").value = "";
    document.getElementById("reg-msg").textContent = "";

    document.getElementById("log-username").value = "";
    document.getElementById("log-password").value = "";
    document.getElementById("log-msg").textContent = "";
}

function resetAddForm() {
    document.getElementById("add-name").value = "";
    document.getElementById("add-type").value = "";
    document.getElementById("add-season").value = "";
    document.getElementById("add-platform").value = "";
    document.getElementById("add-cover").value = "";
    document.getElementById("add-url").value = "";
    document.getElementById("add-date").value = "";
    document.getElementById("add-msg").textContent = "";
    handleTypeChange();
}

// === Inscription + auto-login ===
async function register() {
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const msg = document.getElementById("reg-msg");

    if (!username || !password) {
        msg.textContent = "Champs requis.";
        return;
    }

    if (username.length > 15) {
        msg.textContent = "Le pseudo ne doit pas dépasser 15 caractères.";
        return;
    }

    if (password.length < 8 || password.length > 20) {
        msg.textContent = "Le mot de passe doit contenir entre 8 et 20 caractères.";
        return;
    }

    // Récupère le token reCAPTCHA
    const token = grecaptcha.getResponse();
    if (!token) {
        msg.textContent = "Veuillez valider le captcha.";
        return;
    }

    const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, token })
    });

    const data = await res.json();
    msg.textContent = data.message;

    if (res.ok) {
        grecaptcha.reset();
        await login(username, password);
    }
}

// === Connexion ===
async function login(username = null, password = null) {
    if (!username) username = document.getElementById("log-username").value.trim();
    if (!password) password = document.getElementById("log-password").value.trim();
    const msg = document.getElementById("log-msg");

    if (!username || !password) {
        msg.textContent = "Champs requis.";
        return;
    }

    const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    msg.textContent = data.message;

    if (res.ok) {
        const decodedToken = JSON.parse(atob(data.token.split('.')[1]));

        localStorage.setItem("username", username);
        localStorage.setItem("userId", decodedToken.userId);
        localStorage.setItem("token", data.token);

        // ✅ Vérifie si l'utilisateur est admin
        try {
            const check = await fetch(`${API_BASE}/api/users/check-admin/${decodedToken.userId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${data.token}`
                }
            });

            if (check.ok) {
                const checkData = await check.json();
                if (checkData.isAdmin) {
                    isAdmin = true;
                }
            }
        } catch (err) {
            console.warn("ℹ️ Utilisateur non admin (normal)");
        }

        closeModal("modal-login");
        updateLoginIcon();
        loadContent();
    }
}

// === Envoi d'un contenu vers l’API ===
async function submitContent() {
    const msg = document.getElementById("add-msg");
    const name = document.getElementById("add-name").value.trim();

    const nameRegex = /^[\wÀ-ÿ0-9 :\-]+$/;
    if (!nameRegex.test(name)) {
        msg.textContent = "Le nom contient des caractères non autorisés.";
        return;
    }

    const type = document.getElementById("add-type").value;
    const season = document.getElementById("add-season").value;
    const platform = document.getElementById("add-platform").value;
    const cover = document.getElementById("add-cover").value.trim();
    const url = document.getElementById("add-url").value.trim();
    const releaseDate = document.getElementById("add-date").value;
    const token = localStorage.getItem("token");

    if (!name || !type || !cover || !url || !token) {
        msg.textContent = "Tous les champs sont obligatoires sauf la date.";
        return;
    }

    if (type === "SERIE" && !season) {
        msg.textContent = "Veuillez indiquer la saison.";
        return;
    }

    if (type === "JEU" && !platform) {
        msg.textContent = "Veuillez sélectionner une plateforme.";
        return;
    }

    const payload = {
        name,
        type,
        cover,
        url,
        releaseDate: releaseDate || null
    };

    if (type === "SERIE") payload.season = Number(season);
    if (type === "JEU") payload.platform = platform;

    let res;
    try {
        if (editId) {
            res = await fetch(`${API_BASE}/api/releases/update/${editId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_BASE}/api/releases/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        msg.textContent = data.message;

        if (res.ok) {
            closeModal("modal-add");
            resetAddForm();

            if (typeof loadContent === "function") loadContent();
            if (typeof loadUserContent === "function") loadUserContent();
        }
    } catch (err) {
        msg.textContent = "Erreur lors de l'ajout du contenu.";
        console.error(err);
    }
}

// === Mise à jour des icônes selon l'état ===
async function updateLoginIcon() {
    const icon = document.getElementById("login");
    const addBtn = document.getElementById("add-btn");
    const adminBtn = document.getElementById("admin-btn");
    const profileBtn = document.getElementById("profile-btn");
    const notifBtn = document.getElementById("notif-btn");

    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    const isConnected = !!token;

    if (profileBtn) profileBtn.style.display = isConnected ? "inline-block" : "none";
    if (notifBtn) {
        notifBtn.style.display = isConnected ? "inline-block" : "none";

        if (isConnected && userId) {
            try {
                const res = await fetch(`${API_BASE}/api/notifications/status/${userId}`);
                const data = await res.json();
                notifBtn.style.color = (res.ok && data.subscribed) ? "#0f0" : "white";
            } catch {
                notifBtn.style.color = "white";
            }
        } else {
            notifBtn.style.color = "white";
        }
    }

    if (addBtn) addBtn.style.display = isConnected ? "inline-block" : "none";

    if (icon) {
        icon.className = isConnected ? "fas fa-right-from-bracket" : "fas fa-right-to-bracket";
        icon.style.color = isConnected ? "crimson" : "green";
        icon.title = isConnected ? "Déconnexion" : "Connexion";
    }

    if (adminBtn) {
        adminBtn.style.display = "none";
        if (isConnected && token) {

            try {
                const res = await fetch(`${API_BASE}/api/users/check-admin/${userId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                const data = await res.json();
                isAdmin = res.ok && data.isAdmin;
                if (isAdmin) adminBtn.style.display = "inline-block";
            } catch {
                adminBtn.style.display = "none";
            }
        }
    }
}

// === Changement des champs selon le type ===
function handleTypeChange() {
    const type = document.getElementById("add-type").value;
    document.getElementById("saison-field").style.display = type === "SERIE" ? "block" : "none";
    document.getElementById("platform-field").style.display = type === "JEU" ? "block" : "none";
}

// === Initialisation globale ===
window.onload = async () => {
    await updateLoginIcon();
    loadContent();

    const searchIcon = document.getElementById("search-icon");
    const searchContainer = document.getElementById("global-search-container");
    const searchInput = document.getElementById("global-search");

    const dynamicInputs = document.querySelectorAll("#dynamic-profile-filters input");
    dynamicInputs.forEach(input => {
        input.addEventListener("input", loadContent);
    });


    if (searchIcon && searchContainer && searchInput) {
        // Affiche la loupe sur toutes les pages
        searchIcon.style.display = "inline-block";

        if (localStorage.getItem("openSearch") === "true") {
            localStorage.removeItem("openSearch");
            requestAnimationFrame(() => {
                searchIcon.click();
            });
        }

        searchIcon.onclick = () => {
            // Si pas sur la page d'accueil → rediriger
            if (window.location.pathname !== "/" && window.location.pathname !== "/index.html") {
                window.location.href = "/";
                return;
            }

            // Réinitialiser les filtres
            localStorage.removeItem("filter-type");
            localStorage.removeItem("filter-platform");

            const platformFilter = document.getElementById("platform-filters");
            if (platformFilter) platformFilter.style.display = "none";

            loadContent();

            // Afficher / masquer la barre de recherche
            const visible = searchContainer.style.display === "block";
            searchContainer.style.display = visible ? "none" : "block";

            if (!visible) {
                searchInput.value = "";
                searchInput.focus();
            }
        };

        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            const filtered = allContent.filter(item =>
                item.name.toLowerCase().includes(query)
            );
            displayContent(filtered);
        });
    }

    const currentFilter = localStorage.getItem("filter-type");
    const platformFilter = document.getElementById("platform-filters");
    if (currentFilter === "JEU" && platformFilter) {
        platformFilter.style.display = "flex";
    }


    const adminBtn = document.getElementById("admin-btn");
    if (adminBtn) {
        adminBtn.onclick = () => {
            window.location.href = "/admin.html";
        };
    }

    const profileBtn = document.getElementById("profile-btn");
    if (profileBtn) {
        profileBtn.onclick = () => {
            window.location.href = "/profil.html";
        };
    }

    const home = document.getElementById("home");
    if (home) {
        home.onclick = () => {
            localStorage.removeItem("filter-type");
            localStorage.removeItem("filter-platform");
            const platformFilter = document.getElementById("platform-filters");
            if (platformFilter) platformFilter.style.display = "none";
            window.location.href = "/";
        };
    }

    const nameInput = document.getElementById("add-name");
    if (nameInput) {
        nameInput.addEventListener("blur", async () => {
            const name = nameInput.value.trim();
            const msg = document.getElementById("add-msg");

            if (!name) return;

            const res = await fetch(`${API_BASE}/api/releases/check-name?name=${encodeURIComponent(name)}`);
            const data = await res.json();

            if (res.ok && data.exists) {
                msg.style.color = "crimson";
                msg.textContent = "Ce nom existe déjà.";
            } else {
                msg.textContent = "";
            }
        });
    }


    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.dataset.type;
            localStorage.setItem("filter-type", type);

            const platformFilter = document.getElementById("platform-filters");
            if (type === "JEU") {
                if (platformFilter) platformFilter.style.display = "flex";
            } else {
                if (platformFilter) platformFilter.style.display = "none";
                localStorage.removeItem("filter-platform");
            }

            // Fermer la barre de recherche globale si elle est ouverte
            const searchContainer = document.getElementById("global-search-container");
            if (searchContainer) searchContainer.style.display = "none";

            // 👇 Gérer les filtres dynamiques de profil sur la page d’accueil uniquement
            if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
                const profileFilters = document.getElementById("dynamic-profile-filters");
                if (profileFilters) {
                    if (type === "UNKNOWN_DATE") {
                        profileFilters.classList.remove("hidden");
                    } else {
                        profileFilters.classList.add("hidden");
                    }
                }
            }

            loadContent();
        });
    });

    document.querySelectorAll(".platform-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const platform = btn.dataset.platform;
            localStorage.setItem("filter-platform", platform);
            loadContent();
        });
    });

    const help = document.getElementById("help");
    if (help) help.onclick = () => openModal("modal-help");

    const loginIcon = document.getElementById("login");
    loginIcon.onclick = () => {
        const isConnected = !!localStorage.getItem("token");

        if (isConnected) {
            logout();
        } else {
            resetLoginForm();
            switchForm("login");
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

    const notifBtn = document.getElementById("notif-btn");
    if (notifBtn) {
        notifBtn.onclick = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                // Ouvre la modale login
                resetLoginForm();
                switchForm("register");
                openModal("modal-login");
                return;
            }

            const userId = localStorage.getItem("userId");
            if (!userId) return;

            const input = document.getElementById("notif-email");
            const msg = document.getElementById("notif-msg");
            const title = document.querySelector("#modal-notif h2");
            const emailInfo = document.getElementById("notif-email-info");
            const inscriptionBlock = document.getElementById("notif-inscription");
            const desinscriptionBlock = document.getElementById("notif-desinscription");
            const emailSaved = document.getElementById("notif-email-saved");

            // Réinitialisation
            if (input) input.value = "";
            if (msg) {
                msg.textContent = "";
                msg.style.color = "crimson";
            }
            if (emailInfo) emailInfo.textContent = "";

            try {
                const res = await fetch(`${API_BASE}/api/notifications/status/${userId}`, {
                    headers: { Authorization: token }
                });
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

    // Si les filtres dynamiques sont présents (Date inconnue), activer les filtres
    const dynamicFilters = document.querySelector("#dynamic-profile-filters");
    if (dynamicFilters) {
        dynamicFilters.querySelectorAll("input").forEach(input => {
            input.addEventListener("change", loadContent);
        });

        const dynamicSearch = document.getElementById("dynamic-search");
        if (dynamicSearch) {
            dynamicSearch.addEventListener("input", loadContent);
        }
    }
};

// Filtre page d'accueil pour Date inconnue
function applyDynamicProfileFilters(content) {
    const query = document.getElementById("dynamic-search")?.value.trim().toLowerCase();

    const selectedTypes = [...document.querySelectorAll(".dynamic-type:checked")].map(cb => cb.value);
    const selectedPlatforms = [...document.querySelectorAll(".dynamic-platform:checked")].map(cb => cb.value);
    const selectedDates = [...document.querySelectorAll(".dynamic-date:checked")].map(cb => cb.value);

    return content.filter(item => {
        const matchName = query ? item.name.toLowerCase().includes(query) : true;
        const matchType = selectedTypes.length ? selectedTypes.includes(item.type) : true;
        const matchPlatform = item.type === "JEU"
            ? (selectedPlatforms.length ? selectedPlatforms.includes(item.platform) : true)
            : true;
        const matchDate = selectedDates.length
            ? (
                (selectedDates.includes("known") && item.releaseDate) ||
                (selectedDates.includes("unknown") && !item.releaseDate)
            )
            : true;

        return matchName && matchType && matchPlatform && matchDate;
    });
}


const profileBtn = document.getElementById("profile-btn");
if (profileBtn) {
    profileBtn.onclick = () => {
        window.location.href = "/profil.html";
    };
}

// Home / Aide
document.getElementById("home").onclick = () => location.reload();
document.getElementById("help").onclick = () => openModal("modal-help");

// Login ou logout selon état
const loginIcon = document.getElementById("login");
if (loginIcon) {
    loginIcon.onclick = () => {
        if (localStorage.getItem("token")) {
            logout();
        } else {
            resetLoginForm();
            switchForm("register");
            openModal("modal-login");
        }
    };
}

// Bouton ajout
const addBtn = document.getElementById("add-btn");
if (addBtn) {
    addBtn.onclick = () => {
        resetAddForm();
        openModal("modal-add");
    };
}

// === Affichage des cards ===
let allContent = [];

async function loadContent() {
    const res = await fetch(`${API_BASE}/api/releases/all`);

    if (!res.ok) {
        console.error("Erreur lors du chargement des contenus :", res.status);
        return;
    }

    allContent = await res.json();
    let data = [...allContent];

    const container = document.getElementById("content-list");
    if (!container) return;

    const filterType = localStorage.getItem("filter-type");
    const filterPlatform = localStorage.getItem("filter-platform");

    const isUnknownDateFilter = filterType === "UNKNOWN_DATE";
    const isPastFilter = filterType === "ALREADY_RELEASED";
    const dynamicFilters = document.getElementById("dynamic-profile-filters");

    if (dynamicFilters) {
        dynamicFilters.style.display = (isUnknownDateFilter || isPastFilter) ? "block" : "none";
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (filterType === "UNKNOWN_DATE") {
        data = data.filter(item => !item.releaseDate);
        data = applyDynamicProfileFilters(data);
    } else if (filterType === "ALREADY_RELEASED") {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        data = data.filter(item => {
            if (!item.releaseDate) return false;
            const date = new Date(item.releaseDate);
            date.setHours(0, 0, 0, 0);
            return date <= now;
        });
        data = applyDynamicProfileFilters(data);
    } else {
        data = data.filter(item => {
            const releaseDate = item.releaseDate ? new Date(item.releaseDate) : null;
            if (releaseDate) releaseDate.setHours(0, 0, 0, 0);

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            if (releaseDate && releaseDate <= now) return false; // exclure si déjà sorti

            if (filterType && item.type !== filterType) return false;
            if (filterType === "JEU" && filterPlatform && item.platform !== filterPlatform) return false;

            return true;
        });
    }

    container.innerHTML = "";

    data.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return new Date(a.releaseDate) - new Date(b.releaseDate);
    });

    displayContent(data);
}

// Fonction de mise à jour du compte à rebours
function updateCountdown(element, date) {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0); // Date de sortie minuit
    const now = new Date();
    const diff = target - now;

    const currentFilter = localStorage.getItem("filter-type");

    if (diff <= 0) {
        if (currentFilter === "PAST") {
            element.textContent = "Disponible !";
        } else {
            element.textContent = "";
        }
        return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    element.textContent = `${days}j ${hours}h ${minutes}m ${seconds}s`;
}


// === Edition des cards ===
let editId = null;
function resetAddForm() {
    editId = null;

    document.getElementById("add-name").value = "";
    document.getElementById("add-type").value = "";
    document.getElementById("add-season").value = "";
    document.getElementById("add-platform").value = "";
    document.getElementById("add-cover").value = "";
    document.getElementById("add-url").value = "";
    document.getElementById("add-date").value = "";
    document.getElementById("add-msg").textContent = "";

    document.getElementById("add-submit-btn").textContent = "Ajouter";

    handleTypeChange();
}

// === Suppression des cards ===
let deleteId = null;
const token = localStorage.getItem("token");
async function confirmDelete() {
    if (!deleteId) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE}/api/releases/delete/${deleteId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (res.ok) {
            closeModal("modal-delete");
            deleteId = null;

            if (typeof loadContent === "function") loadContent();
            if (typeof loadUserContent === "function") loadUserContent();
        } else {
            alert("Erreur lors de la suppression : " + data.message);
        }
    } catch (err) {
        console.error("Erreur suppression :", err);
    }
}


function displayContent(data) {
    const container = document.getElementById("content-list");
    container.innerHTML = "";

    const showPast = localStorage.getItem("filter-type") === "ALREADY_RELEASED";
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Minuit

    data.forEach(item => {
        const hasDate = !!item.releaseDate;
        const targetDate = new Date(item.releaseDate);
        targetDate.setHours(0, 0, 0, 0); // Assurer minuit
        const isPast = hasDate && targetDate <= now;

        if (!showPast && isPast) return;

        const card = document.createElement("div");
        card.className = "card";

        const currentUserId = localStorage.getItem("userId");
        const isOwner = item.userId === currentUserId;

        const topRight = document.createElement("div");
        topRight.className = "top-icons";

        if (isOwner || isAdmin) {
            const deleteBtn = document.createElement("i");
            deleteBtn.className = "fas fa-trash delete-btn";
            deleteBtn.style.cursor = "pointer";
            deleteBtn.style.color = "#a00";
            deleteBtn.style.marginLeft = "10px";
            deleteBtn.onclick = () => {
                deleteId = item._id;
                document.getElementById("delete-text").textContent = `Supprimer "${item.name}" ?`;
                openModal("modal-delete");
            };

            const editBtn = document.createElement("i");
            editBtn.className = "fas fa-pen edit-btn";
            editBtn.style.cursor = "pointer";
            editBtn.style.color = "#555";
            editBtn.onclick = () => {
                editId = item._id;
                document.getElementById("add-name").value = item.name;
                document.getElementById("add-type").value = item.type;
                document.getElementById("add-cover").value = item.cover;
                document.getElementById("add-url").value = item.url;
                document.getElementById("add-date").value = item.releaseDate ? item.releaseDate.split("T")[0] : "";

                handleTypeChange();
                if (item.type === "JEU") {
                    document.getElementById("add-platform").value = item.platform;
                } else if (item.type === "SERIE") {
                    document.getElementById("add-season").value = item.season;
                }

                document.getElementById("add-submit-btn").textContent = "Modifier";
                openModal("modal-add");
            };

            topRight.appendChild(editBtn);
            topRight.appendChild(deleteBtn);
        }

        card.appendChild(topRight);

        const link = document.createElement("a");
        link.href = item.url;
        link.target = "_blank";

        const img = document.createElement("img");
        img.src = item.cover;
        img.alt = item.name;
        link.appendChild(img);
        card.appendChild(link);

        const title = document.createElement("h4");
        title.textContent = item.name;

        const type = document.createElement("p");
        type.textContent = `Type : ${item.type}`;

        const extra = document.createElement("p");
        if (item.type === "JEU") {
            extra.textContent = `Plateforme : ${item.platform}`;
        } else if (item.type === "SERIE") {
            extra.textContent = `Saison : ${item.season}`;
        }

        const date = document.createElement("p");
        if (item.releaseDate) {
            const releaseDate = new Date(item.releaseDate);
            date.textContent = `Sortie : ${releaseDate.toLocaleDateString("fr-FR")}`;
        } else {
            date.textContent = "Date inconnue";
        }

        const countdown = document.createElement("p");
        countdown.className = "countdown";
        if (item.releaseDate) {
            const targetDate = new Date(item.releaseDate);
            targetDate.setHours(0, 0, 0, 0);

            updateCountdown(countdown, targetDate);
            setInterval(() => updateCountdown(countdown, targetDate), 1000);
        } else {
            countdown.textContent = "";
        }

        card.appendChild(title);
        card.appendChild(type);
        if (extra.textContent) card.appendChild(extra);
        card.appendChild(date);
        card.appendChild(countdown);

        container.appendChild(card);
    });
}

document.getElementById("notif-btn").onclick = () => {
    document.getElementById("notif-email").value = "";
    document.getElementById("notif-msg").textContent = "";
    openModal("modal-notif");
};

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
    const emailInfo = document.getElementById("notif-email-info");
    const title = document.querySelector("#modal-notif h2");

    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        msg.style.color = "crimson";
        msg.textContent = "Adresse email invalide.";
        return;
    }

    if (!token) {
        msg.style.color = "crimson";
        msg.textContent = "Token manquant, veuillez vous reconnecter.";
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/notifications`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ userId, username, email })
        });

        const data = await res.json();

        msg.style.color = res.ok ? "green" : "crimson";
        msg.textContent = data.message;

        if (res.ok) {
            document.getElementById("notif-inscription").style.display = "none";
            document.getElementById("notif-desinscription").style.display = "block";
            if (emailInfo) emailInfo.classList.remove("hidden");
            if (title) title.textContent = "Déjà inscrit 😎";

            const notifBtn = document.getElementById("notif-btn");
            if (notifBtn) notifBtn.style.color = "#0f0";

            closeModal("modal-notif");
        }
    } catch (err) {
        console.error("Erreur lors de l'inscription :", err);
        msg.style.color = "crimson";
        msg.textContent = "Erreur lors de l'inscription.";
    }
}

async function unsubscribeNotification() {
    const msg = document.getElementById("notif-msg");
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/api/notifications/${userId}`, {
            method: "DELETE",
        });

        const data = await res.json();

        msg.style.color = res.ok ? "green" : "crimson";
        msg.textContent = data.message;

        if (res.ok) {
            localStorage.removeItem("notif-email");

            const notifBtn = document.getElementById("notif-btn");
            if (notifBtn) notifBtn.style.color = "white";

            if (typeof updateLoginIcon === "function") updateLoginIcon();

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

// === Activer les filtres dynamiques si visibles ===
function setupDynamicFilters() {
    const typeFilters = document.querySelectorAll(".filter-type");
    const platformFilters = document.querySelectorAll(".filter-plateforme");

    typeFilters.forEach(cb => {
        cb.addEventListener("change", () => {
            const selected = [...typeFilters].filter(c => c.checked).map(c => c.value);
            const filtered = allContent.filter(item => selected.length === 0 || selected.includes(item.type));
            displayContent(filtered);
        });
    });

    platformFilters.forEach(cb => {
        cb.addEventListener("change", () => {
            const selected = [...platformFilters].filter(c => c.checked).map(c => c.value);
            const filtered = allContent.filter(item =>
                item.type === "JEU" && (selected.length === 0 || selected.includes(item.platform))
            );
            displayContent(filtered);
        });
    });
}

// === Réactiver les filtres si section affichée ===
const dynamicFilters = document.querySelectorAll("#dynamic-filters input");
dynamicFilters.forEach(input => {
    input.addEventListener("change", () => {
        loadContent();
    });
});

// Patch global pour supprimer le warning [Violation] sur mobile
document.addEventListener("touchstart", function () { }, { passive: true });

// Menu burger toggle mobile
const burgerMenu = document.getElementById("burger-menu");
const header = document.querySelector("header");
const burgerIcon = burgerMenu.querySelector("i");

burgerMenu.addEventListener("click", () => {
    burgerMenu.classList.toggle("active");
    header.classList.toggle("active");

    burgerIcon.style.opacity = 0;

    setTimeout(() => {
        burgerIcon.classList.toggle("fa-bars");
        burgerIcon.classList.toggle("fa-times");
        burgerIcon.style.opacity = 1;
    }, 200);
});


// 🔒 Désactive clic droit
document.addEventListener("contextmenu", (e) => e.preventDefault());

// 🔒 Désactive certaines touches (F12, Ctrl+Shift+I/J/U, Ctrl+U)
document.addEventListener("keydown", (e) => {
    if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && ["U", "S"].includes(e.key))
    ) {
        e.preventDefault();
    }
});

(function () {
    let matrixLaunched = false;
    let lastStateOpen = false;

    console.clear();
    const matrixMessage = `

████████╗██╗   ██╗    ███████╗███████╗                 
╚══██╔══╝██║   ██║    ██╔════╝██╔════╝                 
   ██║   ██║   ██║    █████╗  ███████╗                 
   ██║   ██║   ██║    ██╔══╝  ╚════██║                 
   ██║   ╚██████╔╝    ███████╗███████║                 
   ╚═╝    ╚═════╝     ╚══════╝╚══════╝      

██████╗  █████╗ ███╗   ██╗███████╗    ██╗      █████╗  
██╔══██╗██╔══██╗████╗  ██║██╔════╝    ██║     ██╔══██╗ 
██║  ██║███████║██╔██╗ ██║███████╗    ██║     ███████║ 
██║  ██║██╔══██║██║╚██╗██║╚════██║    ██║     ██╔══██║ 
██████╔╝██║  ██║██║ ╚████║███████║    ███████╗██║  ██║ 
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝    ╚══════╝╚═╝  ╚═╝ 

███╗   ███╗ █████╗ ████████╗██████╗ ██╗ ██████╗███████╗
████╗ ████║██╔══██╗╚══██╔══╝██╔══██╗██║██╔════╝██╔════╝
██╔████╔██║███████║   ██║   ██████╔╝██║██║     █████╗  
██║╚██╔╝██║██╔══██║   ██║   ██╔══██╗██║██║     ██╔══╝  
██║ ╚═╝ ██║██║  ██║   ██║   ██║  ██║██║╚██████╗███████╗
╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝

███╗   ██╗███████╗ ██████╗                             
████╗  ██║██╔════╝██╔═══██╗                            
██╔██╗ ██║█████╗  ██║   ██║                            
██║╚██╗██║██╔══╝  ██║   ██║                            
██║ ╚████║███████╗╚██████╔╝                            
╚═╝  ╚═══╝╚══════╝ ╚═════╝                             

`;

    console.log(`%c${matrixMessage}`, 'color: #00ff00; font-size: 12px; font-family: monospace;');

    function launchMatrixEffect() {
        if (matrixLaunched) return;
        matrixLaunched = true;

        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '9999';
        canvas.style.pointerEvents = 'none';
        canvas.style.background = 'black';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const katakana = 'アァイィウヴエェオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const fontSize = 16;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = new Array(columns).fill(1);

        function draw() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#0F0';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = katakana[Math.floor(Math.random() * katakana.length)];
                const x = i * fontSize;
                const y = drops[i] * fontSize;

                ctx.fillText(text, x, y);

                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                drops[i]++;
            }
        }

        const matrixInterval = setInterval(draw, 70);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearInterval(matrixInterval);
                canvas.remove();
                console.clear();
                console.log('%cAnimation Matrix arrêtée.', 'color: red; font-weight: bold;');
            }
        });

        // ✅ Ajuste le canvas si la fenêtre change de taille
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    // 🔁 Vérifie ouverture / fermeture de console via debugger delay
    setInterval(() => {
        const before = performance.now();
        debugger;
        const after = performance.now();

        const delta = after - before;
        const isOpen = delta > 100;

        if (!isOpen && lastStateOpen && !matrixLaunched) {
            launchMatrixEffect();
        }

        lastStateOpen = isOpen;
    }, 500);
})();
