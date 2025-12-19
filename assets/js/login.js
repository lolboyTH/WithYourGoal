const login = async () => {
    try {
        const username = document.querySelector('.inputbox input[name="username"]').value;
        const password = document.querySelector('.inputbox input[name="password"]').value;
        const response = await axios.post('http://localhost:3000/api/login', {
            username,
            password
        });


        // *** การจัดการ Token ที่นี่ ***
        const token = response.data.token;
        // เก็บ Token ไว้ใน Local Storage (แนะนำ)
        localStorage.setItem('authToken', token);
        
        console.log('Login successful:', response.data);
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data));

        // นำทางผู้ใช้ไปยังหน้าหลัก
        window.location.href = 'index.html'; 

    } catch (error) {
        console.error('Login failed:', error);
        // การจัดการ Response Status Code ให้ดีขึ้น
        const errorMessage = error.response && error.response.data && error.response.data.msg 
                            ? error.response.data.msg 
                            : 'Login failed. Please check your credentials and try again.';
        alert(errorMessage);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userIconTrigger = document.getElementById('user-icon-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    // --- ฟังก์ชันเช็คสถานะ Login ---
    function checkLoginStatus() {
        const token = localStorage.getItem('authToken'); // มี token = login สำเร็จ
        const user = localStorage.getItem('user_data');

        if (token) {
            // ถ้า Login แล้ว → ซ่อนปุ่ม Login / แสดง User Icon
            loginBtn.classList.add('hidden');
            userProfile.classList.remove('hidden');
        } else {
            // ถ้ายังไม่ Login → แสดงปุ่ม Login / ซ่อน User Icon
            loginBtn.classList.remove('hidden');
            userProfile.classList.add('hidden');
        }
    }

    // --- เปิด/ปิดเมนูโปรไฟล์ ---
    userIconTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });

    // --- ปิด dropdown เมื่อคลิกที่อื่น ---
    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    // --- Logout ---
    logoutBtn.addEventListener('click', () => {

        // ลบข้อมูลทั้งหมด
        localStorage.removeItem('authToken');
        localStorage.removeItem('user_data');
        localStorage.removeItem('isLoggedIn');

        alert('ออกจากระบบสำเร็จ');
        // โหลดหน้าใหม่
        window.location.reload();
        window.location.href = 'login.html';
    });

    // --- เรียกครั้งแรกตอนโหลดหน้าเว็บ ---
    checkLoginStatus();
});
