const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'shop.db');

const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Ошибка подключения к базе данных:', err.message);
                reject(err);
                return;
            }
            console.log('Подключено к SQLite базе данных');

            // Устанавливаем global.db сразу после подключения
            global.db = db;
        });

        // Создание таблиц
        db.serialize(() => {
            // Таблица пользователей
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы users:', err);
                    reject(err);
                    return;
                }

                // Таблица товаров
                db.run(`CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price REAL NOT NULL,
                    image TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) {
                        console.error('Ошибка создания таблицы products:', err);
                        reject(err);
                        return;
                    }

                    // Таблица корзины
                    db.run(`CREATE TABLE IF NOT EXISTS cart (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        product_id INTEGER,
                        quantity INTEGER DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id),
                        FOREIGN KEY (product_id) REFERENCES products (id)
                    )`, (err) => {
                        if (err) {
                            console.error('Ошибка создания таблицы cart:', err);
                            reject(err);
                            return;
                        }

                        // Таблица заказов
                        db.run(`CREATE TABLE IF NOT EXISTS orders (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER,
                            total REAL NOT NULL,
                            status TEXT DEFAULT 'pending',
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users (id)
                        )`, (err) => {
                            if (err) {
                                console.error('Ошибка создания таблицы orders:', err);
                                reject(err);
                                return;
                            }

                            // Таблица отзывов
                            db.run(`CREATE TABLE IF NOT EXISTS reviews (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                product_id INTEGER,
                                user_id INTEGER,
                                username TEXT NOT NULL,
                                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                                comment TEXT,
                                status TEXT DEFAULT 'pending',
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                moderated_at DATETIME,
                                moderated_by INTEGER,
                                FOREIGN KEY (product_id) REFERENCES products (id),
                                FOREIGN KEY (user_id) REFERENCES users (id),
                                FOREIGN KEY (moderated_by) REFERENCES users (id)
                            )`);

                            db.run(`CREATE TABLE IF NOT EXISTS delivery_addresses (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                user_id INTEGER,
                                order_id INTEGER,
                                full_name TEXT NOT NULL,
                                phone TEXT,
                                country TEXT,
                                city TEXT NOT NULL,
                                street TEXT NOT NULL,
                                building TEXT,
                                apartment TEXT,
                                postal_code TEXT,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (user_id) REFERENCES users (id),
                                FOREIGN KEY (order_id) REFERENCES orders (id)
                            )`);

                            db.run(`CREATE TABLE IF NOT EXISTS payments (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                order_id INTEGER,
                                card_number TEXT NOT NULL,
                                card_holder TEXT NOT NULL,
                                expiry_date TEXT NOT NULL,
                                cvv TEXT NOT NULL,
                                payment_method TEXT DEFAULT 'card',
                                status TEXT DEFAULT 'pending',
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (order_id) REFERENCES orders (id)
                            )`, (err) => {
                                if (err) {
                                    console.error('Ошибка создания таблиц:', err);
                                    reject(err);
                                    return;
                                }

                                console.log('Все таблицы созданы успешно');

                            // Добавляем демо-данные
                            addDemoData(db).then(() => {
                                resolve();
                            }).catch(reject);
                            });
                        });
                    });
                });
            });
        });
    });
};

const addDemoData = (db) => {
    return new Promise((resolve, reject) => {
        // Добавляем товары
        db.get("SELECT COUNT(*) as count FROM products", [], (err, row) => {
            if (err) {
                console.error('Ошибка проверки товаров:', err);
                reject(err);
                return;
            }

            if (row && row.count === 0) {
                const products = [
                    { name: 'Пицца', description: 'Сочная пицца с разнообразными начинками', price: 850, image: 'pizza.jpg' },
                    { name: 'Бургер', description: 'Классический бургер с говяжьей котлетой', price: 450, image: 'burger.jpg' },
                    { name: 'Паста', description: 'Итальянская паста с соусом и сыром', price: 650, image: 'pasta.jpg' },
                    { name: 'Греческий салат', description: 'Свежий греческий салат с овощами', price: 350, image: 'greek_salad.jpg' },
                    { name: 'Стейк', description: 'Нежный стейк из говядины', price: 1200, image: 'steak.jpg' },
                    { name: 'Сэндвич', description: 'Вкусный сэндвич с курицей и овощами', price: 300, image: 'sandwich.jpg' },
                    { name: 'Лосось', description: 'Филе лосося на гриле', price: 950, image: 'salmon_fillet.jpg' },
                    { name: 'Хот-дог', description: 'Классический американский хот-дог', price: 250, image: 'hotdog.jpg' },
                    { name: 'Пюре', description: 'Нежное картофельное пюре', price: 200, image: 'mashed_potato.jpg' },
                    { name: 'Яичница', description: 'Яичница-болтунья с беконом', price: 280, image: 'csrambled_egg.jpg' },
                    { name: 'Барбекю', description: 'Мясо на гриле в соусе барбекю', price: 750, image: 'barbecue.jpg' },
                    { name: 'Том Ям', description: 'Острый тайский суп Том Ям', price: 400, image: 'tom_yum.jpg' },
                    { name: 'Картофель фри', description: 'Хрустящий картофель фри с солью', price: 180, image: 'french_fries.jpg' },
                    { name: 'Курица гриль', description: 'Сочная курица-гриль с приправами', price: 550, image: 'grilled_chicken.jpg' },
                    { name: 'Пирог', description: 'Домашний пирог с яблоками', price: 320, image: 'shawerma.jpg' }
                ];

                let completed = 0;
                products.forEach(product => {
                    db.run(`INSERT INTO products (name, description, price, image)
                            VALUES (?, ?, ?, ?)`,
                           [product.name, product.description, product.price, product.image], (err) => {
                        if (err) {
                            console.error('Ошибка добавления товара:', err);
                            reject(err);
                            return;
                        }
                        completed++;
                        if (completed === products.length) {
                            console.log('Добавлены демо-товары');

const addDemoUsers = (db) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
            if (err) {
                console.error('Ошибка проверки пользователей:', err);
                reject(err);
                return;
            }

            if (row && row.count === 0) {
                const users = [
                    { username: 'user', email: 'user@example.com', password: '$2a$10$g0kJ.eRWapmtS/.teA4pIuFuAHwQebjUEyY.8XdsLqb2Pdbw5.NVe', role: 'user' },
                    { username: 'admin', email: 'admin@example.com', password: '$2a$10$1k14QXRWlRWlzBq/FJJShuJ7AuwMwI4tC2kMNgxF/oCjVgL9MT/Fu', role: 'admin' }
                ];

                let completed = 0;
                users.forEach(user => {
                    db.run(`INSERT INTO users (username, email, password, role)
                            VALUES (?, ?, ?, ?)`,
                           [user.username, user.email, user.password, user.role], (err) => {
                        if (err) {
                            console.error('Ошибка добавления пользователя:', err);
                            reject(err);
                            return;
                        }
                        completed++;
                        if (completed === users.length) {
                            console.log('Добавлены демо-пользователи');
                            resolve();
                        }
                    });
                });
            } else {
                console.log('Демо-пользователи уже существуют');
                resolve();
            }
        });
    });
};
                        }
                    });
                });
            } else {
                // Даже если товары уже есть, добавляем пользователей
                addDemoUsers(db).then(() => {
                    // Добавляем отзывы после пользователей
                    return addDemoReviews(db);
                }).then(resolve).catch(reject);
            }
        });
    });
};

const addDemoUsers = (db) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
            if (err) {
                console.error('Ошибка проверки пользователей:', err);
                reject(err);
                return;
            }

            if (row && row.count === 0) {
                const users = [
                    { username: 'user', email: 'user@example.com', password: '$2a$10$g0kJ.eRWapmtS/.teA4pIuFuAHwQebjUEyY.8XdsLqb2Pdbw5.NVe', role: 'user' },
                    { username: 'admin', email: 'admin@example.com', password: '$2a$10$1k14QXRWlRWlzBq/FJJShuJ7AuwMwI4tC2kMNgxF/oCjVgL9MT/Fu', role: 'admin' }
                ];

                let completed = 0;
                users.forEach(user => {
                    db.run(`INSERT INTO users (username, email, password, role)
                            VALUES (?, ?, ?, ?)`,
                           [user.username, user.email, user.password, user.role], (err) => {
                        if (err) {
                            console.error('Ошибка добавления пользователя:', err);
                            reject(err);
                            return;
                        }
                        completed++;
                        if (completed === users.length) {
                            console.log('Добавлены демо-пользователи');
                            resolve();
                        }
                    });
                });
            } else {
                console.log('Демо-пользователи уже существуют');
                resolve();
            }
        });
    });
};

const addDemoReviews = (db) => {
    return new Promise((resolve, reject) => {
        console.log('Пропускаем добавление демо-отзывов');
        resolve();
    });
};

module.exports = { initDatabase };
