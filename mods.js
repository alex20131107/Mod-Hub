class ModManager {
    constructor() {
        this.mods = JSON.parse(localStorage.getItem('mods')) || [];
        this.init();
    }

    init() {
        this.renderMods();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Поиск при нажатии Enter
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchMods();
            }
        });

        // Автопоиск при изменении фильтров
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.searchMods();
        });

        document.getElementById('versionFilter').addEventListener('change', () => {
            this.searchMods();
        });
    }

    createMod(modData) {
        const newMod = {
            id: Date.now().toString(),
            ...modData,
            author: auth.getCurrentUser().username,
            authorId: auth.getCurrentUser().id,
            rating: 0,
            downloads: 0,
            createdAt: new Date().toISOString(),
            reviews: []
        };

        this.mods.push(newMod);
        localStorage.setItem('mods', JSON.stringify(this.mods));
        
        // Добавляем мод в список модов пользователя
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.id === auth.getCurrentUser().id);
        if (userIndex !== -1) {
            if (!users[userIndex].mods) {
                users[userIndex].mods = [];
            }
            users[userIndex].mods.push(newMod.id);
            localStorage.setItem('users', JSON.stringify(users));
        }

        return newMod;
    }

    getMods(filter = {}) {
        let filteredMods = [...this.mods];

        if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            filteredMods = filteredMods.filter(mod => 
                mod.name.toLowerCase().includes(searchTerm) ||
                mod.description.toLowerCase().includes(searchTerm) ||
                mod.author.toLowerCase().includes(searchTerm)
            );
        }

        if (filter.category) {
            filteredMods = filteredMods.filter(mod => mod.category === filter.category);
        }

        if (filter.version) {
            filteredMods = filteredMods.filter(mod => 
                mod.versions.some(v => v.startsWith(filter.version))
            );
        }

        return filteredMods;
    }

    renderMods(modsToRender = null) {
        const modsContainer = document.getElementById('modsContainer');
        const mods = modsToRender || this.getMods();

        if (mods.length === 0) {
            modsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Моды не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }

        modsContainer.innerHTML = mods.map(mod => `
            <div class="mod-card" data-id="${mod.id}">
                <div class="mod-image">
                    <i class="fas fa-cube"></i>
                </div>
                <div class="mod-content">
                    <h3 class="mod-title">${mod.name}</h3>
                    <p class="mod-description">${mod.description}</p>
                    <div class="mod-meta">
                        <span>Версии: ${mod.versions.join(', ')}</span>
                        <span>★ ${mod.rating}</span>
                    </div>
                    <div class="mod-meta">
                        <span>Автор: ${mod.author}</span>
                        <span>Загрузок: ${mod.downloads}</span>
                    </div>
                    <button class="btn btn-primary" onclick="downloadMod('${mod.id}')" 
                            ${!auth.isAuthenticated() ? 'disabled' : ''}>
                        Скачать
                    </button>
                    ${auth.isAuthenticated() && auth.getCurrentUser().id === mod.authorId ? `
                        <button class="btn btn-outline" onclick="deleteMod('${mod.id}')">
                            Удалить
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    searchMods() {
        const searchTerm = document.getElementById('searchInput').value;
        const category = document.getElementById('categoryFilter').value;
        const version = document.getElementById('versionFilter').value;

        const filteredMods = this.getMods({
            search: searchTerm,
            category: category,
            version: version
        });

        this.renderMods(filteredMods);
    }

    downloadMod(modId) {
        if (!auth.isAuthenticated()) {
            alert('Для скачивания модов необходимо войти в систему');
            showLogin();
            return;
        }

        const modIndex = this.mods.findIndex(m => m.id === modId);
        if (modIndex !== -1) {
            this.mods[modIndex].downloads++;
            localStorage.setItem('mods', JSON.stringify(this.mods));
            
            // Обновляем отображение
            this.renderMods();
            
            alert(`Начато скачивание мода "${this.mods[modIndex].name}"`);
        }
    }

    deleteMod(modId) {
        if (!confirm('Вы уверены, что хотите удалить этот мод?')) {
            return;
        }

        this.mods = this.mods.filter(m => m.id !== modId);
        localStorage.setItem('mods', JSON.stringify(this.mods));
        
        // Удаляем мод из списка пользователя
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.id === auth.getCurrentUser().id);
        if (userIndex !== -1 && users[userIndex].mods) {
            users[userIndex].mods = users[userIndex].mods.filter(id => id !== modId);
            localStorage.setItem('users', JSON.stringify(users));
        }

        this.renderMods();
        alert('Мод успешно удален');
    }
}

// Глобальный экземпляр менеджера модов
const modManager = new ModManager();

function uploadMod() {
    if (!auth.isAuthenticated()) {
        alert('Для загрузки модов необходимо войти в систему');
        showLogin();
        return;
    }

    const name = document.getElementById('modName').value;
    const description = document.getElementById('modDescription').value;
    const category = document.getElementById('modCategory').value;
    const fileInput = document.getElementById('modFile');
    const versionCheckboxes = document.querySelectorAll('input[name="version"]:checked');

    // Валидация
    if (!name || !description || !category || versionCheckboxes.length === 0 || !fileInput.files[0]) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    const versions = Array.from(versionCheckboxes).map(cb => cb.value);

    try {
        const newMod = modManager.createMod({
            name,
            description,
            category,
            versions,
            file: fileInput.files[0].name
        });

        // Очищаем форму
        document.getElementById('modName').value = '';
        document.getElementById('modDescription').value = '';
        document.getElementById('modCategory').value = '';
        document.getElementById('modFile').value = '';
        document.querySelectorAll('input[name="version"]').forEach(cb => cb.checked = false);

        alert(`Мод "${newMod.name}" успешно загружен!`);
    } catch (error) {
        alert('Ошибка при загрузке мода: ' + error.message);
    }
}

function searchMods() {
    modManager.searchMods();
}

function downloadMod(modId) {
    modManager.downloadMod(modId);
}

function deleteMod(modId) {
    modManager.deleteMod(modId);
}
