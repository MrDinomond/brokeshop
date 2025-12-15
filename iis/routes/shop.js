const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, getProductsByCategory, searchProducts } = require('../models/Product');
const { requireAuth } = require('../middleware/auth');
const { getCartCount } = require('../models/Cart');
const { createReview, getProductReviews, hasUserReviewed, getProductRating } = require('../models/Review');

// Главная страница магазина
router.get('/', requireAuth, async (req, res) => {
    try {
        const products = await getAllProducts();
        const categories = [...new Set(products.map(p => p.category))];
        const cartCount = await getCartCount(req.session.userId);

        res.render('shop/index', {
            title: 'BrokeShop',
            products,
            categories,
            user: req.session.username,
            search: '',
            currentPath: '/shop',
            selectedCategory: '',
            cartCount
        });
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Страница товара
router.get('/product/:id', requireAuth, async (req, res) => {
    try {
        const product = await getProductById(req.params.id);
        if (!product) {
            return res.status(404).render('error', { title: 'Товар не найден' });
        }

        const cartCount = await getCartCount(req.session.userId);

        // Получаем отзывы для товара
        const reviews = await getProductReviews(req.params.id);
        const rating = await getProductRating(req.params.id);
        const hasReviewed = await hasUserReviewed(req.params.id, req.session.userId);

        res.render('shop/product', {
            title: product.name,
            product,
            reviews,
            rating,
            hasReviewed,
            user: req.session.username,
            cartCount,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Ошибка загрузки товара:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Поиск товаров
router.get('/search', requireAuth, async (req, res) => {
    try {
        const query = req.query.q || '';
        const category = req.query.category || '';

        let products;
        if (query) {
            products = await searchProducts(query);
        } else if (category) {
            products = await getProductsByCategory(category);
        } else {
            products = await getAllProducts();
        }

        const allProducts = await getAllProducts();
        const categories = [...new Set(allProducts.map(p => p.category))];
        const cartCount = await getCartCount(req.session.userId);

        res.render('shop/index', {
            title: query ? `BrokeShop - Результаты поиска: ${query}` : category ? `BrokeShop - Категория: ${category}` : 'BrokeShop',
            products,
            categories,
            user: req.session.username,
            search: query,
            selectedCategory: category,
            cartCount
        });
    } catch (error) {
        console.error('Ошибка поиска:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Создание отзыва
router.post('/product/:id/review', requireAuth, async (req, res) => {
    try {
        // Проверяем, что это JSON-запрос
        const isJsonRequest = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
        const sendError = (status, message) => {
            if (isJsonRequest) {
                return res.status(status).json({ error: message });
            }
            req.flash('error', message);
            return res.redirect(`/product/${req.params.id}`);
        };

        const { rating, comment } = req.body;
        const productId = req.params.id;
        const userId = req.session.userId;
        const username = req.session.username;

        // Проверяем, что пользователь аутентифицирован
        if (!userId || !username) {
            return sendError(401, 'Требуется авторизация');
        }

        // Проверяем, что пользователь еще не оставлял отзыв на этот товар
        try {
            const hasReviewed = await hasUserReviewed(productId, userId);
            if (hasReviewed) {
                return sendError(400, 'Вы уже оставляли отзыв на этот товар');
            }
        } catch (error) {
            console.error('Ошибка при проверке отзыва:', error);
            return sendError(500, 'Ошибка при проверке отзыва');
        }

        // Валидация данных
        if (!rating) {
            return sendError(400, 'Пожалуйста, выберите оценку');
        }

        const ratingNum = parseInt(rating, 10);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return sendError(400, 'Рейтинг должен быть от 1 до 5');
        }

        // Валидация комментария - можно оставить пустым
        if (comment && comment.trim().length > 0 && comment.trim().length < 3) {
            return sendError(400, 'Если вы пишете комментарий, он должен содержать минимум 3 символа');
        }

        // Создаем отзыв
        try {
            await createReview(userId, productId, username, ratingNum, comment ? comment.trim() : '');
            
            if (isJsonRequest) {
                return res.json({ 
                    message: 'Отзыв успешно отправлен на модерацию' 
                });
            }
            
            req.flash('success', 'Отзыв отправлен на модерацию');
            return res.redirect(`/product/${productId}`);
            
        } catch (error) {
            console.error('Ошибка при создании отзыва:', error);
            return sendError(500, 'Произошла ошибка при сохранении отзыва');
        }

    } catch (error) {
        console.error('Непредвиденная ошибка при обработке отзыва:', error);
        
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.status(500).json({ 
                error: 'Внутренняя ошибка сервера' 
            });
        }
        
        req.flash('error', 'Произошла непредвиденная ошибка');
        return res.redirect(`/product/${req.params.id}`);
    }
});

module.exports = router;
