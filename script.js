// Основная логика приложения
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initSections();
    initModals();
});

function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Обработка кликов по навигации
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('href').substring(1);
            
            // Обновляем активные классы
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            
            // Показываем соответствующую секцию
            showSection(target);
            
            // Закрываем мобильное меню
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        });
    });
}

function initSections() {
    // Показываем первую секцию по умолчанию
    showSection('home');
}

function initModals() {
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function showSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Показываем выбранную секцию
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        window.scrollTo(0, 0);
    }
}

function scrollToSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        showSection(sectionId);
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Валидация форм
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Утилиты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Произошла ошибка:', e.error);
    alert('Произошла непредвиденная ошибка. Пожалуйста, обновите страницу.');
});

// Инициализация при загрузке
window.onload = function() {
    // Проверяем авторизацию
    if (auth.isAuthenticated()) {
        console.log('Пользователь авторизован:', auth.getCurrentUser());
    } else {
        console.log('Пользователь не авторизован');
    }

    // Загружаем моды
    modManager.renderMods();
};
