-- Создание таблицы users
CREATE TABLE IF NOT EXISTS users (
                                     id SERIAL PRIMARY KEY,
                                     name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- Индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Добавляем тестовых пользователей с паролями
-- Пароль для всех: 123456 (в реальном проекте нужно хешировать)
INSERT INTO users (name, email, password_hash, role) VALUES
                                                         ('Администратор', 'admin@shift.com', '$2a$10$YourHashHere', 'admin'),
                                                         ('Иван Петров', 'ivan@shift.com', '$2a$10$YourHashHere', 'employee'),
                                                         ('Мария Сидорова', 'maria@shift.com', '$2a$10$YourHashHere', 'employee'),
                                                         ('Алексей Смирнов', 'alex@shift.com', '$2a$10$YourHashHere', 'employee'),
                                                         ('Елена Козлова', 'elena@shift.com', '$2a$10$YourHashHere', 'employee')
    ON CONFLICT (email) DO NOTHING;