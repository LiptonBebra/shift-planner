-- Добавляем больше тестовых данных
DO $$
DECLARE
emp_record RECORD;
    shift_date DATE;
    shift_start TIME;
BEGIN
FOR emp_record IN SELECT id FROM users WHERE role = 'employee' LOOP
        -- Добавляем по 3-5 смен на каждого сотрудника
        FOR i IN 1..floor(random() * 3 + 3) LOOP
            shift_date := CURRENT_DATE + (i * 2)::int;
shift_start := '08:00'::time + (random() * 4)::int * interval '1 hour';

INSERT INTO shifts (user_id, date, start_time, end_time, status)
VALUES (
           emp_record.id,
           shift_date,
           shift_start,
           shift_start + interval '8 hours',
           CASE (random() * 2)::int
                    WHEN 0 THEN 'planned'
                    WHEN 1 THEN 'confirmed'
                    ELSE 'canceled'
                END
       );
END LOOP;
END LOOP;
END $$;