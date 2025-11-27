const sqlite3 = require('sqlite3').verbose();

// Создание отзыва
const createReview = (userId, productId, username, rating, comment) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO reviews (user_id, product_id, username, rating, comment, status) VALUES (?, ?, ?, ?, ?, 'pending')`;
        global.db.run(sql, [userId, productId, username, rating, comment], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, userId, productId, username, rating, comment, status: 'pending' });
            }
        });
    });
};

// Получение отзывов для товара
const getProductReviews = (productId, status = 'approved') => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC`;
        global.db.all(sql, [productId, status], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Получение всех отзывов для модерации (админ)
const getAllReviews = (status = 'all') => {
    return new Promise((resolve, reject) => {
        let sql, params;
        if (status === 'all') {
            sql = `SELECT r.*, p.name as product_name
                   FROM reviews r
                   JOIN products p ON r.product_id = p.id
                   ORDER BY r.created_at DESC`;
            params = [];
        } else {
            sql = `SELECT r.*, p.name as product_name
                   FROM reviews r
                   JOIN products p ON r.product_id = p.id
                   WHERE r.status = ?
                   ORDER BY r.created_at DESC`;
            params = [status];
        }

        global.db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Одобрение отзыва
const approveReview = (reviewId, moderatorId) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE reviews SET status = 'approved', moderated_at = CURRENT_TIMESTAMP, moderated_by = ? WHERE id = ?`;
        global.db.run(sql, [moderatorId, reviewId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: reviewId, status: 'approved' });
            }
        });
    });
};

// Отклонение отзыва
const rejectReview = (reviewId, moderatorId) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE reviews SET status = 'rejected', moderated_at = CURRENT_TIMESTAMP, moderated_by = ? WHERE id = ?`;
        global.db.run(sql, [moderatorId, reviewId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: reviewId, status: 'rejected' });
            }
        });
    });
};

// Получение отзывов пользователя
const getUserReviews = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT r.*, p.name as product_name
                     FROM reviews r
                     JOIN products p ON r.product_id = p.id
                     WHERE r.user_id = ?
                     ORDER BY r.created_at DESC`;
        global.db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Проверка, оставлял ли пользователь отзыв на товар
const hasUserReviewed = (productId, userId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT id FROM reviews WHERE product_id = ? AND user_id = ?`;
        global.db.get(sql, [productId, userId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(!!row);
            }
        });
    });
};

// Получение среднего рейтинга товара
const getProductRating = (productId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
                     FROM reviews WHERE product_id = ? AND status = 'approved'`;
        global.db.get(sql, [productId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    avg_rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : 0,
                    review_count: row.review_count || 0
                });
            }
        });
    });
// Удаление отзыва
const deleteReview = (reviewId, moderatorId) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM reviews WHERE id = ?`;
        global.db.run(sql, [reviewId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: reviewId, deleted: true, moderatorId });
            }
        });
    });
};

module.exports = {
    createReview,
    getProductReviews,
    getAllReviews,
    approveReview,
    rejectReview,
    deleteReview,
    getUserReviews,
    hasUserReviewed,
    getProductRating
};
