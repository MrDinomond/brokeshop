// Создание адреса доставки
const createDeliveryAddress = (userId, orderId, addressData) => {
    return new Promise((resolve, reject) => {
        const { fullName, phone, country, city, street, building, apartment, postalCode } = addressData;
        const sql = `INSERT INTO delivery_addresses
                     (user_id, order_id, full_name, phone, country, city, street, building, apartment, postal_code)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        global.db.run(sql, [userId, orderId, fullName, phone, country, city, street, building, apartment, postalCode], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, ...addressData });
            }
        });
    });
};

// Получение адреса доставки по ID заказа
const getDeliveryAddressByOrderId = (orderId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM delivery_addresses WHERE order_id = ?`;
        global.db.get(sql, [orderId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Получение адресов пользователя
const getUserDeliveryAddresses = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM delivery_addresses WHERE user_id = ? ORDER BY created_at DESC`;
        global.db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

module.exports = {
    createDeliveryAddress,
    getDeliveryAddressByOrderId,
    getUserDeliveryAddresses
};
