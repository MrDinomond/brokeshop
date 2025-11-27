const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireRoot } = require('../middleware/auth');
const { getAllUsers, updateUserRole, findUserById, deleteUser } = require('../models/User');
const { updateOrderStatus } = require('../models/Order');
const { getAllProducts, createProduct, updateProduct, deleteProduct } = require('../models/Product');
const { getCartCount } = require('../models/Cart');
const { getUserOrders, getOrderItems } = require('../models/Order');
const { getAllReviews, approveReview, rejectReview, deleteReview } = require('../models/Review');

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Главная страница админки
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const cartCount = await getCartCount(req.session.userId);

        // Получение статистики
        const users = await getAllUsers();
        const products = await getAllProducts();

        // Получаем все заказы для расчета статистики
        let allOrders = [];
        for (const user of users) {
            const userOrders = await getUserOrders(user.id);
            allOrders = allOrders.concat(userOrders);
        }

        const stats = {
            totalUsers: users.length,
            totalOrders: allOrders.length,
            totalProducts: products.length,
            totalRevenue: allOrders
                .filter(order => order.status === 'confirmed' || order.status === 'delivered')
                .reduce((sum, order) => sum + order.total, 0),
            completedOrders: allOrders.filter(order => order.status === 'confirmed' || order.status === 'delivered').length,
            pendingOrders: allOrders.filter(order => order.status === 'pending').length
        };

        res.render('admin/index', {
            title: 'Панель администратора',
            stats,
            orders: allOrders.slice(0, 5), // Последние 5 заказов
            cartCount,
            user: req.session.username,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Ошибка загрузки админки:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Управление пользователями - только admin и root
router.get('/users', requireRole('admin'), async (req, res) => {
    try {
        const users = await getAllUsers();
        const cartCount = await getCartCount(req.session.userId);

        res.render('admin/users', {
            title: 'Управление пользователями',
            users,
            cartCount,
            user: req.session.username,
            userRole: req.session.userRole,
            currentUserId: req.session.userId
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Просмотр детальной информации о пользователе - только admin и root
router.get('/users/:id', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await findUserById(userId);
        const cartCount = await getCartCount(req.session.userId);

        if (!user) {
            req.flash('error', 'Пользователь не найден');
            return res.redirect('/admin/users');
        }

        // Получение статистики заказов пользователя
        const userOrders = await getUserOrders(userId);
        const userStats = {
            totalOrders: userOrders.length,
            totalRevenue: userOrders
                .filter(order => order.status === 'confirmed' || order.status === 'delivered')
                .reduce((sum, order) => sum + order.total, 0),
            completedOrders: userOrders.filter(order => order.status === 'confirmed' || order.status === 'delivered').length
        };

        res.render('admin/user-detail', {
            title: `Профиль пользователя: ${user.username}`,
            user: user,
            userStats,
            cartCount,
            currentUser: req.session.username,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        req.flash('error', 'Ошибка при загрузке пользователя');
        res.redirect('/admin/users');
    }
});

// Обновление роли пользователя - только admin и root
router.post('/users/:id/role', requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const newRole = req.body.role;

        await updateUserRole(userId, newRole);
        req.flash('success', 'Роль пользователя обновлена');
        res.redirect('/admin/users');

    } catch (error) {
        console.error('Ошибка обновления роли:', error);
        req.flash('error', 'Ошибка при обновлении роли');
        res.redirect('/admin/users');
    }
});

// Удаление пользователя - только admin и root (упрощенная проверка)
router.post('/users/:id/delete', (req, res, next) => {
    if (!req.session.userId) {
        req.flash('error', 'Необходимо войти в систему');
        return res.redirect('/auth/login');
    }

    if (req.session.userRole !== 'admin' && req.session.userRole !== 'root') {
        req.flash('error', 'Недостаточно прав доступа');
        return res.redirect('/shop');
    }

    next();
}, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Запрещаем удалять самого себя
        if (userId === req.session.userId) {
            req.flash('error', 'Нельзя удалить самого себя');
            return res.redirect('/admin/users');
        }

        // Получаем данные пользователя для проверки
        const user = await findUserById(userId);
        if (!user) {
            req.flash('error', 'Пользователь не найден');
            return res.redirect('/admin/users');
        }

        // Запрещаем удалять root пользователей обычным админам
        if (user.role === 'root' && req.session.userRole !== 'root') {
            req.flash('error', 'Недостаточно прав для удаления root пользователя');
            return res.redirect('/admin/users');
        }

        await deleteUser(userId);
        req.flash('success', `Пользователь ${user.username} удален`);
        res.redirect('/admin/users');

    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        req.flash('error', 'Ошибка при удалении пользователя');
        res.redirect('/admin/users');
    }
});

// Управление заказами - только admin и root
router.get('/orders', requireRole('admin'), async (req, res) => {
    try {
        // Получаем всех пользователей
        const users = await getAllUsers();
        const cartCount = await getCartCount(req.session.userId);

        // Получаем заказы для всех пользователей
        const ordersWithItems = [];
        for (const user of users) {
            const userOrders = await getUserOrders(user.id);
            for (const order of userOrders) {
                const items = await getOrderItems(order.id);
                ordersWithItems.push({
                    ...order,
                    username: user.username,
                    items: items
                });
            }
        }

        // Сортируем по дате создания
        ordersWithItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.render('admin/orders', {
            title: 'Управление заказами',
            orders: ordersWithItems,
            cartCount,
            user: req.session.username,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Обновление статуса заказа - только admin и root
router.post('/orders/:id/status', requireRole('admin'), async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        await updateOrderStatus(orderId, status);
        req.flash('success', 'Статус заказа обновлен');
        res.redirect('/admin/orders');

    } catch (error) {
        console.error('Ошибка обновления статуса заказа:', error);
        req.flash('error', 'Ошибка при обновлении статуса заказа');
        res.redirect('/admin/orders');
    }
});

// Управление товарами - только root
router.get('/products', requireRoot, async (req, res) => {
    try {
        const products = await getAllProducts();
        const cartCount = await getCartCount(req.session.userId);

        res.render('admin/products', {
            title: 'Управление товарами',
            products,
            cartCount,
            user: req.session.username,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Создание товара - только root
router.post('/products', requireRoot, async (req, res) => {
    try {
        const { name, description, price, image } = req.body;

        // Добавляем префикс /images/ к изображению
        const imagePath = image.startsWith('/images/') ? image : `/images/${image}`;

        await createProduct(name, description, price, imagePath);
        req.flash('success', 'Товар создан');
        res.redirect('/admin/products');

    } catch (error) {
        console.error('Ошибка создания товара:', error);
        req.flash('error', 'Ошибка при создании товара');
        res.redirect('/admin/products');
    }
});

// Обновление товара - только root
router.post('/products/:id', requireRoot, async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, image } = req.body;

        // Получаем текущий товар, чтобы сохранить существующее изображение, если новое не указано
        const currentProduct = await getProductById(productId);
        
        // Обрабатываем изображение
        let imagePath;
        if (image && image.trim() !== '') {
            // Если изображение указано, добавляем префикс /images/ если его нет
            imagePath = image.startsWith('/images/') ? image : `/images/${image}`;
        } else if (currentProduct && currentProduct.image) {
            // Если изображение не указано, оставляем текущее
            imagePath = currentProduct.image;
        } else {
            // Если изображения нет, устанавливаем изображение по умолчанию
            imagePath = '/images/default.jpg';
        }

        await updateProduct(productId, name, description, price, imagePath);
        req.flash('success', 'Товар обновлен');
        res.redirect('/admin/products');

    } catch (error) {
        console.error('Ошибка обновления товара:', error);
        req.flash('error', 'Ошибка при обновлении товара: ' + error.message);
        res.redirect('/admin/products');
    }
});

// Удаление товара - только root
router.delete('/products/:id', requireRoot, async (req, res) => {
    try {
        await deleteProduct(req.params.id);
        req.flash('success', 'Товар удален');
        res.redirect('/admin/products');

    } catch (error) {
        console.error('Ошибка удаления товара:', error);
        req.flash('error', 'Ошибка при удалении товара');
        res.redirect('/admin/products');
    }
});

// Управление отзывами - только root
router.get('/reviews', requireRoot, async (req, res) => {
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
        console.error('Ошибка при загрузке отзывов:', error);
        req.flash('error', 'Ошибка при загрузке отзывов');
        res.redirect('/admin');
    }
});

// Одобрение отзыва - только root
router.post('/reviews/:id/approve', requireRoot, async (req, res) => {
    try {
        await approveReview(req.params.id, req.session.userId);
        req.flash('success', 'Отзыв одобрен');
        res.redirect('/admin/reviews');
    } catch (error) {
        console.error('Ошибка одобрения отзыва:', error);
        req.flash('error', 'Ошибка при одобрении отзыва');
        res.redirect('/admin/reviews');
    }
});

// Отклонение отзыва - только root
router.post('/reviews/:id/reject', requireRoot, async (req, res) => {
    try {
        await rejectReview(req.params.id, req.session.userId);
        req.flash('success', 'Отзыв отклонен');
        res.redirect('/admin/reviews');
    } catch (error) {
        console.error('Ошибка отклонения отзыва:', error);
        req.flash('error', 'Ошибка при отклонении отзыва');
        res.redirect('/admin/reviews');
    }
});

// Удаление отзыва - только root
router.post('/reviews/:id/delete', requireRoot, async (req, res) => {
    try {
        await deleteReview(req.params.id, req.session.userId);
        req.flash('success', 'Отзыв удален');
        res.redirect('/admin/reviews');
    } catch (error) {
        console.error('Ошибка удаления отзыва:', error);
        req.flash('error', 'Ошибка при удалении отзыва');
        res.redirect('/admin/reviews');
    }
});

// Просмотр всех отзывов - только root
router.get('/reviews/all', requireRoot, async (req, res) => {
    try {
        const reviews = await getAllReviews();
        const cartCount = await getCartCount(req.session.userId);

        res.render('admin/reviews-all', {
            title: 'Все отзывы',
            reviews,
            cartCount,
            user: req.session.username,
            userRole: req.session.userRole
        });
    } catch (error) {
        console.error('Ошибка при загрузке отзывов:', error);
        req.flash('error', 'Ошибка при загрузке отзывов');
        res.redirect('/admin');
    }
});

// Экспорт данных
router.get('/export', requireRole('admin'), async (req, res) => {
    try {
        const products = await getAllProducts();
        const users = await getAllUsers();

        const exportData = {
            products: products,
            users: users,
            exportedAt: new Date().toISOString()
        };

        // Сохраняем в корне проекта
        const exportPath = path.join(__dirname, '..', 'data-export.json');
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

        req.flash('success', 'Данные экспортированы в data-export.json');
        res.redirect('/admin');

    } catch (error) {
        console.error('Ошибка экспорта:', error);
        req.flash('error', 'Ошибка при экспорте данных');
        res.redirect('/admin');
    }
});

// Импорт данных
router.get('/import', requireRole('admin'), async (req, res) => {
    try {
        const exportPath = path.join(__dirname, '..', 'data-export.json');

        if (!fs.existsSync(exportPath)) {
            req.flash('error', 'Файл data-export.json не найден. Сначала экспортируйте данные.');
            return res.redirect('/admin');
        }

        const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

        // Очищаем существующие данные
        global.db.run("DELETE FROM products");
        global.db.run("DELETE FROM users");

        // Импортируем товары
        let importedProducts = 0;
        for (const product of exportData.products) {
            await new Promise((resolve, reject) => {
                global.db.run(`INSERT INTO products (name, description, price, image, created_at)
                              VALUES (?, ?, ?, ?, ?)`,
                             [product.name, product.description, product.price, product.image, product.created_at],
                             function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
            importedProducts++;
        }

        // Импортируем пользователей с правильными паролями
        let importedUsers = 0;
        for (const user of exportData.users) {
            let passwordHash = user.password;

            // Генерируем правильные хэши для демо-пользователей
            if (user.username === 'admin') {
                passwordHash = bcrypt.hashSync('admin123', 10);
            } else if (user.username === 'root') {
                passwordHash = bcrypt.hashSync('root123', 10);
            } else if (user.username === 'user') {
                passwordHash = bcrypt.hashSync('user123', 10);
            }

            await new Promise((resolve, reject) => {
                global.db.run(`INSERT INTO users (username, email, password, role, created_at)
                              VALUES (?, ?, ?, ?, ?)`,
                             [user.username, user.email, passwordHash, user.role, user.created_at],
                             function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
            importedUsers++;
        }

        req.flash('success', `Импортировано: ${importedProducts} товаров, ${importedUsers} пользователей`);
        res.redirect('/admin');

    } catch (error) {
        console.error('Ошибка импорта:', error);
        req.flash('error', 'Ошибка при импорте данных');
        res.redirect('/admin');
    }
});

module.exports = router;
