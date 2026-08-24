#pragma once

// ============================================================
// CẤU HÌNH PHẦN CỨNG - Chỉnh PIN ở đây nếu khác
// ============================================================

// --- WiFi & Server ---
#define WIFI_SSID "NguyenNgocTai"
#define WIFI_PASSWORD "1122334455"
#define SERVER_URL "https://esp32-server.namthanh150525.workers.dev"
#define DEVICE_ID "esp32-console-001"

// --- LCD ST7789V (SPI) ---
#define TFT_MOSI_PIN 11
#define TFT_SCLK_PIN 12
#define TFT_CS_PIN 10
#define TFT_DC_PIN 13
#define TFT_RST_PIN 14
#define TFT_BL_PIN 15

// --- Joystick Analog ---
#define JOY_X_PIN 1      // ADC1_CH0
#define JOY_Y_PIN 2      // ADC1_CH1
#define JOY_SW_PIN 3     // Nút nhấn joystick
#define JOY_DEADZONE 300 // Vùng chết (0-4095)
#define JOY_CENTER 2048  // Điểm giữa ADC

// --- Nút nhấn (Active LOW) ---
#define BTN_A_PIN 4
#define BTN_B_PIN 5
#define BTN_UP_PIN 6
#define BTN_DOWN_PIN 7
#define BTN_LEFT_PIN 8
#define BTN_RIGHT_PIN 9
#define BTN_START_PIN 16
#define BTN_SELECT_PIN 17

// --- Loa ---
#define SPEAKER_PIN 18 // Buzzer đơn giản, hoặc I2S BCLK

// --- Màn hình ---
#define SCREEN_W 240
#define SCREEN_H 320
#define TARGET_FPS 30
#define FRAME_TIME_MS (1000 / TARGET_FPS)

// --- Màu sắc giao diện ---
#define COL_BG 0x0820      // Nền tối (dark navy)
#define COL_PRIMARY 0x04FF // Xanh cyan
#define COL_ACCENT 0xF800  // Đỏ
#define COL_WHITE 0xFFFF
#define COL_GRAY 0x7BEF
#define COL_DARK_GRAY 0x39E7
#define COL_GREEN 0x07E0
#define COL_YELLOW 0xFFE0
