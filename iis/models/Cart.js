// Получение корзины пользователя
const getCart = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT c.*, p.name, p.price, p.image
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `;
        global.db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Добавление товара в корзину
const addToCart = (userId, productId, quantity = 1) => {
    return new Promise((resolve, reject) => {
        // Проверяем, есть ли уже такой товар в корзине
        const checkSql = `SELECT * FROM cart WHERE user_id = ? AND product_id = ?`;
        global.db.get(checkSql, [userId, productId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (row) {
                // Обновляем количество
                const updateSql = `UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?`;
                global.db.run(updateSql, [quantity, userId, productId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: row.id, quantity: row.quantity + quantity });
                    }
                });
            } else {
                // Добавляем новый товар
                const insertSql = `INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)`;
                global.db.run(insertSql, [userId, productId, quantity], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, quantity });
                    }
                });
            }
        });
    });
};

// Обновление количества товара в корзине
const updateCartItem = (userId, productId, quantity) => {
    return new Promise((resolve, reject) => {
        if (quantity <= 0) {
            // Удаляем товар из корзины
            const deleteSql = `DELETE FROM cart WHERE user_id = ? AND product_id = ?`;
            global.db.run(deleteSql, [userId, productId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ deleted: true });
                }
            });
        } else {
            const sql = `UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?`;
            global.db.run(sql, [quantity, userId, productId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ updated: true });
                }
            });
        }
    });
};

// Удаление товара из корзины
const removeFromCart = (userId, productId) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM cart WHERE user_id = ? AND product_id = ?`;
        global.db.run(sql, [userId, productId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ deleted: true });
            }
        });
    });
};

// Очистка корзины
const clearCart = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM cart WHERE user_id = ?`;
        global.db.run(sql, [userId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ cleared: true });
            }
        });
    });
};

// Получение количества товаров в корзине
const getCartCount = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT SUM(quantity) as count FROM cart WHERE user_id = ?`;
        global.db.get(sql, [userId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.count || 0);
            }
        });
    });
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartCount
};
