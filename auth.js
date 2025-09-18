class Auth {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.init();
    }

    init() {
        this.updateAuthUI();
    }

    register(username, email, password) {
        // Проверка существования пользователя
        if (this.users.some(user => user.email === email)) {
            throw new Error('Пользователь с таким email уже существует');
        }

        // Создание нового пользователя
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            mods: []
        };

        this.users.push(newUser);
        localStorage.setItem('users', JSON.stringify(this.users));
        
        // Автоматический вход после регистрации
        this.login(email, password);
        
        return newUser;
    }

    login(email, password) {
        const user = this.users.find(u => u.email === email);
        
        if (!user) {
            throw new Error('Пользователь не найден');
        }

        if (user.password !== this.hashPassword(password)) {
            throw new Error('Неверный пароль');
        }

        this.currentUser = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.updateAuthUI();
        
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateAuthUI();
    }

    hashPassword(password) {
        // Простое хеширование (в реальном приложении используйте bcrypt)
        return btoa(encodeURIComponent(password));
    }

    updateAuthUI() {
        const navAuth = document.getElementById('navAuth');
        const navUser = document.getElementById('navUser');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            navAuth.style.display = 'none';
            navUser.style.display = 'flex';
            userName.textContent = this.currentUser.username;
            
            // Обновляем доступность страниц
            this.updatePageAccess();
        } else {
            navAuth.style.display = 'flex';
            navUser.style.display = 'none';
        }
    }

    updatePageAccess() {
        const uploadSection = document.querySelector('a[href="#upload"]');
        if (uploadSection) {
            uploadSection.style.display = this.currentUser ? 'block' : 'none';
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Глобальный экземпляр авторизации
const auth = new Auth();

// Функции для модальных окон
function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchToRegister() {
    closeModal('loginModal');
    showRegister();
}

function switchToLogin() {
    closeModal('registerModal');
    showLogin();
}

function login() {
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        auth.login(email, password);
        closeModal('loginModal');
        
        // Очищаем поля
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        
        alert('Вход выполнен успешно!');
    } catch (error) {
        alert(error.message);
    }
}

function register() {
    try {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;

        if (!username || !email || !password || !confirm) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        if (password !== confirm) {
            alert('Пароли не совпадают');
            return;
        }

        if (password.length < 6) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }

        auth.register(username, email, password);
        closeModal('registerModal');
        
        // Очищаем поля
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirm').value = '';
        
        alert('Регистрация выполнена успешно!');
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    auth.logout();
    alert('Вы вышли из системы');
}
