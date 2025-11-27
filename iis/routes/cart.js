const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart, getCartCount } = require('../models/Cart');
const { getProductById } = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

const { createOrder, addOrderItems, getUserOrders } = require('../models/Order');
const DeliveryAddress = require('../models/DeliveryAddress');
const Payment = require('../models/Payment');

// Получение корзины
router.get('/', requireAuth, async (req, res) => {
    try {
        const cartItems = await getCart(req.session.userId);
        const cartCount = await getCartCount(req.session.userId);

        let total = 0;
        cartItems.forEach(item => {
            total += item.price * item.quantity;
        });

        res.render('cart/index', {
            title: 'Корзина',
            cartItems,
            total,
            cartCount,
            user: req.session.username
        });
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Добавление товара в корзину
router.post('/add/:productId', requireAuth, async (req, res) => {
    try {
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        // Проверка существования товара
        const product = await getProductById(productId);
        if (!product) {
            req.flash('error', 'Товар не найден');
            return res.redirect('/shop');
        }

        await addToCart(req.session.userId, productId, quantity);
        req.flash('success', 'Товар добавлен в корзину');
        res.redirect('/shop');

    } catch (error) {
        console.error('Ошибка добавления в корзину:', error);
        req.flash('error', 'Ошибка при добавлении в корзину');
        res.redirect('/shop');
    }
});

// Обновление количества товара в корзине
router.post('/update/:productId', requireAuth, async (req, res) => {
    try {
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        await updateCartItem(req.session.userId, productId, quantity);
        res.redirect('/cart');

    } catch (error) {
        console.error('Ошибка обновления корзины:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Удаление товара из корзины
router.delete('/remove/:productId', requireAuth, async (req, res) => {
    try {
        await removeFromCart(req.session.userId, req.params.productId);
        req.flash('success', 'Товар удален из корзины');
        res.redirect('/cart');

    } catch (error) {
        console.error('Ошибка удаления из корзины:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Очистка корзины
router.delete('/clear', requireAuth, async (req, res) => {
    try {
        await clearCart(req.session.userId);
        req.flash('success', 'Корзина очищена');
        res.redirect('/cart');

    } catch (error) {
        console.error('Ошибка очистки корзины:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Страница оформления заказа
router.get('/checkout', requireAuth, async (req, res) => {
    try {
        const cartItems = await getCart(req.session.userId);
        const cartCount = await getCartCount(req.session.userId);

        if (cartItems.length === 0) {
            req.flash('error', 'Корзина пуста');
            return res.redirect('/cart');
        }

        let total = 0;
        cartItems.forEach(item => {
            total += item.price * item.quantity;
        });

        res.render('cart/checkout', {
            title: 'Оформление заказа',
            cartItems,
            total,
            cartCount,
            user: req.session.username
        });
    } catch (error) {
        console.error('Ошибка загрузки оформления заказа:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Обработка оформления заказа
router.post('/checkout', requireAuth, async (req, res) => {
    try {
        const cartItems = await getCart(req.session.userId);

        if (cartItems.length === 0) {
            req.flash('error', 'Корзина пуста');
            return res.redirect('/cart');
        }

        // Подсчет общей суммы
        let total = 0;
        cartItems.forEach(item => {
            total += item.price * item.quantity;
        });

        // Создание заказа
        const order = await createOrder(req.session.userId, total);
        const orderId = order.id;

        // Добавление товаров в заказ
        await addOrderItems(orderId, cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price
        })));

        // Сохранение адреса доставки
        const addressData = {
            fullName: req.body.fullName,
            phone: req.body.phone,
            country: req.body.country,
            city: req.body.city,
            street: req.body.street,
            building: req.body.building,
            apartment: req.body.apartment,
            postalCode: req.body.postalCode
        };

        await DeliveryAddress.createDeliveryAddress(req.session.userId, orderId, addressData);

        // Сохранение платежных данных
        const paymentData = {
            cardNumber: req.body.cardNumber,
            cardHolder: req.body.cardHolder,
            expiryDate: req.body.expiryDate,
            cvv: req.body.cvv,
            paymentMethod: 'card'
        };

        await Payment.createPayment(orderId, paymentData);

        // Очистка корзины
        await clearCart(req.session.userId);

        req.flash('success', `Заказ №${orderId} успешно оформлен! Сумма: ${total} ₽`);
        res.redirect('/cart/orders');

    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        req.flash('error', 'Ошибка при оформлении заказа');
        res.redirect('/cart');
    }
});

// Страница заказов пользователя
router.get('/orders', requireAuth, async (req, res) => {
    try {
        const orders = await getUserOrders(req.session.userId);
        const cartCount = await getCartCount(req.session.userId);

        res.render('cart/orders', {
            title: 'Мои заказы',
            orders,
            cartCount,
            user: req.session.username
        });
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;
