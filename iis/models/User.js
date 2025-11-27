const bcrypt = require('bcryptjs');

// Регистрация пользователя
const registerUser = (username, email, password, role = 'user') => {
    return new Promise((resolve, reject) => {
        const passwordHash = bcrypt.hashSync(password, 10);
        const sql = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;
        global.db.run(sql, [username, email, passwordHash, role], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, username, email, role });
            }
        });
    });
};

// Поиск пользователя по email
const findUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users WHERE email = ?`;
        global.db.get(sql, [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Поиск пользователя по ID
const findUserById = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users WHERE id = ?`;
        global.db.get(sql, [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Поиск пользователя по имени
const findUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users WHERE username = ?`;
        global.db.get(sql, [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Получение всех пользователей
const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users ORDER BY id ASC`;
        if (!global.db) {
            reject(new Error('База данных не инициализирована'));
            return;
        }
        global.db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Удаление пользователя
const deleteUser = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM users WHERE id = ?`;
        if (!global.db) {
            reject(new Error('База данных не инициализирована'));
            return;
        }
        global.db.run(sql, [id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, deleted: true });
            }
        });
    });
};

// Обновление роли пользователя
const updateUserRole = (id, role) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE users SET role = ? WHERE id = ?`;
        if (!global.db) {
            reject(new Error('База данных не инициализирована'));
            return;
        }
        global.db.run(sql, [role, id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, role });
            }
        });
    });
};

// Проверка ролей
const hasRole = (user, requiredRole) => {
    const roles = ['user', 'admin', 'root'];
    const userRoleIndex = roles.indexOf(user.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);
    return userRoleIndex >= requiredRoleIndex;
};

// Проверка пароля
const checkPassword = (password, hashedPassword) => {
    return bcrypt.compareSync(password, hashedPassword);
};

module.exports = {
    registerUser,
    findUserByEmail,
    findUserById,
    findUserByUsername,
    getAllUsers,
    deleteUser,
    updateUserRole,
    hasRole,
    checkPassword
};
