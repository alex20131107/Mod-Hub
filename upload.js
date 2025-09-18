class FileUploader {
    constructor() {
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.allowedTypes = ['.jar', '.zip'];
        this.chunkSize = 1 * 1024 * 1024; // 1MB chunks
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createUploadsFolder();
    }

    createUploadsFolder() {
        // В реальном приложении здесь бы создавалась папка на сервере
        // Для демонстрации используем IndexedDB для хранения файлов
        if (!window.indexedDB) {
            console.warn('IndexedDB не поддерживается, файлы будут храниться в localStorage');
        }
    }

    setupEventListeners() {
        const fileInput = document.getElementById('modFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.validateFile(e.target.files[0]);
            });
        }
    }

    validateFile(file) {
        if (!file) return false;

        // Проверка размера
        if (file.size > this.maxFileSize) {
            this.showNotification('Файл слишком большой. Максимальный размер: 50MB', 'error');
            return false;
        }

        // Проверка типа
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!this.allowedTypes.includes(extension)) {
            this.showNotification('Разрешены только .jar и .zip файлы', 'error');
            return false;
        }

        return true;
    }

    async startUpload() {
        if (!auth.isAuthenticated()) {
            this.showNotification('Для загрузки файлов необходимо войти в систему', 'error');
            showLogin();
            return;
        }

        const fileInput = document.getElementById('modFile');
        const file = fileInput.files[0];

        if (!this.validateFile(file)) {
            return;
        }

        // Получаем данные формы
        const name = document.getElementById('modName').value;
        const description = document.getElementById('modDescription').value;
        const category = document.getElementById('modCategory').value;
        const versionCheckboxes = document.querySelectorAll('input[name="version"]:checked');

        if (!name || !description || !category || versionCheckboxes.length === 0) {
            this.showNotification('Заполните все обязательные поля', 'error');
            return;
        }

        const versions = Array.from(versionCheckboxes).map(cb => cb.value);

        try {
            // Показываем прогресс
            this.showProgress();

            // Сохраняем файл в IndexedDB
            const fileId = await this.saveFileToStorage(file);
            
            // Создаем запись о моде
            const newMod = modManager.createMod({
                name,
                description,
                category,
                versions,
                fileId: fileId,
                fileName: file.name,
                fileSize: file.size
            });

            this.hideProgress();
            this.showNotification(`Мод "${name}" успешно загружен!`, 'success');
            this.resetForm();

            // Обновляем статистику
            updateStats();

        } catch (error) {
            this.hideProgress();
            this.showNotification('Ошибка при загрузке файла: ' + error.message, 'error');
        }
    }

    async saveFileToStorage(file) {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                // Fallback для браузеров без IndexedDB
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileData = {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: e.target.result,
                        uploaded: new Date().toISOString()
                    };
                    
                    // Сохраняем в localStorage (ограничение 5MB)
                    if (JSON.stringify(fileData).length > 5 * 1024 * 1024) {
                        reject(new Error('Файл слишком большой для хранения в браузере'));
                        return;
                    }

                    const fileId = 'file_' + Date.now();
                    localStorage.setItem(fileId, JSON.stringify(fileData));
                    resolve(fileId);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            } else {
                // Используем IndexedDB для больших файлов
                const request = indexedDB.open('MinecraftModHubFiles', 1);

                request.onerror = () => reject(new Error('Не удалось открыть базу данных'));
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('files')) {
                        db.createObjectStore('files');
                    }
                };

                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['files'], 'readwrite');
                    const store = transaction.objectStore('files');

                    const fileId = 'file_' + Date.now();
                    const fileData = {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: file,
                        uploaded: new Date().toISOString()
                    };

                    const putRequest = store.put(fileData, fileId);
                    
                    putRequest.onsuccess = () => resolve(fileId);
                    putRequest.onerror = () => reject(new Error('Не удалось сохранить файл'));
                };
            }
        });
    }

    async downloadFile(fileId, fileName) {
        try {
            if (!window.indexedDB) {
                // Получаем из localStorage
                const fileData = JSON.parse(localStorage.getItem(fileId));
                if (!fileData) {
                    throw new Error('Файл не найден');
                }

                this.downloadBlob(fileData.data, fileName);
            } else {
                // Получаем из IndexedDB
                const request = indexedDB.open('MinecraftModHubFiles', 1);
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const transaction = db.transaction(['files'], 'readonly');
                    const store = transaction.objectStore('files');
                    const getRequest = store.get(fileId);

                    getRequest.onsuccess = (e) => {
                        const fileData = e.target.result;
                        if (!fileData) {
                            throw new Error('Файл не найден');
                        }

                        this.downloadBlob(fileData.data, fileName);
                    };

                    getRequest.onerror = () => {
                        throw new Error('Не удалось загрузить файл');
                    };
                };
            }
        } catch (error) {
            this.showNotification('Ошибка при скачивании файла: ' + error.message, 'error');
        }
    }

    downloadBlob(dataUrl, fileName) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showProgress() {
        const progress = document.getElementById('fileProgress');
        progress.style.display = 'block';
        
        // Симуляция прогресса (в реальном приложении используйте реальные события)
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            this.updateProgress(progress);
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 100);
    }

    updateProgress(percent) {
        const fill = document.getElementById('progressFill');
        const text = document.getElementById('progressText');
        
        fill.style.width = percent + '%';
        text.textContent = percent + '%';
    }

    hideProgress() {
        const progress = document.getElementById('fileProgress');
        progress.style.display = 'none';
        this.updateProgress(0);
    }

    resetForm() {
        document.getElementById('modName').value = '';
        document.getElementById('modDescription').value = '';
        document.getElementById('modCategory').value = '';
        document.getElementById('modFile').value = '';
        document.querySelectorAll('input[name="version"]').forEach(cb => cb.checked = false);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        
        text.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        notification.classList.add('hidden');
    }
}

// Глобальный экземпляр загрузчика
const fileUploader = new FileUploader();

function startUpload() {
    fileUploader.startUpload();
}

function hideNotification() {
    fileUploader.hideNotification();
}