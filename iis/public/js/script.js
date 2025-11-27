// Инициализация темы при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Автоматически скрывать оповещения через 5 секунд
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });

    // Подтверждение для действий удаления
    const deleteForms = document.querySelectorAll('form[action*="delete"], form[action*="remove"]');
    deleteForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!confirm('Вы уверены, что хотите выполнить это действие?')) {
                e.preventDefault();
            }
        });
    });

    // Инициализация темы
    initializeTheme();
});

// Инициализация темы
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeToggle = document.querySelector('.theme-toggle i');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.className = 'fas fa-sun';
        }
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeToggle) {
            themeToggle.className = 'fas fa-moon';
        }
    }
}

// Переключение темы
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const themeToggle = document.querySelector('.theme-toggle i');

    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.className = 'fas fa-sun';
        }
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeToggle) {
            themeToggle.className = 'fas fa-moon';
        }
    }
}

// Функции для корзины
function changeQuantity(button, change) {
    const form = button.closest('.quantity-form');
    const input = form.querySelector('input[name="quantity"]');
    const newValue = parseInt(input.value) + change;

    if (newValue >= 1) {
        input.value = newValue;
        form.submit();
    }
}

// Добавление в корзину с анимацией
function addToCart(productId, quantity = 1) {
    const form = document.querySelector(`form[action="/cart/add/${productId}"]`);
    if (form) {
        const formData = new FormData(form);
        formData.set('quantity', quantity.toString());

        fetch(form.action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                showNotification('Товар добавлен в корзину!', 'success');
                updateCartCount();
            } else {
                showNotification('Ошибка при добавлении в корзину', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Ошибка при добавлении в корзину', 'error');
        });
    }
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Обновить счетчик корзины
function updateCartCount() {
    fetch('/cart/count')
        .then(response => response.json())
        .then(data => {
            const cartCount = document.querySelector('.cart-count');
            if (cartCount) {
                cartCount.textContent = data.count;
            }
        })
        .catch(error => console.error('Error updating cart count:', error));
}
