const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const editButtons = document.querySelectorAll(".btn-edit");

const completeCard = document.querySelectorAll(".card .number")[0];
const pendingCard = document.querySelectorAll(".card .number")[1];

const token = localStorage.getItem("authToken");

if (!token) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    window.location.href = "login.html";
}

function authFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
}

// ================== LOAD PROFILE ==================
async function loadProfile() {
    const res = await authFetch("http://localhost:3000/api/profile");
    const data = await res.json();

    usernameInput.value = data.username;
    emailInput.value = data.email;
}

// ================== UPDATE PROFILE ==================
async function updateProfile(field, value) {
    const res = await authFetch("http://localhost:3000/api/profile", {
        method: "PUT",
        body: JSON.stringify({
            username: field === "username" ? value : usernameInput.value,
            email: field === "email" ? value : emailInput.value
        })
    });

    if (!res.ok) {
        alert("อัปเดตข้อมูลไม่สำเร็จ");
        return;
    }

    alert("บันทึกสำเร็จ");
    loadProfile();
}

// =============== ENABLE EDIT BUTTONS ===============
editButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const input = document.getElementById(target);

        if (input.readOnly) {
            input.readOnly = false;
            input.focus();
            btn.textContent = "Save";
        } else {
            input.readOnly = true;
            btn.textContent = "Edit";
            updateProfile(target, input.value);
        }
    });
});

// ==================== STATS =======================
async function loadProcessStats() {
    const res = await authFetch("http://localhost:3000/api/process/stats");
    const data = await res.json();

    completeCard.textContent = data.completed;
    pendingCard.textContent = data.pending;
}

// ==================== INIT ========================
loadProfile();
loadProcessStats();
