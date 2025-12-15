const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Главная страница туториалов
router.get('/', requireAuth, (req, res) => {
    try {
        res.render('tutorials/index', {
            title: 'Туториалы - BrokeShop',
            user: req.session.username,
            cartCount: req.session.cartCount || 0,
            currentPath: '/tutorials'
        });
    } catch (error) {
        console.error('Ошибка при загрузке туториалов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Обработка страниц туториалов
router.get('/:tutorialId', requireAuth, (req, res) => {
    const { tutorialId } = req.params;
    
    // Проверяем, существует ли запрашиваемая страница туториала
    const validTutorials = ['security-guide', 'order-guide', 'payment-methods', 'delivery', 'returns'];
    
    if (!validTutorials.includes(tutorialId)) {
        return res.status(404).render('error', {
            title: 'Страница не найдена - BrokeShop',
            message: 'Запрошенный туториал не найден',
            user: req.session.username,
            cartCount: req.session.cartCount || 0
        });
    }
    
    // Рендерим запрошенную страницу туториала
    res.render(`tutorials/${tutorialId}`, {
        title: `${tutorialId === 'security-guide' ? 'Руководство по безопасности' : 'Туториал'} - BrokeShop`,
        user: req.session.username,
        cartCount: req.session.cartCount || 0,
        currentPath: `/tutorials/${tutorialId}`
    });
});

module.exports = router;
