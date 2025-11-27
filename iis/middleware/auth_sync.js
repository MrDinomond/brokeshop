const { findUserById, hasRole } = require('../models/User');

// Синхронная версия middleware для проверки ролей
const requireRoleSync = (requiredRole) => {
    return (req, res, next) => {
        if (!req.session.userId) {
            req.flash('error', 'Необходимо войти в систему');
            return res.redirect('/auth/login');
        }

        // Синхронная проверка роли из сессии (если она там есть)
        const userRole = req.session.userRole;
        if (userRole && hasRole({ role: userRole }, requiredRole)) {
            next();
        } else {
            // Если роли нет в сессии, получаем из базы данных
            findUserById(req.session.userId)
                .then(user => {
                    if (!user) {
                        req.session.destroy();
                        req.flash('error', 'Пользователь не найден');
                        return res.redirect('/auth/login');
                    }

                    // Сохраняем роль в сессии
                    req.session.userRole = user.role;

                    if (hasRole(user, requiredRole)) {
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
        }
    };
};

// Middleware только для root
const requireRootSync = (req, res, next) => {
    return requireRoleSync('root')(req, res, next);
};

module.exports = {
    requireRoleSync,
    requireRootSync
};
