const start = document.getElementById("start");
const stop = document.getElementById("stop");
const reset = document.getElementById("reset");
const timer = document.getElementById("timer");

const STARTING_TIME = 1500; 

let timeLeft = STARTING_TIME;
let interval = null; // กำหนดค่าเริ่มต้นเป็น null เพื่อใช้เช็คสถานะ

const updateTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timer.innerHTML = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const startTimer = () => {
    // 1. เช็คก่อนว่า "จับเวลาอยู่หรือเปล่า?" 
    // ถ้า interval มีค่า (ไม่เป็น null) แปลว่าทำงานอยู่ ให้หยุดฟังก์ชันทันที (ป้องกันกดเบิ้ล)
    if (interval) return; 
    
    // 2. ป้องกันปัญหากรณีเวลาเป็น 0 แล้วกด Start ต่อเลย
    if (timeLeft === 0) return;

    interval = setInterval(() => {
        timeLeft--;
        updateTimer();

        if (timeLeft <= 0) {
            clearInterval(interval);
            interval = null; // เคลียร์ค่าเมื่อจบการทำงาน
            
            // ใช้ setTimeout เล็กน้อยเพื่อให้หน้าจอแสดง 00:00 ก่อนเด้ง Alert
            setTimeout(() => {
                alert("Time's up!");
            }, 100);
        }
    }, 1000);
};

const stopTimer = () => {
    clearInterval(interval);
    interval = null; // สำคัญ: ต้องเคลียร์ค่ากลับเป็น null เพื่อให้รู้ว่าหยุดแล้ว
};

const resetTimer = () => {
    stopTimer(); // เรียกใช้ stopTimer เพื่อหยุดเวลาก่อน (ลดโค้ดซ้ำซ้อน)
    timeLeft = STARTING_TIME;
    updateTimer();
};

// 3. เรียก updateTimer ทันที 1 ครั้ง เพื่อให้หน้าเว็บแสดง 25:00 ตั้งแต่เปิดมา
updateTimer();

start.addEventListener("click", startTimer);
stop.addEventListener("click", stopTimer);
reset.addEventListener("click", resetTimer);