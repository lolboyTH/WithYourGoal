document.addEventListener("DOMContentLoaded", () => {

    const signup = async () => {
        try {
            // ดึง input ตาม name (ปลอดภัยที่สุด)
            const username = document.querySelector('input[name="username"]').value.trim();
            const email = document.querySelector('input[name="email"]').value.trim();
            const password = document.querySelector('input[name="password"]').value.trim();

            // ตรวจสอบค่าว่าง
            if (!username || !email || !password) {
                alert("กรุณากรอกข้อมูลให้ครบถ้วน");
                return;
            }

            // ส่งข้อมูลสมัครสมาชิกไป backend
            const response = await axios.post("http://localhost:3000/api/register", {
                username,
                email,
                password
            });

            console.log("Register successful:", response.data);

            // ตั้งสถานะ login ทันทีแบบเดียวกับ login.js
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("user_data", JSON.stringify(response.data));

            alert("สมัครสมาชิกสำเร็จ!");
            window.location.href = "index.html";

        } catch (error) {
            console.error("Sign up failed:", error);

            const msg =
                error.response?.data?.msg ||
                "Sign up failed. Please check your information.";

            alert(msg);
        }
    };

    // เชื่อมปุ่ม Sign Up (ปลอดภัย)
    const btn = document.querySelector(".buttonbox button");
    if (btn) btn.addEventListener("click", signup);
});
