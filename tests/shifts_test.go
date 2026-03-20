package tests

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

// Тест 1: Проверка end_time > start_time
func TestShiftTimeValidation(t *testing.T) {
    // Создаем смену где end_time <= start_time
    invalidShift := map[string]interface{}{
        "user_id":    1,
        "date":       "2026-03-20",
        "start_time": "18:00",
        "end_time":   "09:00",
    }

    body, _ := json.Marshal(invalidShift)
    req := httptest.NewRequest("POST", "/api/shifts", bytes.NewReader(body))
    req.Header.Set("X-User-Id", "1")

    w := httptest.NewRecorder()

    if w.Code != http.StatusBadRequest {
        t.Errorf("Ожидался статус 400, получили %d", w.Code)
    }
}

// Тест 2: Проверка что employee не может создавать смены
func TestEmployeeCannotCreateShift(t *testing.T) {
    shift := map[string]interface{}{
        "user_id":    2,
        "date":       "2026-03-20",
        "start_time": "09:00",
        "end_time":   "18:00",
    }

    body, _ := json.Marshal(shift)
    req := httptest.NewRequest("POST", "/api/shifts", bytes.NewReader(body))
    req.Header.Set("X-User-Id", "2")

    w := httptest.NewRecorder()

    if w.Code != http.StatusForbidden {
        t.Errorf("Ожидался статус 403, получили %d", w.Code)
    }
}

// Тест 3: Проверка пересечения смен
func TestShiftOverlap(t *testing.T) {
    shift2 := map[string]interface{}{
        "user_id":    2,
        "date":       "2026-03-20",
        "start_time": "12:00",
        "end_time":   "15:00",
    }

    body, _ := json.Marshal(shift2)
    req := httptest.NewRequest("POST", "/api/shifts", bytes.NewReader(body))
    req.Header.Set("X-User-Id", "1")

    w := httptest.NewRecorder()

    if w.Code != http.StatusBadRequest {
        t.Errorf("Ожидался статус 400, получили %d", w.Code)
    }
}