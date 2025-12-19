const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const secret = 'secret';
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    // 1. ถ้าต้องการให้แสดงหน้า index.html (หน้าหลัก)
    res.sendFile(__dirname + '/index.html'); 
    
    // หรือ 2. ถ้าต้องการให้เปลี่ยนเส้นทางไปหน้า login.html
    // res.redirect('/login.html');
});

app.use(cors({
    origin: '*', // อนุญาตให้ทุก Origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // อนุญาตทุก HTTP Methods
    preflightContinue: false,
    optionsSuccessStatus: 204 // ตอบกลับคำขอ OPTIONS ด้วยสถานะ 204
}));
app.use(express.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456789',
    database: 'withyourgoal'
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});


app.post('/api/insert', (req, res) => {
    const {idgoal, goaltext} = req.body;

    if (idgoal === undefined || goaltext === undefined) {
        return res.status(400).json({ msg: 'Missing idgoal or goaltext in request body' });
    }

    const query = 'INSERT INTO goal (idgoal, goaltext) VALUES (?, ?)';
    connection.query(query, [idgoal, goaltext], (err, results) => {
        if (err) {
            console.error('Error inserting data:', err);

            return res.status(500).json({ msg: 'Error inserting data', details: err.message });
        }
        
        res.json({
            msg: 'Goal added successfully',
            insertId: results.insertId
        });
    });
});

// ================= REGISTER API with default data creation =================
app.post('/api/register', async (req, res) => {
    const conn = connection.promise();

    try {
        const { email, username, password } = req.body;

        // สร้าง hash ของรหัสผ่าน
        const passwordHash = await bcrypt.hash(password, 10);

        // เริ่ม Transaction
        await conn.beginTransaction();

        // 1️⃣ สมัครผู้ใช้ใหม่
        const [result] = await conn.query(
            'INSERT INTO user (email, username, password) VALUES (?, ?, ?)',
            [email, username, passwordHash]
        );

        const userId = result.insertId;

        // 2️⃣ สร้างหมวดหมู่เริ่มต้น
        const defaultCategories = ["Health", "Finance", "Work", "Self"];
        const categoryIds = {};

        for (const name of defaultCategories) {
            const [catRes] = await conn.query(
                "INSERT INTO category (name, user_id) VALUES (?, ?)",
                [name, userId]
            );
            categoryIds[name] = catRes.insertId;
        }

        // 3️⃣ เพิ่ม Goal เริ่มต้นใน Category : Health
        const [goalRes] = await conn.query(
            "INSERT INTO goal (category_id, title, hearts) VALUES (?, ?, 3)",
            [categoryIds["Health"], "45 kg"]
        );
        const goalId = goalRes.insertId;

        // 4️⃣ เพิ่ม Rule เริ่มต้น
        const defaultRules = [
            "ไม่กินของหวาน",
            "ออกกำลังกายทุกวัน",
            "นอน 22.00"
        ];

        for (const r of defaultRules) {
            await conn.query(
                "INSERT INTO rule (goal_id, text) VALUES (?, ?)",
                [goalId, r]
            );
        }

        // 5️⃣ เพิ่ม Process เริ่มต้น
        const defaultProcesses = [
            "cardio 1 ชม.",
            "วิ่ง 1 km",
            "เล่นบาส"
        ];

        for (const p of defaultProcesses) {
            await conn.query(
                "INSERT INTO process (goal_id, user_id, text, checked) VALUES (?, ?, ?, 0)",
                [goalId, userId, p]
            );
        }

        // Commit ทุกอย่าง
        await conn.commit();

        res.json({
            msg: 'User registered successfully + default data created',
            userId: userId
        });

    } catch (err) {
        console.error("Register error:", err);
        try { await connection.promise().rollback(); } catch { }

        res.status(500).json({
            msg: 'Server error',
            details: err.message
        });
    }
});

// ================= LOGIN API =================
app.post('/api/login', async(req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await connection.promise().query('SELECT * FROM user WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ msg: 'Invalid username or password' });
        }
        const userData = rows[0];
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(401).json({ msg: 'Invalid username or password' });
        }

        //  สร้าง token
        const token = jwt.sign(
            { id: userData.id, username: userData.username },
            secret,
            { expiresIn: '30d' } 
        );

        res.json({
            msg: 'Login successful',
            userId: userData.id,
            token: token
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({
            msg: 'Server error',
            details: err.message
        });
    }
});



// ================= AUTH MIDDLEWARE =====================
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ msg: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ msg: "Invalid token" });
        }

        req.user = decoded;
        next();
    });
}


// ================= CATEGORY API =================
app.get('/api/category', authMiddleware, async (req, res) => {
    try {
        const user_id = req.user.id;

        const [rows] = await connection.promise().query(
            "SELECT id, name FROM category WHERE user_id = ?",
            [user_id]
        );

        res.json(rows);

    } catch (error) {
        res.status(500).json({ msg: "Error loading categories" });
    }
});


// ================= DELETE CATEGORY (with cascade cleanup) =================
app.delete('/api/category/:id', authMiddleware, async (req, res) => {
    const categoryId = req.params.id;
    const userId = req.user.id;

    try {
        // ตรวจว่า category นี้เป็นของ user จริงหรือไม่
        const [[cat]] = await connection.promise().query(
            "SELECT id, user_id FROM category WHERE id = ?",
            [categoryId]
        );

        if (!cat) return res.status(404).json({ msg: "Category not found" });
        if (cat.user_id !== userId) return res.status(403).json({ msg: "Not allowed" });

        // เริ่ม transaction
        await connection.promise().beginTransaction();

        // หา goals ใน category นี้
        const [goals] = await connection.promise().query(
            "SELECT id FROM goal WHERE category_id = ?",
            [categoryId]
        );

        const goalIds = goals.map(g => g.id);
        if (goalIds.length > 0) {
            // ลบ process ทั้งหมดที่สัมพันธ์กับ goals เหล่านี้
            await connection.promise().query(
                `DELETE FROM process WHERE goal_id IN (${goalIds.map(() => '?').join(',')})`,
                goalIds
            );

            // ลบ rule ทั้งหมดที่สัมพันธ์กับ goals เหล่านี้
            await connection.promise().query(
                `DELETE FROM rule WHERE goal_id IN (${goalIds.map(() => '?').join(',')})`,
                goalIds
            );

            // ลบ goal
            await connection.promise().query(
                `DELETE FROM goal WHERE id IN (${goalIds.map(() => '?').join(',')})`,
                goalIds
            );
        }

        // ลบ category เอง
        await connection.promise().query(
            "DELETE FROM category WHERE id = ?",
            [categoryId]
        );

        // commit
        await connection.promise().commit();

        res.json({ msg: "Category and related data deleted" });
    } catch (err) {
        // rollback on error
        try { await connection.promise().rollback(); } catch (e) { /* ignore */ }
        console.error("Error deleting category:", err);
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// ================= DELETE GOAL (with cascade cleanup) =================
app.delete("/api/goal/:id", authMiddleware, async (req, res) => {
    try {
        const goalId = req.params.id;

        // ตรวจว่า goal นี้เป็นของ user ไหม
        const [[goal]] = await connection.promise().query(`
            SELECT g.id, c.user_id
            FROM goal g
            JOIN category c ON g.category_id = c.id
            WHERE g.id = ?
        `, [goalId]);

        if (!goal) return res.status(404).json({ msg: "Goal not found" });
        if (goal.user_id !== req.user.id)
            return res.status(403).json({ msg: "Not allowed" });

        // ลบ process
        await connection.promise().query(
            "DELETE FROM process WHERE goal_id = ?",
            [goalId]
        );

        // ลบ rule
        await connection.promise().query(
            "DELETE FROM rule WHERE goal_id = ?",
            [goalId]
        );

        // ลบ goal
        await connection.promise().query(
            "DELETE FROM goal WHERE id = ?",
            [goalId]
        );

        res.json({ msg: "Goal deleted" });

    } catch (err) {
        console.error("Error deleting goal:", err);
        return res.status(500).json({
            msg: "Server error",
            details: err.message
        });
    }
});

// ================= CREATE CATEGORY =================
app.post('/api/category', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const user_id = req.user.id;

        await connection.promise().query(
            "INSERT INTO category (name, user_id) VALUES (?, ?)",
            [name, user_id]
        );

        res.json({ msg: "OK" });

    } catch (error) {
        res.status(500).json({ msg: "Error creating category", details: error.message });
    }
});

// ================= GOAL API =================
app.post("/api/goal", authMiddleware, async (req, res) => {
    try {
        const { category_name, title } = req.body;
        const user_id = req.user.id;

        const [[cat]] = await connection.promise().query(
            "SELECT id FROM category WHERE name = ? AND user_id = ?",
            [category_name, user_id]
        );

        if (!cat) {
            return res.status(400).json({ msg: "Category not found" });
        }

        const category_id = cat.id;

        await connection.promise().query(
            "INSERT INTO goal (category_id, title, hearts) VALUES (?, ?, 3)",
            [category_id, title]
        );

        res.json({ msg: "Goal created" });

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// ================= UPDATE GOAL (partial update) =================
app.put("/api/goal/:id", authMiddleware, async (req, res) => {
    try {
        const goal_id = req.params.id;
        const { title, hearts } = req.body;

        // ตรวจว่า goal นี้เป็นของ user หรือไม่
        const [[goal]] = await connection.promise().query(
            `SELECT g.*, c.user_id 
             FROM goal g 
             JOIN category c ON g.category_id = c.id 
             WHERE g.id = ?`,
            [goal_id]
        );

        if (!goal) return res.status(404).json({ msg: "Goal not found" });
        if (goal.user_id !== req.user.id)
            return res.status(403).json({ msg: "Not allowed" });

        // -------- Partial update logic --------
        let updateFields = [];
        let updateValues = [];

        if (title !== undefined) {
            updateFields.push("title = ?");
            updateValues.push(title);
        }

        if (hearts !== undefined) {
            updateFields.push("hearts = ?");
            updateValues.push(hearts);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ msg: "No fields to update" });
        }

        updateValues.push(goal_id);

        await connection.promise().query(
            `UPDATE goal SET ${updateFields.join(", ")} WHERE id = ?`,
            updateValues
        );

        res.json({ msg: "Goal updated" });

    } catch (err) {
        console.error("ERROR updating goal:", err);
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});


app.get("/api/goals", authMiddleware, async (req, res) => {
    try {
        const user_id = req.user.id;

        const [goals] = await connection.promise().query(`
            SELECT g.id, g.title, g.hearts, c.name AS category_name
            FROM goal g
            JOIN category c ON g.category_id = c.id
            WHERE c.user_id = ?
            ORDER BY g.id ASC
        `, [user_id]);

        const [rules] = await connection.promise().query(`
            SELECT id, goal_id, text
            FROM rule
            ORDER BY id ASC
        `);

        const [processes] = await connection.promise().query(`
            SELECT id, goal_id, text, checked
            FROM process
            ORDER BY id ASC
        `);

        const result = goals.map(g => ({
            ...g,
            rules: rules.filter(r => r.goal_id === g.id),
            processes: processes.filter(p => p.goal_id === g.id)
        }));

        res.json(result);

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});


app.post("/api/rule", authMiddleware, async (req, res) => {
    try {
        const { goal_id, text } = req.body;

        await connection.promise().query(
            "INSERT INTO rule (goal_id, text) VALUES (?, ?)",
            [goal_id, text]
        );

        res.json({ msg: "Rule added" });

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// ================= DELETE RULE BY INDEX =================
app.delete("/api/rule/:goal_id/:index", authMiddleware, async (req, res) => {
    try {
        const { goal_id, index } = req.params;
        const userId = req.user.id;

        // ตรวจว่า goal นี้เป็นของ user
        const [[goal]] = await connection.promise().query(`
            SELECT g.id, c.user_id 
            FROM goal g
            JOIN category c ON g.category_id = c.id
            WHERE g.id = ?
        `, [goal_id]);

        if (!goal) return res.status(404).json({ msg: "Goal not found" });
        if (goal.user_id !== userId)
            return res.status(403).json({ msg: "Not allowed" });

        // ดึง rules ของ goal
        const [rules] = await connection.promise().query(
            "SELECT * FROM rule WHERE goal_id = ? ORDER BY id ASC",
            [goal_id]
        );

        const ruleToDelete = rules[index];
        if (!ruleToDelete) return res.status(400).json({ msg: "Rule not found" });

        await connection.promise().query(
            "DELETE FROM rule WHERE id = ?",
            [ruleToDelete.id]
        );

        res.json({ msg: "Rule deleted" });

    } catch (err) {
        console.error("Error deleting rule:", err);
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// ================= PROCESS API =================
app.post("/api/process", authMiddleware, async (req, res) => {
    try {
        const { goal_id, text } = req.body;
        const user_id = req.user.id;

        await connection.promise().query(
            "INSERT INTO process (goal_id, user_id, text, checked) VALUES (?, ?, ?, 0)",
            [goal_id, user_id, text]
        );

        res.json({ msg: "Process added" });

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

app.put("/api/process/:id", authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { checked } = req.body;

        await connection.promise().query(
            "UPDATE process SET checked = ? WHERE id = ?",
            [checked, id]
        );

        res.json({ msg: "Process updated" });

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// ================= DELETE PROCESS BY ID =================
app.delete("/api/process/:id", authMiddleware, async (req, res) => {
    try {
        const processId = req.params.id;
        const userId = req.user.id;

        // 1️⃣ ดึง process เพื่อตรวจสอบว่า goal_id อะไร
        const [[proc]] = await connection.promise().query(
            "SELECT id, goal_id FROM process WHERE id = ?",
            [processId]
        );

        if (!proc) {
            return res.status(404).json({ msg: "Process not found" });
        }

        // 2️⃣ ตรวจว่า goal นี้เป็นของ user หรือไม่
        const [[goal]] = await connection.promise().query(`
            SELECT g.id, c.user_id 
            FROM goal g
            JOIN category c ON g.category_id = c.id
            WHERE g.id = ?
        `, [proc.goal_id]);

        if (!goal) return res.status(404).json({ msg: "Goal not found" });
        if (goal.user_id !== userId)
            return res.status(403).json({ msg: "Not allowed" });

        // 3️⃣ ลบ process
        await connection.promise().query(
            "DELETE FROM process WHERE id = ?",
            [processId]
        );

        res.json({ msg: "Process deleted" });

    } catch (err) {
        console.error("Error deleting process:", err);
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// ================= GET USER PROFILE =================
app.get("/api/profile", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [[user]] = await connection.promise().query(
            "SELECT id, username, email FROM user WHERE id = ?",
            [userId]
        );

        if (!user) return res.status(404).json({ msg: "User not found" });

        res.json(user);

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// =============== UPDATE USER PROFILE ===============
app.put("/api/profile", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email } = req.body;

        await connection.promise().query(
            "UPDATE user SET username = ?, email = ? WHERE id = ?",
            [username, email, userId]
        );

        res.json({ msg: "Profile updated" });

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

// =============== USER PROCESS STATS ===============
app.get("/api/process/stats", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [[stats]] = await connection.promise().query(`
            SELECT
                SUM(CASE WHEN checked = 1 THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN checked = 0 THEN 1 ELSE 0 END) AS pending
            FROM process
            WHERE user_id = ?
        `, [userId]);

        res.json(stats);

    } catch (err) {
        res.status(500).json({ msg: "Server error", details: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});