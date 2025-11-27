// Скрипт для импорта данных в базу данных
// Использование: node import-data.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'models', 'shop.db');

if (!fs.existsSync('data-export.json')) {
    console.error('❌ Файл data-export.json не найден!');
    console.log('💡 Сначала экспортируйте данные: node export-data.js');
    process.exit(1);
}

const exportData = JSON.parse(fs.readFileSync('data-export.json', 'utf8'));

console.log('Импорт данных в базу данных...');
console.log(`📦 Товаров для импорта: ${exportData.products.length}`);
console.log(`👥 Пользователей для импорта: ${exportData.users.length}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
        process.exit(1);
    }
});

// Очищаем существующие данные
db.serialize(() => {
    console.log('🧹 Очищаем существующие данные...');

    // Удаляем все товары
    db.run("DELETE FROM products", [], (err) => {
        if (err) {
            console.error('Ошибка очистки товаров:', err);
            return;
        }

        // Удаляем всех пользователей (кроме системных, если они есть)
        db.run("DELETE FROM users", [], (err) => {
            if (err) {
                console.error('Ошибка очистки пользователей:', err);
                return;
            }

            console.log('📥 Импортируем товары...');

            // Добавляем товары
            let productCount = 0;
            exportData.products.forEach(product => {
                db.run(`INSERT INTO products (name, description, price, category, image, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                       [product.name, product.description, product.price, product.category, product.image, product.created_at || new Date().toISOString()],
                       function(err) {
                    if (err) {
                        console.error('Ошибка импорта товара:', product.name, err);
                    } else {
                        productCount++;
                        if (productCount === exportData.products.length) {
                            console.log(`✅ Импортировано товаров: ${productCount}`);

                            // Добавляем пользователей
                            importUsers();
                        }
                    }
                });
            });

            function importUsers() {
                console.log('📥 Импортируем пользователей...');

                let userCount = 0;
                exportData.users.forEach(user => {
                    // Генерируем хэш пароля для известных пользователей
                    let passwordHash = user.password;
                    if (user.username === 'admin') {
                        passwordHash = bcrypt.hashSync('admin123', 10);
                    } else if (user.username === 'root') {
                        passwordHash = bcrypt.hashSync('root123', 10);
                    } else if (user.username === 'user') {
                        passwordHash = bcrypt.hashSync('user123', 10);
                    }

                    db.run(`INSERT INTO users (username, email, password, role, created_at)
                            VALUES (?, ?, ?, ?, ?)`,
                           [user.username, user.email, passwordHash, user.role, user.created_at || new Date().toISOString()],
                           function(err) {
                        if (err) {
                            console.error('Ошибка импорта пользователя:', user.username, err);
                        } else {
                            userCount++;
                            if (userCount === exportData.users.length) {
                                console.log(`✅ Импортировано пользователей: ${userCount}`);
                                console.log('🎉 Импорт завершен!');

                                db.close();
                                process.exit(0);
                            }
                        }
                    });
                });
            }
        });
    });
});
