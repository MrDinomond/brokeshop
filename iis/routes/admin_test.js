const express = require('express');
const router = express.Router();

// Простой роут для тестирования
router.get('/test', (req, res) => {
    res.send('Admin test route working!');
});

module.exports = router;
