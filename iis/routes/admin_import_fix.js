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
