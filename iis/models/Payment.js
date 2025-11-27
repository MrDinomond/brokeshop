// Создание платежа
const createPayment = (orderId, paymentData) => {
    return new Promise((resolve, reject) => {
        const { cardNumber, cardHolder, expiryDate, cvv, paymentMethod = 'card' } = paymentData;
        const sql = `INSERT INTO payments
                     (order_id, card_number, card_holder, expiry_date, cvv, payment_method)
                     VALUES (?, ?, ?, ?, ?, ?)`;
        global.db.run(sql, [orderId, cardNumber, cardHolder, expiryDate, cvv, paymentMethod], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, orderId, ...paymentData });
            }
        });
    });
};

// Получение платежа по ID заказа
const getPaymentByOrderId = (orderId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM payments WHERE order_id = ?`;
        global.db.get(sql, [orderId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Обновление статуса платежа
const updatePaymentStatus = (orderId, status) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE payments SET status = ? WHERE order_id = ?`;
        global.db.run(sql, [status, orderId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ orderId, status });
            }
        });
    });
};

module.exports = {
    createPayment,
    getPaymentByOrderId,
    updatePaymentStatus
};
