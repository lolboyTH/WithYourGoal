// ========================= GLOBAL STATE =========================
const state = {
    goals: [],
    categories: [],
    currentCategory: '' // ใช้ชื่อ category
};

// ========================= AUTH FETCH ===========================
function authFetch(url, options = {}) {
    const token = localStorage.getItem("authToken");
    return fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
}

// ====================== MAIN APP LOADER =========================
document.addEventListener("DOMContentLoaded", async () => {

    await fetchCategories();

    if (state.currentCategory) {
        await fetchGoals();
    }

    renderAll();
});

// ========================= API FUNCTIONS =========================

// -------- Fetch All Categories --------
async function fetchCategories() {
    try {
        const res = await authFetch("http://localhost:3000/api/category");

        if (!res.ok) throw new Error("Failed to load categories");

        const data = await res.json();
        state.categories = data;

        // ถ้าไม่มี currentCategory → ตั้งค่าอัตโนมัติเป็นหมวดแรก
        if (!state.currentCategory && data.length > 0) {
            state.currentCategory = data[0].name;
        }

        renderCategoryMenu();

    } catch (err) {
        console.error("Error loading categories:", err);
    }
}

// -------- Fetch Goals for Current Category --------
async function fetchGoals() {
    try {
        if (!state.currentCategory) {
            console.warn("No category selected — skipping goal fetch");
            return;
        }

        const res = await authFetch("http://localhost:3000/api/goals");
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const data = await res.json();

        // filter เฉพาะของ category นี้
        state.goals = data.filter(g => g.category_name === state.currentCategory);

    } catch (err) {
        console.error("Error fetching goals:", err);
    }
}


// ========================= DOM ELEMENTS =========================
const categoryTrigger = document.getElementById('category-trigger');
const currentCategoryText = document.getElementById('current-category-text');
const categoryMenu = document.getElementById('category-menu');
const categoryList = document.getElementById('category-list');
const addCategoryBtn = document.getElementById('add-category-btn');

const goalInput = document.querySelector('.goal-input');
const prevBtn = document.getElementById('prev-goal-btn');
const nextBtn = document.getElementById('next-goal-btn');
const addGoalFab = document.getElementById('add-new-goal-btn');
const deleteGoalBtn = document.getElementById('delete-goal-btn');

const heartsContainer = document.getElementById('hearts');
const closeHeartBtn = document.querySelector('.close-btn');

const ruleList = document.getElementById('rule-list');
const addRuleBtn = document.querySelector('.rule-card .card-footer');

const processList = document.getElementById('process-list');
const addProcessBtn = document.querySelector('.process-card .card-footer');

let currentGoalIndex = 0;
let goalEditing = false;



// ========================= RENDER FUNCTIONS =========================

function renderRules(rules) {
    ruleList.innerHTML = "";

    rules.forEach((rule, index) => {
        const div = document.createElement("div");
        div.className = "list-item";

        div.innerHTML = `
            <span>• ${rule.text}</span>
            <i class="fa-solid fa-trash delete-icon"></i>
        `;

        div.querySelector(".delete-icon").addEventListener("click", () => {
            const goal = state.goals[currentGoalIndex];
            if (!goal) return;

            if (confirm("ต้องการลบกฎข้อนี้หรือไม่?")) {
                deleteRule(goal.id, index); 
            }
        });

        ruleList.appendChild(div);
    });
}


function renderProcesses(processes) {
    processList.innerHTML = "";

    processes.forEach(proc => {
        const div = document.createElement("div");
        div.className = "list-item";

        div.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" ${proc.checked ? "checked" : ""}>
                <span class="checkmark"></span>
                <span class="text" style="${proc.checked ? "text-decoration:line-through; opacity:0.5" : ""}">
                    ${proc.text}
                </span>
            </label>
            <i class="fa-solid fa-trash delete-icon"></i>
        `;

        div.querySelector(".delete-icon").addEventListener("click", () => {
            if (confirm("ต้องการลบรายการนี้หรือไม่?")) {
                deleteProcess(proc.id);
            }
        });

        div.querySelector("input").addEventListener("change", e => {
            updateProcess(proc.id, e.target.checked);
        });

        processList.appendChild(div);
    });
}



function renderAll() {
    const goals = state.goals;
    const currentCat = state.categories.find(c => c.name === state.currentCategory);

    currentCategoryText.innerText = currentCat ? currentCat.name : "หมวดหมู่";

    // ถ้าไม่มีหมวดหมู่ หรือ ไม่มีเป้าหมาย
    if (!currentCat || goals.length === 0) {
        goalInput.disabled = true;
        goalInput.value = "";
        ruleList.innerHTML = `<div class="list-item">ไม่มีเป้าหมาย</div>`;
        processList.innerHTML = `<div class="list-item">ไม่มีเป้าหมาย</div>`;
        renderHearts(0);

        prevBtn.classList.add("disabled");
        nextBtn.classList.add("disabled");

        deleteGoalBtn.style.display = 'none';
        return;
    }

    goalInput.disabled = false;
    deleteGoalBtn.style.display = 'block';

    if (currentGoalIndex >= goals.length) currentGoalIndex = goals.length - 1;
    if (currentGoalIndex < 0) currentGoalIndex = 0;

    const goal = goals[currentGoalIndex];

    goalInput.value = goal.title;
    adjustGoalFontSize();

    renderHearts(goal.hearts);
    renderRules(goal.rules || []);
    renderProcesses(goal.processes || []);

    prevBtn.classList.toggle('disabled', currentGoalIndex === 0);
    nextBtn.classList.toggle('disabled', currentGoalIndex === goals.length - 1);
}

function renderHearts(count) {
    heartsContainer.innerHTML = "";
    for (let i = 0; i < count; i++) heartsContainer.innerHTML += `<i class="fa-solid fa-heart"></i>`;
    for (let i = count; i < 3; i++) heartsContainer.innerHTML += `<i class="fa-regular fa-heart"></i>`;
}

function renderCategoryMenu() {
    categoryList.innerHTML = "";

    state.categories.forEach(cat => {
        const div = document.createElement("div");
        div.className = "menu-item";
        div.innerHTML = `
            <span class="cat-name">${cat.name}</span>
            <i class="fa-solid fa-trash delete-cat-btn" title="Delete category"></i>
        `;

        div.addEventListener("click", async () => {
            state.currentCategory = cat.name;
            currentGoalIndex = 0;
            categoryMenu.classList.add("hidden");
            await fetchGoals();
            renderAll();
        });

        div.querySelector(".delete-cat-btn").addEventListener("click", (e) => {
            e.stopPropagation();               // ป้องกันการ trigger click ของชื่อ
            deleteCategory(cat.id, cat.name);  // ใช้ id สำหรับลบ
        });

        categoryList.appendChild(div);
    });
}



// ========================= INLINE INPUT HELPERS =========================

// --- HELPER FUNCTION: สร้างช่องกรอกข้อความในปุ่ม (แก้บั๊ก Double Trigger) ---
function showInlineInput(containerElement, placeholderText, onConfirm) {
    const originalContent = containerElement.innerHTML;

    containerElement.innerHTML = `
        <div class="inline-input-wrapper">
            <input type="text" class="inline-input" placeholder="${placeholderText}">
        </div>
    `;

    const inputField = containerElement.querySelector('input');
    inputField.focus(); 

    let isProcessing = false;

    const handleConfirm = () => {
        if (isProcessing) return;
        const value = inputField.value.trim();
        if (value) {
            isProcessing = true;
            onConfirm(value); 
        }
        containerElement.innerHTML = originalContent; 
    };

    const handleCancel = () => {
        if (isProcessing) return;
        containerElement.innerHTML = originalContent;
    };

    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
            inputField.blur();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    });

    inputField.addEventListener('blur', () => {
        setTimeout(() => {
            const value = inputField.value.trim();
            if (value) {
                handleConfirm();
            } else {
                handleCancel();
            }
        }, 100);
    });
}

// ========================= CATEGORY FUNCTIONS =========================

async function addCategory(name) {
    try {
        const res = await authFetch("http://localhost:3000/api/category", {
            method: "POST",
            body: JSON.stringify({ name })
        });

        if (!res.ok) throw new Error();

        await fetchCategories();
        state.currentCategory = name;
        await fetchGoals();
        renderAll();

    } catch {
        alert("เพิ่มหมวดหมู่ไม่สำเร็จ");
    }
}

// ========================= CATEGORY DELETE =========================
async function deleteCategory(categoryId, categoryName) {
    if (!confirm(`แน่ใจเหรอว่าต้องการลบหมวดหมู่ "${categoryName}"?\n(การกระทำนี้จะลบเป้าหมายและรายการที่เกี่ยวข้องทั้งหมด)`)) {
        return;
    }

    try {
        const res = await authFetch(`http://localhost:3000/api/category/${categoryId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error("Delete category failed:", err);
            return alert(err.msg || "ลบหมวดหมู่ไม่สำเร็จ");
        }

        // รีโหลด categories และ goals ให้สะอาด
        await fetchCategories();
        state.currentCategory = state.categories.length > 0 ? state.categories[0].name : '';
        await fetchGoals();
        renderAll();

    } catch (err) {
        console.error("Error deleting category:", err);
        alert("เกิดข้อผิดพลาดในการลบหมวดหมู่");
    }
}


// ========================= GOAL FUNCTIONS =========================
async function addGoal(catName, title) {
    try {
        const res = await authFetch("http://localhost:3000/api/goal", {
            method: "POST",
            body: JSON.stringify({ category_name: catName, title })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.msg || "Goal create failed");
        }

        // ====== จุดสำคัญ แยก try ======
        await fetchGoals().catch(err => {
            console.error("fetchGoals failed", err);
        });

        renderAll();

    } catch (err) {
        console.error("Add goal error:", err);
        alert("สร้างเป้าหมายไม่สำเร็จ: " + (err.message || ""));
    }
}

async function updateGoal(goalId, updates) {
    try {
        const res = await authFetch(`http://localhost:3000/api/goal/${goalId}`, {
            method: "PUT",
            body: JSON.stringify(updates)
        });

        if (!res.ok) throw new Error();
        await fetchGoals();
        renderAll();

    } catch {
        alert("อัพเดท Goal ไม่สำเร็จ");
    }
}

// ========================= GOAL DELETE =========================
async function deleteGoal(goalId, goalTitle) {
    if (!confirm(`คุณต้องการลบเป้าหมาย "${goalTitle}" ใช่หรือไม่?\n(ข้อมูล Rule และ Process ข้างในจะหายไปทั้งหมด)`)) {
        return;
    }

    try {
        const res = await authFetch(`http://localhost:3000/api/goal/${goalId}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Delete goal failed");

        // ลบสำเร็จ ให้โหลดข้อมูลใหม่
        await fetchGoals();
        
        // ปรับ Index ถอยหลัง ถ้าลบตัวสุดท้ายออก
        if (currentGoalIndex >= state.goals.length) {
            currentGoalIndex = Math.max(0, state.goals.length - 1);
        }
        
        renderAll();

    } catch (err) {
        console.error("Error deleting goal:", err);
        alert("ลบเป้าหมายไม่สำเร็จ");
    }
}

// ========================= RULE FUNCTIONS =========================

async function addRule(goal_id, text) {
    const res = await authFetch("http://localhost:3000/api/rule", {
        method: "POST",
        body: JSON.stringify({ goal_id, text })
    });

    if (!res.ok) return alert("เพิ่มกฎไม่สำเร็จ");
    await fetchGoals();
    renderAll();
}


// ========================= PROCESS FUNCTIONS =========================
async function addProcess(goal_id, text) {
    const res = await authFetch("http://localhost:3000/api/process", {
        method: "POST",
        body: JSON.stringify({ goal_id, text })
    });

    if (!res.ok) return alert("เพิ่ม Process ไม่สำเร็จ");
    await fetchGoals();
    renderAll();
}

async function updateProcess(id, checked) {
    const res = await authFetch(`http://localhost:3000/api/process/${id}`, {
        method: "PUT",
        body: JSON.stringify({ checked: checked ? 1 : 0 })
    });

    if (!res.ok) return alert("อัพเดทรายการไม่สำเร็จ");
    await fetchGoals();
    renderAll();
}


// ========================= RULE DELETE =========================
async function deleteRule(goal_id, index) {
    try {
        const res = await authFetch(`http://localhost:3000/api/rule/${goal_id}/${index}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Rule deletion failed");

        await fetchGoals();
        renderAll();

    } catch (err) {
        console.error("Error deleting rule:", err);
        alert("ลบกฎไม่สำเร็จ");
    }
}

// ========================= PROCESS DELETE =========================
async function deleteProcess(id) {
    try {
        const res = await authFetch(`http://localhost:3000/api/process/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Process deletion failed");

        await fetchGoals();
        renderAll();

    } catch (err) {
        console.error("Error deleting process:", err);
        alert("ลบรายการไม่สำเร็จ");
    }
}


// ========================= EVENT LISTENERS =========================
// ========================= INLINE INPUTS =========================
document.addEventListener("click", (e) => {
    // CATEGORY
    if (e.target.closest("#add-category-btn")) {
        const btn = document.getElementById("add-category-btn");
        showInlineInput(btn, "ชื่อหมวด...", (name) => {
            if (name.length > 12) {
                alert("ชื่อยาวเกินไป ขอไม่เกิน 20 ตัวคับ");
                return;
            }
            
            const exists = state.categories.some(cat => cat.name === name);
            if (exists) {
                alert("ชื่อนี้มีแล้ว");
            return;
            }
            addCategory(name);
        });
    }

    // RULE
    if (e.target.closest(".rule-card .card-footer")) {
        const goal = state.goals[currentGoalIndex];
        if (!goal) return alert("ต้องมีเป้าหมายก่อน");
        showInlineInput(addRuleBtn, "เพิ่มกฎ...", text => {
            if(text.length > 60) return alert('ยาวไป! ขอไม่เกิน 60 ตัวอักษร');
            addRule(goal.id, text)
        });
    }

    // PROCESS
    if (e.target.closest(".process-card .card-footer")) {
        const goal = state.goals[currentGoalIndex];
        if (!goal) return alert("ต้องมีเป้าหมายก่อน");
        showInlineInput(addProcessBtn, "เพิ่มรายการ...", text => {
            if(text.length > 60) return alert('ยาวไป! ขอไม่เกิน 60 ตัวอักษร');
            addProcess(goal.id, text);
        });
    }

});



// ========================= GOAL INPUT LOGIC =========================
goalInput.addEventListener("blur", () => {
    const goal = state.goals[currentGoalIndex];
    if (goal) {
        updateGoal(goal.id, { title: goalInput.value });
        adjustGoalFontSize();
    }
});

// ========================= DELETE GOAL LOGIC =========================
deleteGoalBtn.addEventListener('click', () => {
    // เช็คว่ามีเป้าหมายให้ลบไหม
    const goal = state.goals[currentGoalIndex];
    if (goal) {
        deleteGoal(goal.id, goal.title);
    }
});

// ========================= HEARTS LOGIC =========================
closeHeartBtn.addEventListener("click", () => {
    const goal = state.goals[currentGoalIndex];
    if (!goal) return;

    const currentHearts = goal.hearts;
    const newHearts = currentHearts - 1;

    if (currentHearts > 0) {
        updateGoal(goal.id, { hearts: newHearts });
        if (newHearts === 0) {
            setTimeout(() => { 
                const confirmReset = confirm("Game Over! หัวใจหมดแล้ว 💔\nต้องการเริ่มใหม่หรือไม่?");
                if (confirmReset) {
                    updateGoal(goal.id, { hearts: 3 });
                }
            }, 300);
        }
        
        return;
    }
});

prevBtn.addEventListener("click", () => {
    if (currentGoalIndex > 0) currentGoalIndex--;
    renderAll();
});

nextBtn.addEventListener("click", () => {
    if (currentGoalIndex < state.goals.length - 1) currentGoalIndex++;
    renderAll();
});

categoryTrigger.addEventListener("click", () => {
    categoryMenu.classList.toggle("hidden");
    renderCategoryMenu();
});

goalInput.addEventListener("blur", () => {
    const goal = state.goals[currentGoalIndex];
    if (goal) {
        updateGoal(goal.id, { title: goalInput.value });
    }
    goalEditing = false;
});


// ========================= STYLE HELPERS =========================

function adjustGoalFontSize() {
    if (goalInput.value.length > 10) {
        goalInput.classList.add('smaller-text');
        if (goalInput.value.length > 16)
            goalInput.classList.add('smallest-text');
    } else {
        goalInput.classList.remove('smaller-text', 'smallest-text');
    }
}

// ========================= FAB BUTTON (Add New Goal) =========================
addGoalFab.addEventListener("click", () => {
    openNewGoalModal();
});

function openNewGoalModal() {
    const overlay = document.createElement("div");
    overlay.className = "custom-modal-overlay";

    overlay.innerHTML = `
        <div class="custom-modal-box">
            <div class="custom-modal-title">เพิ่มเป้าหมายใหม่</div>
            <input type="text" id="new-goal-input" class="custom-modal-input" placeholder="ชื่อเป้าหมาย...">
            <div class="custom-modal-actions">
                <button class="btn-confirm" id="confirm-add-goal">ยืนยัน</button>
                <button class="btn-cancel" id="cancel-add-goal">ยกเลิก</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById("new-goal-input");
    input.focus();

    // ปุ่มยืนยัน
    document.getElementById("confirm-add-goal").addEventListener("click", async () => {
        const title = input.value.trim();
        if (!title) return alert("กรุณากรอกชื่อเป้าหมาย");
        if (title.length > 20) return alert("ชื่อเป้าหมายยาวเกินไป ขอ20ตัวคับ");
        

        await addGoal(state.currentCategory, title);
        closeModal();
    });

    // ปุ่มยกเลิก
    document.getElementById("cancel-add-goal").addEventListener("click", closeModal);

    // ปิด modal
    function closeModal() {
        overlay.remove();
    }
}
