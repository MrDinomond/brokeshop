// Валидация и форматирование формы оформления заказа
document.addEventListener('DOMContentLoaded', function() {
    const checkoutForm = document.querySelector('form[action="/cart/checkout"]');

    if (checkoutForm) {
        // Форматирование номера карты
        const cardNumberInput = document.getElementById('cardNumber');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = '';

                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formattedValue += ' ';
                    }
                    formattedValue += value[i];
                }

                e.target.value = formattedValue.substring(0, 19); // Ограничение 16 цифр + 3 пробела
            });
        }

        // Форматирование срока действия карты
        const expiryInput = document.getElementById('expiryDate');
        if (expiryInput) {
            expiryInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/[^0-9]/gi, '');

                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }

                e.target.value = value.substring(0, 5);
            });
        }

        // Форматирование CVV
        const cvvInput = document.getElementById('cvv');
        if (cvvInput) {
            cvvInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/[^0-9]/gi, '');
                e.target.value = value.substring(0, 3);
            });
        }

        // Валидация формы перед отправкой
        checkoutForm.addEventListener('submit', function(e) {
            const requiredFields = ['fullName', 'phone', 'city', 'street', 'cardNumber', 'cardHolder', 'expiryDate', 'cvv'];
            let isValid = true;

            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && !field.value.trim()) {
                    field.style.borderColor = '#e74c3c';
                    isValid = false;
                } else if (field) {
                    field.style.borderColor = 'var(--border-color)';
                }
            });

            // Валидация номера карты
            if (cardNumberInput && cardNumberInput.value.replace(/\s+/g, '').length < 16) {
                cardNumberInput.style.borderColor = '#e74c3c';
                isValid = false;
            }

            // Валидация CVV
            if (cvvInput && cvvInput.value.length < 3) {
                cvvInput.style.borderColor = '#e74c3c';
                isValid = false;
            }

            if (!isValid) {
                e.preventDefault();
                alert('Пожалуйста, заполните все обязательные поля корректно.');
            }
        });

        // Сброс валидации при вводе
        const inputs = checkoutForm.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.trim()) {
                    this.style.borderColor = 'var(--border-color)';
                }
            });
        });
    }
});
