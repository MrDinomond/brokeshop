const express = require('express');
const router = express.Router();
const { registerUser, findUserByUsername, checkPassword, findUserById } = require('../models/User');
const { redirectIfAuthenticated } = require('../middleware/auth');

// Страница регистрации
router.get('/register', redirectIfAuthenticated, (req, res) => {
    res.render('auth/register', {
        title: 'Регистрация',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Обработка регистрации
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Валидация
        if (!username || !email || !password) {
            req.flash('error', 'Заполните все поля');
            return res.redirect('/auth/register');
        }

        // Проверка согласия с политикой конфиденциальности
        if (!req.body.privacyAgreement) {
            req.flash('error', 'Необходимо согласиться с политикой конфиденциальности');
            return res.redirect('/auth/register');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Пароли не совпадают');
            return res.redirect('/auth/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Пароль должен содержать минимум 6 символов');
            return res.redirect('/auth/register');
        }

        // Проверка существования пользователя
        const existingUser = await findUserByUsername(username);
        if (existingUser) {
            req.flash('error', 'Пользователь с таким именем уже существует');
            return res.redirect('/auth/register');
        }

        // Регистрация
        await registerUser(username, email, password);
        req.flash('success', 'Регистрация успешна! Теперь войдите в систему.');
        res.redirect('/auth/login');

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        req.flash('error', 'Ошибка при регистрации');
        res.redirect('/auth/register');
    }
});

// Страница входа
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('auth/login', {
        title: 'Вход',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Обработка входа
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            req.flash('error', 'Заполните все поля');
            return res.redirect('/auth/login');
        }

        // Проверка согласия с политикой конфиденциальности
        if (!req.body.privacyAgreement) {
            req.flash('error', 'Необходимо согласиться с политикой конфиденциальности');
            return res.redirect('/auth/login');
        }

        // Поиск пользователя
        const user = await findUserByUsername(username);
        if (!user) {
            req.flash('error', 'Неверное имя пользователя или пароль');
            return res.redirect('/auth/login');
        }

        // Проверка пароля
        if (!checkPassword(password, user.password)) {
            req.flash('error', 'Неверное имя пользователя или пароль');
            return res.redirect('/auth/login');
        }

        // Сохранение сессии
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userRole = user.role;

        req.flash('success', `Добро пожаловать, ${user.username}!`);
        res.redirect('/shop');

    } catch (error) {
        console.error('Ошибка входа:', error);
        req.flash('error', 'Ошибка при входе');
        res.redirect('/auth/login');
    }
});

// Политика конфиденциальности
router.get('/privacy', (req, res) => {
    res.render('auth/privacy', {
        title: 'Политика конфиденциальности'
    });
});

// Выход из системы
router.post('/logout', (req, res) => {
    console.log('Logout route called');
    console.log('Session before destroy:', req.session);
    
    req.session.destroy(err => {
        if (err) {
            console.error('Ошибка при выходе из системы:', err);
            req.flash('error', 'Ошибка при выходе из системы');
            return res.redirect('/');
        }
        console.log('Session destroyed, clearing cookie');
        res.clearCookie('connect.sid');
        console.log('Redirecting to login page');
        res.redirect('/auth/login');
    });
});

module.exports = router;
