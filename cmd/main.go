package main

import (
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
   // "os"

    "github.com/gorilla/mux"
    _ "github.com/lib/pq"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
    Role string `json:"role"`
}

type Shift struct {
    ID        int    `json:"id"`
    UserID    int    `json:"user_id"`
    UserName  string `json:"user_name,omitempty"`
    Date      string `json:"date"`
    StartTime string `json:"start_time"`
    EndTime   string `json:"end_time"`
    Status    string `json:"status"`
}

var db *sql.DB

func main() {
    // ПОДКЛЮЧЕНИЕ К БАЗЕ
    connStr := "host=postgres port=5432 user=admin password=admin123 dbname=shift_planner sslmode=disable"

    var err error
    db, err = sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal("Ошибка БД:", err)
    }
    defer db.Close()

    err = db.Ping()
    if err != nil {
        log.Fatal("Не могу подключиться к БД:", err)
    }

    fmt.Println("✅ База данных подключена")

    // СОЗДАЕМ ТАБЛИЦЫ
    createTables()

    // СОЗДАЕМ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ
    createTestUsers()

    // РОУТЕР
    r := mux.NewRouter()

    // АПИ
    r.HandleFunc("/api/users", getUsers).Methods("GET")
    r.HandleFunc("/api/login", login).Methods("POST")
    r.HandleFunc("/api/shifts", getShifts).Methods("GET")
    r.HandleFunc("/api/shifts", createShift).Methods("POST")
    r.HandleFunc("/api/shifts/{id}", updateShift).Methods("PUT")
    r.HandleFunc("/api/shifts/{id}", deleteShift).Methods("DELETE")
    r.HandleFunc("/api/shifts/my", getMyShifts).Methods("GET")

    // ФРОНТЕНД
    r.PathPrefix("/").Handler(http.FileServer(http.Dir("./web/")))

    fmt.Println("🚀 Сервер на http://localhost:8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}

func createTables() {
    queries := []string{
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS shifts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            status TEXT DEFAULT 'planned'
        )`,
    }

    for _, q := range queries {
        db.Exec(q)
    }
    fmt.Println("✅ Таблицы созданы")
}

func createTestUsers() {
    users := []struct{
        name, email, password, role string
    }{
        {"Админ", "admin@test.com", "123", "admin"},
        {"Иван", "ivan@test.com", "123", "employee"},
        {"Мария", "maria@test.com", "123", "employee"},
    }

    for _, u := range users {
        var exists bool
        db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", u.email).Scan(&exists)
        if !exists {
            db.Exec("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
                u.name, u.email, u.password, u.role)
        }
    }
    fmt.Println("✅ Тестовые пользователи созданы")
}

func login(w http.ResponseWriter, r *http.Request) {
    var creds struct {
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&creds)

    var user User
    err := db.QueryRow("SELECT id, name, role FROM users WHERE email=$1 AND password=$2",
        creds.Email, creds.Password).Scan(&user.ID, &user.Name, &user.Role)

    if err != nil {
        http.Error(w, "Неверный email или пароль", http.StatusUnauthorized)
        return
    }

    json.NewEncoder(w).Encode(user)
}

func getUsers(w http.ResponseWriter, r *http.Request) {
    rows, _ := db.Query("SELECT id, name, role FROM users")
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        rows.Scan(&u.ID, &u.Name, &u.Role)
        users = append(users, u)
    }
    json.NewEncoder(w).Encode(users)
}

func getShifts(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-Id")
    if userID == "" {
        http.Error(w, "Нет авторизации", http.StatusUnauthorized)
        return
    }

    var isAdmin bool
    db.QueryRow("SELECT role='admin' FROM users WHERE id=$1", userID).Scan(&isAdmin)

    var rows *sql.Rows
    var err error

    if isAdmin {
        rows, err = db.Query(`
            SELECT s.id, s.user_id, u.name,
                   TO_CHAR(s.date, 'YYYY-MM-DD') as date,
                   TO_CHAR(s.start_time, 'HH24:MI') as start_time,
                   TO_CHAR(s.end_time, 'HH24:MI') as end_time,
                   s.status
            FROM shifts s
            JOIN users u ON s.user_id=u.id
            ORDER BY s.date DESC
        `)
    } else {
        rows, err = db.Query(`
            SELECT s.id, s.user_id, u.name,
                   TO_CHAR(s.date, 'YYYY-MM-DD') as date,
                   TO_CHAR(s.start_time, 'HH24:MI') as start_time,
                   TO_CHAR(s.end_time, 'HH24:MI') as end_time,
                   s.status
            FROM shifts s
            JOIN users u ON s.user_id=u.id
            WHERE s.user_id=$1
            ORDER BY s.date DESC
        `, userID)
    }

    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var shifts []Shift
    for rows.Next() {
        var s Shift
        err := rows.Scan(&s.ID, &s.UserID, &s.UserName, &s.Date, &s.StartTime, &s.EndTime, &s.Status)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        shifts = append(shifts, s)
    }
    json.NewEncoder(w).Encode(shifts)
}
func getMyShifts(w http.ResponseWriter, r *http.Request) {
    getShifts(w, r)
}

func createShift(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-Id")
    if userID == "" {
        http.Error(w, "Нет авторизации", http.StatusUnauthorized)
        return
    }

    var isAdmin bool
    db.QueryRow("SELECT role='admin' FROM users WHERE id=$1", userID).Scan(&isAdmin)

    if !isAdmin {
        http.Error(w, "Только для админа", http.StatusForbidden)
        return
    }

    var shift Shift
    json.NewDecoder(r.Body).Decode(&shift)

    if shift.EndTime <= shift.StartTime {
        http.Error(w, "Время окончания должно быть позже начала", http.StatusBadRequest)
        return
    }

    var count int
    db.QueryRow(`
        SELECT COUNT(*) FROM shifts
        WHERE user_id=$1 AND date=$2
        AND NOT (end_time<=$3 OR start_time>=$4)`,
        shift.UserID, shift.Date, shift.StartTime, shift.EndTime).Scan(&count)

    if count > 0 {
        http.Error(w, "Пересечение с другой сменой", http.StatusBadRequest)
        return
    }

    var id int
    db.QueryRow(`
        INSERT INTO shifts (user_id, date, start_time, end_time, status)
        VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        shift.UserID, shift.Date, shift.StartTime, shift.EndTime, "planned").Scan(&id)

    json.NewEncoder(w).Encode(map[string]int{"id": id})
}

func updateShift(w http.ResponseWriter, r *http.Request) {
    // Проверка админа
    userID := r.Header.Get("X-User-Id")
    var isAdmin bool
    db.QueryRow("SELECT role='admin' FROM users WHERE id=$1", userID).Scan(&isAdmin)
    if !isAdmin {
        http.Error(w, "Только для админа", http.StatusForbidden)
        return
    }

    vars := mux.Vars(r)
    var shift Shift
    json.NewDecoder(r.Body).Decode(&shift)

    db.Exec("UPDATE shifts SET user_id=$1, date=$2, start_time=$3, end_time=$4, status=$5 WHERE id=$6",
        shift.UserID, shift.Date, shift.StartTime, shift.EndTime, shift.Status, vars["id"])

    w.WriteHeader(http.StatusOK)
}

func deleteShift(w http.ResponseWriter, r *http.Request) {
    // Проверка админа
    userID := r.Header.Get("X-User-Id")
    var isAdmin bool
    db.QueryRow("SELECT role='admin' FROM users WHERE id=$1", userID).Scan(&isAdmin)
    if !isAdmin {
        http.Error(w, "Только для админа", http.StatusForbidden)
        return
    }

    vars := mux.Vars(r)
    db.Exec("DELETE FROM shifts WHERE id=$1", vars["id"])
    w.WriteHeader(http.StatusOK)
}