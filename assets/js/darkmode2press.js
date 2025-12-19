document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ตัวแปรสำหรับ Dark Mode (Logic เดิม + UI ใหม่) ---
    let darkmode = localStorage.getItem('darkmode');
    
    // ปุ่มเดิมใน Sidebar (ถ้ามี)
    const themeSwitchSidebar = document.getElementById('theme-switch'); 
    
    // UI ใหม่ใน Navbar
    const themeTrigger = document.getElementById('theme-select-trigger');
    const themeOptions = document.getElementById('theme-options');
    const currentThemeText = document.getElementById('current-theme-text');
    const themeOptionItems = document.querySelectorAll('.theme-option');

    // --- 2. ฟังก์ชัน Enable/Disable (ปรับปรุงให้อัปเดต UI ด้วย) ---
    
    const updateThemeText = (mode) => {
        // อัปเดตคำว่า Light / Dark ในปุ่ม Navbar
        if (currentThemeText) {
            // ทำให้ตัวแรกเป็นพิมพ์ใหญ่ (Light / Dark)
            currentThemeText.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
        }
    };

    const enableDarkmode = () => {
        document.body.classList.add('darkmode');
        localStorage.setItem('darkmode', 'active');
        darkmode = 'active';
        updateThemeText('dark'); // อัปเดต UI เป็น Dark
    };

    const disableDarkmode = () => {
        document.body.classList.remove('darkmode');
        localStorage.setItem('darkmode', null);
        darkmode = null;
        updateThemeText('light'); // อัปเดต UI เป็น Light
    };

    // --- 3. เริ่มต้นระบบ (Check LocalStorage) ---
    if (darkmode === "active") {
        enableDarkmode();
    } else {
        // ถ้าเป็น Light Mode ก็ให้อัปเดต text ให้ชัวร์
        updateThemeText('light');
    }

    // --- 4. Event Listeners ---

    // A. จัดการปุ่มเดิม (Sidebar) - ถ้ามีปุ่มนี้อยู่ก็ยังใช้ได้
    if (themeSwitchSidebar) {
        themeSwitchSidebar.addEventListener("click", (e) => {
            e.preventDefault(); // กัน Link เด้ง
            darkmode !== "active" ? enableDarkmode() : disableDarkmode();
        });
    }

    // B. จัดการ UI ใหม่ (Dropdown ใน Navbar)
    if (themeTrigger && themeOptions) {
        
        // 1. กดปุ่มเพื่อเปิด/ปิดเมนูเลือก Theme
        themeTrigger.addEventListener('click', (e) => {
            e.stopPropagation(); // กันไม่ให้ไปตีกับ event ปิดเมนูหลัก
            themeOptions.classList.toggle('hidden');
        });

        // 2. กดเลือก Light หรือ Dark
        themeOptionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedMode = item.getAttribute('data-value'); // light หรือ dark

                if (selectedMode === 'dark') {
                    enableDarkmode();
                } else {
                    disableDarkmode();
                }
                
                // เลือกเสร็จแล้วปิดเมนูย่อย
                themeOptions.classList.add('hidden');
            });
        });
    }

    // C. คลิกที่อื่นเพื่อปิดเมนูย่อย (UX)
    document.addEventListener('click', (e) => {
        if (themeOptions && !themeTrigger.contains(e.target)) {
            themeOptions.classList.add('hidden');
        }
    });
    
    // ... (ส่วน Login/User Profile อื่นๆ ของคุณ ใส่ต่อท้ายตรงนี้ได้เลย) ...
});