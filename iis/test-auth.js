// Тест аутентификации
const { findUserByUsername, checkPassword } = require('./models/User');

console.log('Global DB:', !!global.db);

if (global.db) {
    console.log('Тип DB:', typeof global.db);

    findUserByUsername('admin')
        .then(user => {
            if (user) {
                console.log('✅ Пользователь найден:', user.username);
                console.log('✅ Пароль совпадает:', checkPassword('admin123', user.password));
                console.log('✅ Роль:', user.role);
            } else {
                console.log('❌ Пользователь не найден');
            }
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Ошибка:', err.message);
            process.exit(1);
        });
} else {
    console.error('❌ Global DB не установлен');
    process.exit(1);
}
