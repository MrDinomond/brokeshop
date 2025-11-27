// Создание заказа
const createOrder = (userId, total) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO orders (user_id, total) VALUES (?, ?)`;
        global.db.run(sql, [userId, total], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, userId, total });
            }
        });
    });
};

// Получение заказа по ID
const getOrderById = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM orders WHERE id = ?`;
        global.db.get(sql, [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Получение заказов пользователя
const getUserOrders = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`;
        global.db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение товаров в заказе
const getOrderItems = (orderId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT oi.*, p.name, p.description, p.image
                     FROM order_items oi
                     JOIN products p ON oi.product_id = p.id
                     WHERE oi.order_id = ?`;
        global.db.all(sql, [orderId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Добавление товаров в заказ
const addOrderItems = (orderId, items) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`;
        const promises = items.map(item => {
            return new Promise((res, rej) => {
                global.db.run(sql, [orderId, item.product_id, item.quantity, item.price], function(err) {
                    if (err) {
                        rej(err);
                    } else {
                        res({ id: this.lastID });
                    }
                });
            });
        });

        Promise.all(promises)
            .then(() => resolve({ success: true }))
            .catch(reject);
    });
};

// Обновление статуса заказа
const updateOrderStatus = (id, status) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE orders SET status = ? WHERE id = ?`;
        global.db.run(sql, [status, id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, status });
            }
        });
    });
};

module.exports = {
    createOrder,
    getOrderById,
    getUserOrders,
    getOrderItems,
    addOrderItems,
    updateOrderStatus
};
