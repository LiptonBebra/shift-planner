-- Создание таблицы shifts
CREATE TABLE IF NOT EXISTS shifts (
                                      id SERIAL PRIMARY KEY,
                                      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'confirmed', 'canceled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                                                                                        );

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON shifts(user_id, date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status_date ON shifts(status, date);
CREATE INDEX IF NOT EXISTS idx_shifts_date_start ON shifts(date, start_time);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();