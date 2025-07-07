let userContent = [];

function loadUserContent() {
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    if (!userId || !username) {
        document.getElementById("profile-username").textContent = "Pseudo : non connecté";
        document.getElementById("profile-count").textContent = "Ajouts : 0";
        return;
    }

    // Afficher le pseudo
    document.getElementById("profile-username").textContent = `${username}`;

    fetch(`${API_BASE}/api/releases/all`)
        .then(res => res.json())
        .then(data => {
            userContent = data.filter(item => item.userId === userId);

            // Afficher le nombre d'ajouts
            document.getElementById("profile-count").textContent = `${userContent.length}`;

            // Afficher les cartes
            filterAndDisplayUserContent();
        })
        .catch(err => {
            console.error("Erreur chargement contenus utilisateur :", err);
            document.getElementById("profile-count").textContent = "Erreur de chargement";
        });
}

function filterAndDisplayUserContent() {
    const query = document.getElementById("profile-search").value.trim().toLowerCase();

    const selectedTypes = [...document.querySelectorAll(".filter-type:checked")].map(cb => cb.value);
    const selectedPlatforms = [...document.querySelectorAll(".filter-plateforme:checked")].map(cb => cb.value);
    const selectedDates = [...document.querySelectorAll(".filter-date:checked")].map(cb => cb.value);

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Comparaison à minuit

    const filtered = userContent.filter(item => {
        const matchName = item.name.toLowerCase().includes(query);
        const matchType = selectedTypes.length ? selectedTypes.includes(item.type) : true;
        const matchPlatform = item.type === "JEU"
            ? (selectedPlatforms.length ? selectedPlatforms.includes(item.platform) : true)
            : true;

        const releaseDate = item.releaseDate ? new Date(item.releaseDate) : null;
        if (releaseDate) releaseDate.setHours(0, 0, 0, 0);

        const matchDate = selectedDates.length
            ? (
                (selectedDates.includes("known") && releaseDate && releaseDate > now) ||
                (selectedDates.includes("unknown") && !releaseDate) ||
                (selectedDates.includes("past") && releaseDate && releaseDate <= now)
            )
            : true;

        return matchName && matchType && matchPlatform && matchDate;
    });

    displayUserContent(filtered);
}

function displayUserContent(data) {
    const container = document.getElementById("user-content-list");
    container.innerHTML = "";

    data.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return new Date(a.releaseDate) - new Date(b.releaseDate);
    });

    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";

        const topRight = document.createElement("div");
        topRight.style.textAlign = "right";
        topRight.style.marginBottom = "5px";
        topRight.style.paddingRight = "5px";

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
            updateCountdown(countdown, new Date(item.releaseDate));
            setInterval(() => updateCountdown(countdown, new Date(item.releaseDate)), 1000);
        }

        document.getElementById("profile-username").textContent = localStorage.getItem("username");
        document.getElementById("profile-count").textContent = `${userContent.length} ajout(s)`;

        card.appendChild(title);
        card.appendChild(type);
        if (extra.textContent) card.appendChild(extra);
        card.appendChild(date);
        card.appendChild(countdown);

        container.appendChild(card);
    });
}

window.onload = () => {
    updateLoginIcon();
    loadUserContent();


    const searchInput = document.getElementById("profile-search");
    if (searchInput) {
        searchInput.addEventListener("input", filterAndDisplayUserContent);
    }

    const filterInputs = document.querySelectorAll("#profile-filters input");
    filterInputs.forEach(input => {
        input.addEventListener("change", filterAndDisplayUserContent);
    });

    const help = document.getElementById("help");
    if (help) help.onclick = () => openModal("modal-help");

    const loginIcon = document.getElementById("login");
    if (loginIcon) {
        loginIcon.onclick = () => {
            if (isConnected) logout();
            else {
                resetLoginForm();
                switchForm("register");
                openModal("modal-login");
            }
        };
    }

    const addBtn = document.getElementById("add-btn");
    if (addBtn) {
        addBtn.onclick = () => {
            resetAddForm();
            openModal("modal-add");
        };
    }

    const adminBtn = document.getElementById("admin-btn");
    if (adminBtn) {
        adminBtn.onclick = () => window.location.href = "/admin.html";
    }

    const profileBtn = document.getElementById("profile-btn");
    if (profileBtn) {
        profileBtn.onclick = () => window.location.href = "/profil.html";
    }

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.dataset.type;
            localStorage.setItem("filter-type", type);
            if (type === "JEU") {
                document.getElementById("platform-filters").style.display = "flex";
            } else {
                document.getElementById("platform-filters").style.display = "none";
                localStorage.removeItem("filter-platform");
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

    const home = document.getElementById("home");
    if (home) {
        home.onclick = () => {
            localStorage.removeItem("filter-type");
            localStorage.removeItem("filter-platform");
            document.getElementById("platform-filters").style.display = "none";
            window.location.href = "/";
        };
    }

    // Gestion de la loupe depuis la page profil
    const searchIcon = document.getElementById("search-icon");
    const searchContainer = document.getElementById("global-search-container");
    const input = document.getElementById("global-search"); // <- renommé

    if (searchIcon && searchContainer && input) {
        searchIcon.style.display = "inline-block";

        if (localStorage.getItem("openSearch") === "true") {
            localStorage.removeItem("openSearch");
            requestAnimationFrame(() => {
                searchIcon.click();
            });
        }

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
                input.value = "";
                input.focus();
            }
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
