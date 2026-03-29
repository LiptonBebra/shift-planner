// Глобальные переменные
let currentUser = null;
let users = [];
let allShifts = [];
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 5;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    // Проверяем сохраненную сессию
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
        loadShifts();
    }

    // Обработчик выбора пользователя
    document.getElementById('user-select')?.addEventListener('change', function(e) {
        const selectedId = e.target.value;
        const selectedUser = users.find(u => u.id == selectedId);

        // Показываем поле пароля только для админа
        const passwordField = document.getElementById('admin-password-field');
        if (selectedUser?.role === 'admin') {
            passwordField.classList.remove('hidden');
        } else {
            passwordField.classList.add('hidden');
        }
    });
});

// Загрузка списка пользователей
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        users = await response.json();

        const select = document.getElementById('user-select');
        select.innerHTML = '<option value="">Выберите пользователя</option>';

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.role === 'admin' ? 'Администратор' : 'Сотрудник'})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

// Вход в систему
async function login() {
    const userId = document.getElementById('user-select').value;
    const selectedUser = users.find(u => u.id == userId);

    if (!userId || !selectedUser) {
        showError('Выберите пользователя');
        return;
    }

    // Для админа проверяем пароль
    if (selectedUser.role === 'admin') {
        const password = document.getElementById('admin-password').value;
        if (!password) {
            showError('Введите пароль администратора');
            return;
        }

        if (password !== 'admin123') {
            showError('Неверный пароль');
            return;
        }
    }

    currentUser = selectedUser;
    localStorage.setItem('user', JSON.stringify(currentUser));

    showMainApp();
    loadShifts();
}

function showError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
}

// Показать основное приложение
function showMainApp() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('shifts-section').style.display = 'block';

    // Обновляем информацию о пользователе
    document.getElementById('user-info').innerHTML = `
        <span class="text-gray-700">${currentUser.name}</span>
        <span class="text-sm text-gray-500">(${currentUser.role === 'admin' ? 'Администратор' : 'Сотрудник'})</span>
        <button onclick="logout()" class="text-gray-400 hover:text-gray-600 ml-4">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
        </button>
    `;

    const filterUserContainer = document.getElementById('filter-user-container');
    if (currentUser.role === 'admin') {
        filterUserContainer.style.display = 'block';
    } else {
        filterUserContainer.style.display = 'none';
    }

    if (currentUser.role === 'admin') {
        document.getElementById('admin-controls').style.display = 'block';
        loadUsersForFilters();
        setupShiftForm();
    } else {
        document.getElementById('admin-controls').style.display = 'none';
    }
}

// Выход
function logout() {
    localStorage.removeItem('user');
    currentUser = null;
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('shifts-section').style.display = 'none';
    document.getElementById('admin-password-field').classList.add('hidden');
    document.getElementById('user-select').value = '';
    document.getElementById('admin-password').value = '';
}

// Загрузка пользователей для фильтров
async function loadUsersForFilters() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        const filterSelect = document.getElementById('filter-user');
        const shiftSelect = document.getElementById('shift-user');

        filterSelect.innerHTML = '<option value="">Все сотрудники</option>';
        shiftSelect.innerHTML = '<option value="">Выберите сотрудника</option>';

        users.forEach(user => {
            if (user.role === 'employee') {
                filterSelect.innerHTML += `<option value="${user.id}">${user.name}</option>`;
                shiftSelect.innerHTML += `<option value="${user.id}">${user.name}</option>`;
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
    }
}

// Настройка формы создания смены
function setupShiftForm() {
    const form = document.getElementById('shift-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const shiftData = {
            user_id: parseInt(document.getElementById('shift-user').value),
            date: document.getElementById('shift-date').value,
            start_time: document.getElementById('shift-start').value,
            end_time: document.getElementById('shift-end').value
        };

        if (!shiftData.user_id || !shiftData.date || !shiftData.start_time || !shiftData.end_time) {
            alert('Заполните все поля');
            return;
        }

        if (shiftData.end_time <= shiftData.start_time) {
            alert('Время окончания должно быть позже времени начала');
            return;
        }

        try {
            const response = await fetch('/api/shifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser.id
                },
                body: JSON.stringify(shiftData)
            });

            if (response.ok) {
                alert('Смена создана');
                form.reset();
                loadShifts();
            } else {
                const error = await response.text();
                alert('Ошибка: ' + error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    });
}

// Загрузка смен
async function loadShifts() {
    try {
        const response = await fetch('/api/shifts', {
            headers: { 'X-User-Id': currentUser.id }
        });

        allShifts = await response.json();
        console.log('Полученные данные:', allShifts);

        // Вычисляем количество страниц
        totalPages = Math.ceil(allShifts.length / itemsPerPage);
        currentPage = 1;

        // Показываем первую страницу
        const start = 0;
        const end = itemsPerPage;
        const paginatedShifts = allShifts.slice(start, end);

        displayShifts(paginatedShifts);
        document.getElementById('shifts-count').textContent = `Всего: ${allShifts.length}`;
        updatePagination();
    } catch (error) {
        console.error('Ошибка загрузки смен:', error);
    }
}

// Отображение смен
// Отображение смен
function displayShifts(shifts) {
    const container = document.getElementById('shifts-list');

    if (shifts.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-500">Нет смен для отображения</div>';
        updatePagination();
        return;
    }

    let html = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сотрудник</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Начало</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Конец</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
    `;

    if (currentUser.role === 'admin') {
        html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>';
    }

    html += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';

    shifts.forEach(shift => {
        const statusColors = {
            'planned': 'bg-yellow-100 text-yellow-800',
            'confirmed': 'bg-green-100 text-green-800',
            'canceled': 'bg-red-100 text-red-800'
        };

        const statusText = {
            'planned': 'Запланирована',
            'confirmed': 'Подтверждена',
            'canceled': 'Отменена'
        };

        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${shift.date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${shift.user_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${shift.start_time ? shift.start_time.substring(0,5) : '--:--'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${shift.end_time ? shift.end_time.substring(0,5) : '--:--'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${currentUser.role === 'admin'
            ? `<select onchange="updateShiftStatus(${shift.id}, this.value)" 
                               class="text-sm rounded-lg ${statusColors[shift.status]} px-3 py-1 border-0 focus:ring-2 focus:ring-blue-500">
                               <option value="planned" ${shift.status === 'planned' ? 'selected' : ''}>Запланирована</option>
                               <option value="confirmed" ${shift.status === 'confirmed' ? 'selected' : ''}>Подтверждена</option>
                               <option value="canceled" ${shift.status === 'canceled' ? 'selected' : ''}>Отменена</option>
                           </select>`
            : `<span class="px-3 py-1 rounded-full text-sm font-medium ${statusColors[shift.status]}">${statusText[shift.status]}</span>`
        }
                 </td>
        `;

        if (currentUser.role === 'admin') {
            html += `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="editShift(${shift.id})" class="text-blue-600 hover:text-blue-900 mr-3">✏️</button>
                    <button onclick="deleteShift(${shift.id})" class="text-red-600 hover:text-red-900">🗑️</button>
                 </td>
            `;
        }

        html += ' </tr>';
    });

    html += '</tbody> </table>';
    container.innerHTML = html;

    // Обновляем пагинацию
    updatePagination();

}

// Фильтры
function applyFilters() {
    let filtered = [...allShifts];
    const date = document.getElementById('filter-date').value;
    const user = document.getElementById('filter-user').value;

    if (date) filtered = filtered.filter(s => s.date === date);
    if (user && currentUser.role === 'admin') filtered = filtered.filter(s => s.user_id == user);

    // Обновляем пагинацию для отфильтрованных
    allShifts = filtered;
    totalPages = Math.ceil(allShifts.length / itemsPerPage);
    currentPage = 1;

    const start = 0;
    const end = itemsPerPage;
    const paginatedShifts = allShifts.slice(start, end);

    displayShifts(paginatedShifts);
    document.getElementById('shifts-count').textContent = `Всего: ${allShifts.length}`;
    updatePagination();

    // ДОБАВЛЯЕМ КНОПКИ ПРЯМО КАК В КОНСОЛИ
    if (totalPages > 1) {
        const container = document.getElementById('shifts-list');
        const paginationHtml = `
            <div class="pagination flex justify-between items-center mt-6 px-4 py-3 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-700">
                    Страница ${currentPage} из ${totalPages}
                </div>
                <div class="flex space-x-2">
                    <button onclick="changePage(${currentPage - 1})" 
                        ${currentPage <= 1 ? 'disabled' : ''}
                        class="px-4 py-2 bg-white border rounded-md text-sm ${currentPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}">
                        ← Назад
                    </button>
                    <button onclick="changePage(${currentPage + 1})" 
                        ${currentPage >= totalPages ? 'disabled' : ''}
                        class="px-4 py-2 bg-white border rounded-md text-sm ${currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}">
                        Вперед →
                    </button>
                </div>
            </div>
        `;

        // Удаляем старые кнопки если были
        const oldPagination = container.querySelector('.pagination');
        if (oldPagination) oldPagination.remove();

        // Добавляем новые
        container.insertAdjacentHTML('beforeend', paginationHtml);
    } else {
        // Удаляем кнопки если страница одна
        const container = document.getElementById('shifts-list');
        const oldPagination = container.querySelector('.pagination');
        if (oldPagination) oldPagination.remove();
    }
}

function resetFilters() {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-user').value = '';
    loadShifts();
}

// Обновление статуса
async function updateShiftStatus(id, status) {
    const shift = allShifts.find(s => s.id === id);
    if (!shift) return;

    try {
        const response = await fetch(`/api/shifts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': currentUser.id
            },
            body: JSON.stringify({ ...shift, status })
        });

        if (response.ok) {
            loadShifts();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Удаление
async function deleteShift(id) {
    if (!confirm('Удалить смену?')) return;

    try {
        await fetch(`/api/shifts/${id}`, {
            method: 'DELETE',
            headers: { 'X-User-Id': currentUser.id }
        });
        loadShifts();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Редактирование смены
async function editShift(id) {
    const shift = allShifts.find(s => s.id === id);
    if (!shift) return;

    document.getElementById('shift-user').value = shift.user_id;
    document.getElementById('shift-date').value = shift.date;
    document.getElementById('shift-start').value = shift.start_time;
    document.getElementById('shift-end').value = shift.end_time;

    const form = document.getElementById('shift-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Обновить смену';

    const originalSubmit = form.onsubmit;
    form.onsubmit = async (e) => {
        e.preventDefault();

        const updatedShift = {
            user_id: parseInt(document.getElementById('shift-user').value),
            date: document.getElementById('shift-date').value,
            start_time: document.getElementById('shift-start').value,
            end_time: document.getElementById('shift-end').value,
            status: shift.status
        };

        if (updatedShift.end_time <= updatedShift.start_time) {
            alert('Время окончания должно быть позже времени начала');
            return;
        }

        try {
            const response = await fetch(`/api/shifts/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUser.id
                },
                body: JSON.stringify(updatedShift)
            });

            if (response.ok) {
                alert('Смена обновлена');
                form.reset();
                submitBtn.textContent = originalText;
                form.onsubmit = originalSubmit;
                loadShifts();
            } else {
                const error = await response.text();
                alert('Ошибка: ' + error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    };
}

// Показать смены на текущую неделю
function showWeekShifts() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay() + 7);

    let filtered = allShifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate >= startOfWeek && shiftDate <= endOfWeek;
    });

    allShifts = filtered;
    totalPages = Math.ceil(allShifts.length / itemsPerPage);
    currentPage = 1;

    const start = 0;
    const end = itemsPerPage;
    const paginatedShifts = allShifts.slice(start, end);

    displayShifts(paginatedShifts);
    document.getElementById('shifts-count').textContent = `Всего: ${allShifts.length} (текущая неделя)`;
    updatePagination();
}

// Смена страницы
function changePage(newPage) {
    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedShifts = allShifts.slice(start, end);
    displayShifts(paginatedShifts);
}

// Обновление пагинации
function updatePagination() {
    const paginationDiv = document.getElementById('pagination');
    const currentPageSpan = document.getElementById('current-page-display');
    const totalPagesSpan = document.getElementById('total-pages-display');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (totalPages > 1) {
        paginationDiv.classList.remove('hidden');
        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages;

        // Обновляем состояние кнопок
        prevBtn.disabled = (currentPage <= 1);
        prevBtn.className = `px-4 py-2 bg-white border rounded-md text-sm ${currentPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`;

        nextBtn.disabled = (currentPage >= totalPages);
        nextBtn.className = `px-4 py-2 bg-white border rounded-md text-sm ${currentPage >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`;
    } else {
        paginationDiv.classList.add('hidden');
    }
}

// Обработчики кнопок пагинации
document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                changePage(currentPage - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                changePage(currentPage + 1);
            }
        });
    }
});

