// Получение всех товаров
const getAllProducts = () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM products ORDER BY created_at DESC`;
        global.db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение товара по ID
const getProductById = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM products WHERE id = ?`;
        global.db.get(sql, [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Поиск товаров по категории
const getProductsByCategory = (category) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM products WHERE category = ? ORDER BY created_at DESC`;
        global.db.all(sql, [category], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Поиск товаров
const searchProducts = (query) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC`;
        const searchTerm = `%${query}%`;
        global.db.all(sql, [searchTerm, searchTerm], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Создание товара
const createProduct = (name, description, price, image) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)`;
        if (!global.db) {
            reject(new Error('База данных не инициализирована'));
            return;
        }
        global.db.run(sql, [name, description, price, image], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, name, description, price, image });
            }
        });
    });
};

// Обновление товара
const updateProduct = (id, name, description, price, image) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE products SET name = ?, description = ?, price = ?, image = ? WHERE id = ?`;
        if (!global.db) {
            reject(new Error('База данных не инициализирована'));
            return;
        }
        global.db.run(sql, [name, description, price, image, id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id, name, description, price, image });
            }
        });
    });
};

// Удаление товара
const deleteProduct = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM products WHERE id = ?`;
        global.db.run(sql, [id], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id });
            }
        });
    });
};

module.exports = {
    getAllProducts,
    getProductById,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct
};
