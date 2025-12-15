const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(flash());

// Сессии
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 часа
}));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Шаблоны
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Глобальные переменные для шаблонов
app.use(async (req, res, next) => {
    res.locals.user = req.session.username || null;
    res.locals.userRole = req.session.userRole || null;
    if (req.session.userId) {
        const { getCartCount } = require('./models/Cart');
        try {
            res.locals.cartCount = await getCartCount(req.session.userId);
        } catch (error) {
            res.locals.cartCount = 0;
        }
    } else {
        res.locals.cartCount = 0;
    }
    next();
});

// Инициализация базы данных (синхронно)
const { initDatabase } = require('./models/database');

initDatabase()
    .then(() => {
        console.log('База данных инициализирована');

        // Маршруты
        const authRoutes = require('./routes/auth');
        const shopRoutes = require('./routes/shop');
        const cartRoutes = require('./routes/cart');
        const adminRoutes = require('./routes/admin');
        const tutorialsRoutes = require('./routes/tutorials');

        app.use('/auth', authRoutes);
        app.use('/shop', shopRoutes);
        app.use('/cart', cartRoutes);
        app.use('/admin', adminRoutes);
        app.use('/tutorials', tutorialsRoutes);

        // Главная страница
        app.get('/', (req, res) => {
            res.redirect('/shop');
        });

        // 404 обработчик
        app.use((req, res) => {
            res.status(404).render('error', { title: 'Страница не найдена' });
        });

        // Запуск сервера
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Ошибка инициализации базы данных:', err);
        process.exit(1);
    });

module.exports = app;
