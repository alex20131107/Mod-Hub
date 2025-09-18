// Основная логика приложения
class App {
    constructor() {
        this.visitCount = 0;
        this.init();
    }

    init() {
        this.initNavigation();
        this.initSections();
        this.initModals();
        this.initTaskbar();
        this.initVisitCounter();
        this.initServiceWorker();
        this.updateStats();
    }

    initVisitCounter() {
        this.visitCount = parseInt(localStorage.getItem('visitCount') || '0');
        this.visitCount++;
        localStorage.setItem('visitCount', this.visitCount.toString());
        
        this.updateVisitCounter();
        this.updateTaskbar();
    }

    updateVisitCounter() {
        const visitElement = document.getElementById('visitCount');
        if (visitElement) {
            visitElement.textContent = `Посещения: ${this.visitCount}`;
        }
    }

    initTaskbar() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    updateDateTime() {
        const now = new Date();
        
        const timeElement = document.getElementById('currentTime');
        const dateElement = document.getElementById('currentDate');
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('ru-RU');
        }
        
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('ru-RU');
        }
    }

    updateTaskbar() {
        const userElement = document.getElementById('taskbarUser');
        const startMenuUser = document.getElementById('startMenuUser');
        
        if (auth.isAuthenticated()) {
            const user = auth.getCurrentUser();
            if (userElement) userElement.innerHTML = `<span>${user.username}</span><i class="fas fa-user"></i>`;
            if (startMenuUser) startMenuUser.textContent = user.username;
        } else {
            if (userElement) userElement.innerHTML = '<span>Гость</span><i class="fas fa-user"></i>';
            if (startMenuUser) startMenuUser.textContent = 'Гость';
        }
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(() => console.log('Service Worker зарегистрирован'))
                .catch(err => console.log('Ошибка регистрации Service Worker:', err));
        }
    }

    updateStats() {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const mods = JSON.parse(localStorage.getItem('mods')) || [];
        
        const totalDownloads = mods.reduce((sum, mod) => sum + mod.downloads, 0);
        
        document.getElementById('totalMods').textContent = mods.length;
        document.getElementById('totalDownloads').textContent = totalDownloads;
        document.getElementById('totalUsers').textContent = users.length;
    }

    // ... остальные методы из предыдущего script.js ...
}

// Глобальный экземпляр приложения
const app = new App();

function toggleStartMenu() {
    const startMenu = document.getElementById('startMenu');
    startMenu.style.display = startMenu.style.display === 'flex' ? 'none' : 'flex';
}

// Закрытие start menu при клике вне его
document.addEventListener('click', (e) => {
    const startMenu = document.getElementById('startMenu');
    const startButton = document.querySelector('.start-menu');
    
    if (startMenu && startMenu.style.display === 'flex' && 
        !startMenu.contains(e.target) && 
        !startButton.contains(e.target)) {
        startMenu.style.display = 'none';
    }
});

// Обновляем статистику при изменении данных
function updateStats() {
    app.updateStats();
}

// Показываем уведомление
function showNotification(message, type = 'info') {
    fileUploader.showNotification(message, type);
}