const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createReview, getProductReviews, getAllReviews, approveReview, rejectReview, hasUserReviewed } = require('../models/Review');
const { getProductById } = require('../models/Product');

// Добавление отзыва к товару
router.post('/product/:productId', requireAuth, async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.userId;
        const { rating, comment } = req.body;

        // Проверка существования товара
        const product = await getProductById(productId);
        if (!product) {
            req.flash('error', 'Товар не найден');
            return res.redirect(`/shop/product/${productId}`);
        }

        // Проверка, оставлял ли пользователь уже отзыв на этот товар
        const hasReviewed = await hasUserReviewedProduct(userId, productId);
        if (hasReviewed) {
            req.flash('error', 'Вы уже оставили отзыв на этот товар');
            return res.redirect(`/shop/product/${productId}`);
        }

        // Валидация данных
        if (!rating || rating < 1 || rating > 5) {
            req.flash('error', 'Оценка должна быть от 1 до 5');
            return res.redirect(`/shop/product/${productId}`);
        }

        if (!comment || comment.trim().length < 10) {
            req.flash('error', 'Отзыв должен содержать минимум 10 символов');
            return res.redirect(`/shop/product/${productId}`);
        }

        await createReview(userId, productId, rating, comment.trim());
        req.flash('success', 'Отзыв отправлен на модерацию');
        res.redirect(`/shop/product/${productId}`);

    } catch (error) {
        console.error('Ошибка создания отзыва:', error);
        req.flash('error', 'Ошибка при отправке отзыва');
        res.redirect(`/shop/product/${productId}`);
    }
});

// Модерация отзывов - только admin
router.get('/admin/moderation', requireRole('admin'), async (req, res) => {
    try {
        const reviews = await getAllReviews('pending');
        const cartCount = await getCartCount(req.session.userId);

        res.render('admin/reviews', {
            title: 'Модерация отзывов',
            reviews,
            cartCount,
            user: req.session.username,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Одобрение отзыва
router.post('/admin/:id/approve', requireRole('admin'), async (req, res) => {
    try {
        await approveReview(req.params.id);
        req.flash('success', 'Отзыв одобрен');
        res.redirect('/reviews/admin/moderation');

    } catch (error) {
        console.error('Ошибка одобрения отзыва:', error);
        req.flash('error', 'Ошибка при одобрении отзыва');
        res.redirect('/reviews/admin/moderation');
    }
});

// Отклонение отзыва
router.post('/admin/:id/reject', requireRole('admin'), async (req, res) => {
    try {
        await rejectReview(req.params.id);
        req.flash('success', 'Отзыв отклонен');
        res.redirect('/reviews/admin/moderation');

    } catch (error) {
        console.error('Ошибка отклонения отзыва:', error);
        req.flash('error', 'Ошибка при отклонении отзыва');
        res.redirect('/reviews/admin/moderation');
    }
});

module.exports = router;
