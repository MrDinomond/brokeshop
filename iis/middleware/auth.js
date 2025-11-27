// Middleware для проверки аутентификации
const { findUserById, hasRole } = require('../models/User');

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        req.flash('error', 'Необходимо войти в систему');
        res.redirect('/auth/login');
    }
};

// Middleware для проверки ролей
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.session.userId) {
            req.flash('error', 'Необходимо войти в систему');
            return res.redirect('/auth/login');
        }

        // Получаем данные пользователя из БД
        findUserById(req.session.userId)
            .then(user => {
                if (!user) {
                    req.session.destroy();
                    req.flash('error', 'Пользователь не найден');
                    return res.redirect('/auth/login');
                }

                if (hasRole(user, requiredRole)) {
                    req.user = user;
                    req.session.userRole = user.role; // Сохраняем роль в сессии
                    next();
                } else {
                    req.flash('error', 'Недостаточно прав доступа');
                    return res.redirect('/shop');
                }
            })
            .catch(err => {
                console.error('Ошибка проверки роли:', err);
                req.flash('error', 'Ошибка авторизации');
                return res.redirect('/auth/login');
            });
    };
};

// Middleware только для root
const requireRoot = (req, res, next) => {
    return requireRole('root')(req, res, next);
};

// Middleware для перенаправления аутентифицированных пользователей
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/shop');
    } else {
        next();
    }
};

module.exports = {
    requireAuth,
    requireRole,
    requireRoot,
    redirectIfAuthenticated
};
