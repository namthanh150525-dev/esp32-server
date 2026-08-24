// ============================================================
// ESP32 Console Simulator - Full App Logic
// Tính năng: Lockscreen, Control Center, WiFi Setup, Cloud Music, 4 Games, Dev Config
// ============================================================

// --- Cấu hình màn hình ---
const SCREEN_W = 320, SCREEN_H = 240;
const HUD_H = 40;

let currentApp = null;
let ccY = -150, ccTargetY = -150, ccOpen = false;
let ccCursor = 0; // 0: brightness, 1: volume
let menuScrollY = 0, menuScrollYTarget = 0;
let transitionActive = false;
let ccLastInteractionTime = 0;
let sysBrightness = 80;
let sysVolume = 50;
let isWifiConnected = false;

let prevBtnA = false, prevBtnStart = false, prevBtnB = false, prevBtnUp = false, prevBtnDown = false, prevBtnLeft = false, prevBtnRight = false, prevBtnHome = false, prevBtnPower = false;
let prevBtnSelect = false;

// ── Audio (Mô phỏng tone ESP32) ───────────────────────────────
let audioCtx = null;
function tone(freq, durationMs) {
    if (sysVolume === 0) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'square'; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime((sysVolume/100) * 0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
        osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.05);
    } catch(e) {}
}

function showSplash() {
    for (let y = 0; y < SCREEN_H; y++) tft.drawFastHLine(0, y, SCREEN_W, tft.color565(0, Math.floor(y/10), Math.floor(y/8)));
    tft.setTextColor(0x07FF); tft.setTextFont(7); tft.setCursor(15, 90); tft.print("ESP32");
    tft.setTextColor(0xFFFF); tft.setTextFont(4); tft.setCursor(20, 155); tft.print("GAME CONSOLE");
    tft.setTextColor(0x7BEF); tft.setTextFont(2); tft.setCursor(40, 195); tft.print("v2.1  OS Mode");
    
    let progress = 0;
    const bar = setInterval(() => {
        tft.fillRoundRect(30, 240, progress, 14, 7, 0x07FF);
        progress += 8;
        if (progress >= 180) {
            clearInterval(bar);
            tone(523, 100); setTimeout(() => tone(659, 100), 130); setTimeout(() => tone(784, 100), 260); setTimeout(() => tone(1047, 200), 390);
            setTimeout(() => { currentApp = 'lockscreen'; }, 800);
        }
    }, 20);
}

// ── STATUS BAR GLOBAL ─────────────────────────────────────────
function drawStatusBar() {
    tft.fillRect(0, 0, SCREEN_W, 16, 0x0000); // Nền đen cho status bar
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    
    tft.setTextColor(0xFFFF); tft.setTextFont(1); tft.setCursor(5, 4); tft.print(hh + ":" + mm);
    
    if (isWifiConnected) {
        tft.fillCircle(SCREEN_W - 35, 8, 1, 0xFFFF); tft.drawCircle(SCREEN_W - 35, 8, 3, 0xFFFF); tft.drawCircle(SCREEN_W - 35, 8, 5, 0xFFFF);
    }
    
    tft.drawRect(SCREEN_W - 25, 4, 18, 8, 0xFFFF); tft.fillRect(SCREEN_W - 7, 6, 2, 4, 0xFFFF); tft.fillRect(SCREEN_W - 23, 6, 14, 4, 0x07E0);
}

// ── LOCKSCREEN & CONTROL CENTER ───────────────────────────────
function drawLockscreen() {
    tft.fillScreen(0x0000); // Đen hoàn toàn
    const cx = SCREEN_W / 2; // 160
    const cy = 115;          // 115

    // Faint Web/Gear Pattern
    tft.drawCircle(cx - 25, cy + 15, 22, 0x1082);
    tft.drawCircle(cx + 25, cy + 15, 22, 0x1082);
    tft.drawCircle(cx, cy - 25, 22, 0x1082);
    for (let i = 0; i < 12; i++) {
        const a = (i * 30) * Math.PI / 180;
        tft.drawLine(cx - 25, cy + 15, Math.round(cx - 25 + 22 * Math.cos(a)), Math.round(cy + 15 + 22 * Math.sin(a)), 0x1082);
        tft.drawLine(cx + 25, cy + 15, Math.round(cx + 25 + 22 * Math.cos(a)), Math.round(cy + 15 + 22 * Math.sin(a)), 0x1082);
        tft.drawLine(cx, cy - 25, Math.round(cx + 22 * Math.cos(a)), Math.round(cy - 25 + 22 * Math.sin(a)), 0x1082);
    }
    // Vòng ngoài
    tft.drawCircle(cx, cy, 70, 0x1082);

    // Top Text (Arachne)
    tft.setTextColor(0x7BEF); tft.setTextFont(1);
    tft.setCursor(cx - 36, 12); tft.print("A R A C H N E");
    tft.setTextColor(0x4228); 
    tft.setCursor(cx - 65, 24); tft.print("CALIBRE 72 - SUSPENSION");

    // Numbers 1-12 (Golden)
    tft.setTextColor(0xFEA0); // Màu Vàng Gold
    tft.setTextFont(2);
    for (let h = 1; h <= 12; h++) {
        const ang = (h * 30 - 90) * Math.PI / 180;
        const nx = Math.round(cx + 59 * Math.cos(ang));
        const ny = Math.round(cy + 59 * Math.sin(ang));
        const tw = h > 9 ? 12 : 6;
        tft.setCursor(nx - tw, ny - 6);
        tft.print(h);
    }

    // Thời gian thực
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const sec = d.getSeconds() + d.getMilliseconds() / 1000;

    // --- SPIDER (Thân nhện vàng) ---
    tft.fillCircle(cx, cy + 4, 8, 0xFEA0); // Bụng (Abdomen)
    tft.fillCircle(cx, cy - 6, 5, 0xFEA0); // Đầu (Head)
    
    // Các chân nhện tĩnh
    const drawLeg = (ang, r1, r2, bendAng) => {
        const rad = ang * Math.PI / 180;
        const rad2 = (ang + bendAng) * Math.PI / 180;
        const jx = Math.round(cx + r1 * Math.cos(rad));
        const jy = Math.round(cy + r1 * Math.sin(rad));
        const ex = Math.round(jx + r2 * Math.cos(rad2));
        const ey = Math.round(jy + r2 * Math.sin(rad2));
        tft.drawLine(cx, cy, jx, jy, 0xCE59); // Màu vàng tối hơn
        tft.drawLine(jx, jy, ex, ey, 0xCE59);
    };
    drawLeg(210, 20, 20, -40); // Chân trên trái
    drawLeg(330, 20, 20, 40);  // Chân trên phải
    drawLeg(160, 25, 25, -30); // Chân giữa trái
    drawLeg(20,  25, 25, 30);  // Chân giữa phải
    drawLeg(120, 35, 15, -20); // Chân dưới trái

    // --- Các kim đồng hồ là chân nhện cử động ---
    // Kim Giây (Chân mỏng vươn dài)
    const secAng = (sec * 6 - 90) * Math.PI / 180;
    const sx = Math.round(cx + 45 * Math.cos(secAng));
    const sy = Math.round(cy + 45 * Math.sin(secAng));
    tft.drawLine(cx, cy-6, sx, sy, 0xFFE0); // Nối từ đầu nhện

    // Kim Phút (Chân dài có khớp)
    const minAng = ((d.getMinutes() + sec / 60) * 6 - 90) * Math.PI / 180;
    const mx1 = Math.round(cx + 25 * Math.cos(minAng - 0.2));
    const my1 = Math.round(cy + 25 * Math.sin(minAng - 0.2));
    const mx2 = Math.round(cx + 52 * Math.cos(minAng));
    const my2 = Math.round(cy + 52 * Math.sin(minAng));
    tft.drawLine(cx, cy, mx1, my1, 0xFEA0); 
    tft.drawLine(mx1, my1, mx2, my2, 0xFEA0);
    // Làm dày kim phút
    tft.drawLine(cx+1, cy, mx1+1, my1, 0xFEA0); 
    tft.drawLine(mx1+1, my1, mx2, my2, 0xFEA0);

    // Kim Giờ (Chân ngắn có khớp, mập mạp)
    const hrAng = ((d.getHours() % 12 + d.getMinutes() / 60) * 30 - 90) * Math.PI / 180;
    const hx1 = Math.round(cx + 15 * Math.cos(hrAng + 0.3));
    const hy1 = Math.round(cy + 15 * Math.sin(hrAng + 0.3));
    const hx2 = Math.round(cx + 35 * Math.cos(hrAng));
    const hy2 = Math.round(cy + 35 * Math.sin(hrAng));
    tft.drawLine(cx, cy, hx1, hy1, 0xFEA0); 
    tft.drawLine(hx1, hy1, hx2, hy2, 0xFEA0);
    // Làm dày kim giờ
    tft.drawLine(cx+1, cy, hx1+1, hy1, 0xFEA0); 
    tft.drawLine(hx1+1, hy1, hx2, hy2, 0xFEA0);
    tft.drawLine(cx-1, cy, hx1-1, hy1, 0xFEA0); 
    tft.drawLine(hx1-1, hy1, hx2, hy2, 0xFEA0);

    // Đồng hồ số
    const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    tft.setTextColor(0xFFFF);
    tft.setTextFont(2);
    tft.setCursor(cx - 40, 195);
    tft.print(timeStr);
    
    tft.setTextColor(0x4228); tft.setTextFont(1);
    tft.setCursor(cx - 70, 215); 
    tft.print("LOCAL TIME  NO BATTERIES");

    drawStatusBar();
}

function drawControlCenter(yOffset) {
    yOffset = Math.floor(yOffset);
    // Vẽ nền mờ bo tròn (iOS Style)
    tft.fillRoundRect(20, yOffset, 280, 140, 15, 0x18E3);
    tft.drawRoundRect(20, yOffset, 280, 140, 15, 0x2945);
    
    tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(95, yOffset + 15); tft.print("CONTROL CENTER");
    
    // Brightness Slider (iOS style)
    tft.fillRoundRect(30, yOffset + 45, 260, 30, 8, 0x0820); // Track nền
    let bW = Math.max(16, (sysBrightness/100)*260);
    tft.fillRoundRect(30, yOffset + 45, bW, 30, 8, ccCursor===0 ? 0xFFFF : 0x7BEF); // Thanh trượt
    tft.setTextColor(ccCursor===0 ? 0x0000 : 0xFFFF); tft.setTextFont(1); tft.setCursor(40, yOffset + 55); tft.print("BRIGHTNESS");
    
    // Volume Slider (iOS style)
    tft.fillRoundRect(30, yOffset + 90, 260, 30, 8, 0x0820); // Track nền
    let vW = Math.max(16, (sysVolume/100)*260);
    tft.fillRoundRect(30, yOffset + 90, vW, 30, 8, ccCursor===1 ? 0xFFFF : 0x7BEF); // Thanh trượt
    tft.setTextColor(ccCursor===1 ? 0x0000 : 0xFFFF); tft.setTextFont(1); tft.setCursor(40, yOffset + 100); tft.print("VOLUME");
}

// ── MENU ──────────────────────────────────────────────────────
const MENU_ITEMS = [
    { name: "Music",    color: 0xF81F, icon: 0xFF00, app: 'cloudmusic' },
    { name: "WiFi",     color: 0x8410, icon: 0xFFFF, app: 'wifi' },
    { name: "Config",   color: 0x001F, icon: 0xF800, app: 'devconfig' },
    { name: "Snake",    color: 0x07FF, icon: 0x07E0, app: 'snake' },
    { name: "Dino",     color: 0xF800, icon: 0xFFE0, app: 'dino' },
    { name: "Contra",   color: 0xF800, icon: 0xFFFF, app: 'nes', rom: 'contra.nes', size: '128KB' },
    { name: "Space",    color: 0x7BEF, icon: 0x07FF, app: 'space' },
    { name: "Settings", color: 0x3186, icon: 0x8410, app: 'settings' },
    { name: "Mario 3",  color: 0xF800, icon: 0xFFE0, app: 'nes', rom: 'supermariobros3.nes', size: '256KB' },
    { name: "CastleV",  color: 0x8410, icon: 0xFFFF, app: 'nes', rom: 'castlevania.nes', size: '128KB' },
    { name: "Ninja G.", color: 0x001F, icon: 0xFFFF, app: 'nes', rom: 'ninjagaiden.nes', size: '256KB' },
    { name: "Excite",   color: 0xF81F, icon: 0xFFFF, app: 'nes', rom: 'excitebike.nes', size: '24KB' },
    { name: "Gradius",  color: 0x07E0, icon: 0xFFFF, app: 'nes', rom: 'gradius.nes', size: '64KB' }
];
let menuCursor = 0;

function launchMenu() { currentApp = 'menu'; drawMenu(); }
function drawMenu() {
    // Wallpaper Gradient đẹp hơn (tím-xanh)
    for (let y = 0; y < SCREEN_H; y++) {
        const t = y / SCREEN_H;
        tft.drawFastHLine(0, y, SCREEN_W, tft.color565(
            Math.floor(t * 30 + 10),
            Math.floor(t * 20 + 10),
            Math.floor(80 - t * 20)
        ));
    }

    // Tính max scroll (Menu dạng lưới 4 cột)
    const cols = 4;
    const rows = Math.ceil(MENU_ITEMS.length / cols);
    const maxScroll = Math.max(0, (rows - 2) * 85);

    // Mượt mà hóa (lerp) menu scroll
    menuScrollYTarget = Math.max(0, Math.min(maxScroll, menuScrollYTarget));
    menuScrollY += (menuScrollYTarget - menuScrollY) * 0.18;

    for (let i = 0; i < MENU_ITEMS.length; i++) {
        const item = MENU_ITEMS[i];
        
        // Tính toạ độ
        const c = i % cols;
        const r = Math.floor(i / cols);
        const cx = c * 75 + 47;
        const cy = r * 85 + 65 - menuScrollY;

        if (cy < -40 || cy > SCREEN_H + 40) continue;

        const selected = (i === menuCursor);

        // Selection outline (clean double border instead of grey box)
        if (selected) {
            tft.drawRoundRect(cx - 27, cy - 27, 54, 54, 15, 0xFFFF);
            tft.drawRoundRect(cx - 26, cy - 26, 52, 52, 14, 0xFFFF);
        }

        // Icon background
        tft.fillRoundRect(cx - 24, cy - 24, 48, 48, 13, item.color);

        // Vẽ icon
        drawAppIcon(item, cx, cy, item.color, item.icon);

        // Nhãn tên app
        tft.setTextFont(1);
        tft.setTextColor(selected ? 0xFFFF : 0xC618);
        const xOff = item.name.length * 4;
        tft.setCursor(cx - xOff, cy + 32);
        tft.print(item.name);
    }

    // Thanh cuộn phải
    if (rows > 2) {
        const scrollBarH = Math.floor((2 / rows) * (SCREEN_H - 40));
        const scrollBarY = 20 + Math.floor((menuScrollY / maxScroll) * (SCREEN_H - 40 - scrollBarH));
        tft.fillRect(SCREEN_W - 4, 20, 3, SCREEN_H - 40, 0x2945);
        tft.fillRoundRect(SCREEN_W - 4, scrollBarY, 3, scrollBarH, 1, 0x7BEF);
    }

    // Gợi ý Control Center
    const by = SCREEN_H - 16;
    tft.fillRect(0, by, SCREEN_W, 16, 0x0000);
    tft.setTextFont(1); tft.setTextColor(0x4228);
    tft.setCursor(5, by + 4);
    tft.print('Y+Down: Control Center');

    drawStatusBar();
}

function drawAppIcon(item, cx, cy, bgCol, fgCol) {
    const appId = item.app;

    if (appId === 'cloudmusic') {
        // Nốt nhạc kép có chùm nối
        tft.fillRect(cx - 9, cy - 15, 3, 16, fgCol);  // thân nốt 1
        tft.fillRect(cx + 4, cy - 12, 3, 15, fgCol);  // thân nốt 2
        tft.fillRect(cx - 9, cy - 15, 16, 4, fgCol);  // chùm ngang
        tft.fillCircle(cx - 12, cy + 2, 5, fgCol);    // đầu nốt 1
        tft.fillRect(cx - 16, cy, 8, 4, fgCol);
        tft.fillCircle(cx + 2, cy + 4, 5, fgCol);     // đầu nốt 2
        tft.fillRect(cx - 2, cy + 2, 8, 4, fgCol);

    } else if (appId === 'wifi') {
        // WiFi với 3 sóng cung tròn
        const wY = cy + 8;
        for (let r = 8; r <= 22; r += 7) {
            for (let a = 220; a <= 320; a += 1) {
                const rad = a * Math.PI / 180;
                const px = Math.round(cx + r * Math.cos(rad));
                const py = Math.round(wY + r * Math.sin(rad));
                tft.drawPixel(px, py, fgCol);
                tft.drawPixel(px, py - 1, fgCol);
                tft.drawPixel(px + 1, py, fgCol);
            }
        }
        // Chấm tròn trung tâm
        tft.fillCircle(cx, wY + 3, 3, fgCol);

    } else if (appId === 'devconfig') {
        // Bánh răng 8 răng chi tiết
        tft.fillCircle(cx, cy, 12, fgCol);
        tft.fillCircle(cx, cy, 6, bgCol);
        tft.fillCircle(cx, cy, 3, fgCol);             // chốt giữa
        for (let a = 0; a < 8; a++) {
            const ang = a * 45 * Math.PI / 180;
            const tx = Math.round(cx + 15 * Math.cos(ang));
            const ty = Math.round(cy + 15 * Math.sin(ang));
            tft.fillRect(tx - 2, ty - 2, 5, 5, fgCol);
        }

    } else if (appId === 'snake') {
        // Rắn cuộn hình S với đầu và mắt
        tft.fillRect(cx - 13, cy - 14, 26, 7, fgCol); // đoạn trên
        tft.fillRect(cx + 6,  cy - 7,  7, 14, fgCol); // cạnh phải xuống
        tft.fillRect(cx - 13, cy + 7,  26, 7, fgCol); // đoạn dưới
        tft.fillRect(cx - 13, cy - 7,  7, 14, fgCol); // cạnh trái (một phần)
        // Đầu
        tft.fillRect(cx - 15, cy - 16, 9, 9, fgCol);
        tft.fillRect(cx - 14, cy - 15, 3, 3, bgCol);  // mắt
        // Lưỡi
        tft.drawFastHLine(cx - 20, cy - 13, 5, 0xF800);
        tft.drawPixel(cx - 20, cy - 15, 0xF800);
        tft.drawPixel(cx - 20, cy - 11, 0xF800);

    } else if (appId === 'dino') {
        // T-Rex pixel art đầy đủ
        tft.fillRect(cx - 12, cy - 2,  14, 10, fgCol); // thân
        tft.fillRect(cx - 8,  cy - 14, 13, 13, fgCol); // đầu
        tft.fillRect(cx - 3,  cy - 12, 4,  4,  bgCol); // mắt
        tft.fillRect(cx + 1,  cy - 5,  7,  2,  bgCol); // miệng
        tft.fillRect(cx + 2,  cy,      10, 5,  fgCol); // đuôi
        tft.fillRect(cx + 10, cy + 5,  4,  4,  fgCol);
        tft.fillRect(cx - 10, cy + 8,  5,  9,  fgCol); // chân trước
        tft.fillRect(cx - 13, cy + 15, 7,  3,  fgCol); // bàn chân trước
        tft.fillRect(cx - 2,  cy + 8,  5,  7,  fgCol); // chân sau
        tft.fillRect(cx - 4,  cy - 2,  5,  3,  fgCol); // cánh tay nhỏ
        // Xương sườn
        for (let i = 0; i < 3; i++) {
            tft.drawFastHLine(cx - 10 + i, cy + i, 2, bgCol);
        }
        // Xương cột sống
        tft.drawFastVLine(cx, cy - 2, 12, 0x2945);

    } else if (appId === 'nes') {
        if (item.name === "Mario 3") {
            tft.fillCircle(cx, cy, 14, fgCol);
            tft.fillCircle(cx, cy, 10, bgCol);
            tft.fillRect(cx - 10, cy, 20, 10, bgCol);
            tft.fillRect(cx - 6, cy - 10, 4, 10, fgCol);
            tft.fillRect(cx + 2, cy - 10, 4, 10, fgCol);
            tft.fillRect(cx - 2, cy - 6, 4, 6, fgCol);
        } else if (item.name === "Contra") {
            tft.fillCircle(cx, cy, 14, fgCol);
            tft.fillCircle(cx, cy, 8, bgCol);
            tft.fillRect(cx + 2, cy - 14, 14, 28, bgCol); 
        } else if (item.name === "CastleV") {
            // Whip / Cross (More detailed)
            tft.fillRect(cx - 2, cy - 14, 4, 28, fgCol);
            tft.fillRect(cx - 10, cy - 4, 20, 4, fgCol);
            tft.fillCircle(cx, cy - 4, 4, 0xFFFF);
        } else if (item.name === "Ninja G.") {
            // Ninja star (Shuriken)
            tft.fillCircle(cx, cy, 12, fgCol);
            tft.fillCircle(cx, cy, 4, bgCol);
            tft.fillRect(cx - 14, cy - 2, 28, 4, bgCol);
            tft.fillRect(cx - 2, cy - 14, 4, 28, fgCol);
        } else if (item.name === "Excite") {
            // Bike
            tft.drawCircle(cx - 10, cy + 8, 6, fgCol);
            tft.drawCircle(cx + 10, cy + 8, 6, fgCol);
            tft.drawLine(cx - 10, cy + 8, cx, cy - 4, fgCol);
            tft.drawLine(cx + 10, cy + 8, cx, cy - 4, fgCol);
            tft.drawLine(cx - 12, cy, cx + 12, cy, fgCol);
        } else if (item.name === "Gradius") {
            // Ship (Better pixel art)
            tft.fillTriangle(cx + 12, cy, cx - 10, cy - 10, cx - 10, cy + 10, fgCol);
            tft.fillRect(cx - 14, cy - 4, 6, 8, fgCol);
            tft.fillCircle(cx + 2, cy, 3, 0x0000);
        } else {
            // Generic Tay cầm NES
            tft.fillRoundRect(cx - 18, cy - 11, 36, 22, 6, fgCol);
            tft.fillRect(cx - 15, cy - 3, 11, 5,  bgCol);
            tft.fillRect(cx - 11, cy - 7, 5,  13, bgCol);
            tft.fillCircle(cx + 10, cy - 3, 4, 0xF800);
            tft.fillCircle(cx + 15, cy + 4, 4, 0xFFE0);
            tft.fillRect(cx - 3,  cy + 6, 5, 2, bgCol);
            tft.fillRect(cx + 5,  cy + 6, 5, 2, bgCol);
        }

    } else if (appId === 'space') {
        // Tàu vũ trụ với cánh và lửa
        tft.fillRect(cx - 5, cy - 10, 10, 22, fgCol);     // thân tàu
        // Mũi tàu
        tft.fillRect(cx - 3, cy - 18, 6, 10, fgCol);
        tft.fillRect(cx - 1, cy - 22, 2, 6, fgCol);
        // Cánh trái/phải
        tft.fillRect(cx - 14, cy + 4,  9, 10, fgCol);
        tft.fillRect(cx + 5,  cy + 4,  9, 10, fgCol);
        // Cửa sổ buồng lái
        tft.fillCircle(cx, cy - 3, 4, bgCol);
        tft.fillCircle(cx, cy - 3, 2, 0x07FF);
        // Lửa phụt
        tft.fillRect(cx - 3, cy + 12, 6, 6,  0xF800);
        tft.fillRect(cx - 2, cy + 17, 4, 4,  0xFFE0);
        tft.fillRect(cx - 1, cy + 20, 2, 3,  0xFFFF);

    } else if (appId === 'settings') {
        // Bánh răng cài đặt
        tft.fillCircle(cx, cy, 12, fgCol);
        tft.fillCircle(cx, cy, 6,  bgCol);
        tft.fillCircle(cx, cy, 3,  fgCol);
        for (let a = 0; a < 8; a++) {
            const ang = (a * 45) * Math.PI / 180;
            const tx = Math.round(cx + 14 * Math.cos(ang));
            const ty = Math.round(cy + 14 * Math.sin(ang));
            tft.fillRect(tx - 2, ty - 2, 5, 5, fgCol);
        }
    }
}

// ── WIFI SETUP VỚI BÀN PHÍM ẢO ────────────────────────────────
let wifiState = 'list', wifiNetworks = ["Cafe_Fpt", "Home_5G", "Nguyen_Ngoc", "Quán_Trà_Đá"], wifiCursor = 0, wifiSelected = "", wifiPwd = "";
let kbLayout = [
    ['q','w','e','r','t','y','u','i','o','p'], ['a','s','d','f','g','h','j','k','l','!'],
    ['z','x','c','v','b','n','m','1','2','3'], ['4','5','6','7','8','9','0','@','#','$'],
    ['DEL', '', '', 'SPACE', '', '', 'CONNECT', '', '', '']
];
let kbX = 0, kbY = 0;

function launchWiFi() { currentApp = 'wifi'; wifiState = 'list'; wifiPwd = ""; drawWiFi(); }
function drawWiFi() {
    tft.fillScreen(0x0000); tft.fillRect(0, 16, SCREEN_W, 30, 0x0820); tft.drawFastHLine(0, 45, SCREEN_W, 0x07FF);
    tft.setTextColor(0x07FF); tft.setTextFont(2); tft.setCursor(5, 25);
    
    if (wifiState === 'list') {
        tft.print("WIFI SETUP - Scan");
        for (let i = 0; i < wifiNetworks.length; i++) {
            const y = 50 + i * 35; const sel = (i === wifiCursor);
            tft.fillRect(5, y, SCREEN_W - 10, 30, sel ? 0x1082 : 0x0820);
            if (sel) tft.drawRect(5, y, SCREEN_W - 10, 30, 0x07FF);
            tft.setTextColor(sel ? 0x07FF : 0xFFFF); tft.setTextFont(2); tft.setCursor(15, y + 8); tft.print(wifiNetworks[i]);
            tft.fillCircle(SCREEN_W - 20, y + 15, 5, 0x07E0);
        }
    } else if (wifiState === 'keyboard') {
        tft.print("ENTER PASSWORD"); tft.setTextColor(0x7BEF); tft.setCursor(10, 55); tft.print("SSID: " + wifiSelected);
        tft.fillRect(10, 75, 220, 30, 0x18E3); tft.drawRect(10, 75, 220, 30, 0x07FF);
        tft.setTextColor(0xFFFF); tft.setTextFont(4); tft.setCursor(15, 80);
        let masked = ""; for(let i=0; i<wifiPwd.length; i++) masked+="*";
        tft.print(masked + "_");
        
        const startY = 125; tft.setTextFont(2);
        for(let r=0; r<5; r++) {
            for(let c=0; c<10; c++) {
                if (kbLayout[r][c] === '') continue;
                let w = 22, h = 26, x = 10 + c*22;
                if (r===4) {
                    if (c===0) w = 66; // DEL
                    else if (c===3) { x = 76; w = 66; } // SPACE
                    else if (c===6) { x = 142; w = 88; } // CONNECT
                }
                const sel = (kbY===r && kbX===c);
                tft.fillRect(x, startY + r*30, w-2, h-2, sel ? 0x07E0 : 0x2945);
                tft.setTextColor(sel ? 0x0000 : 0xFFFF); tft.setCursor(x + 5, startY + r*30 + 5); tft.print(kbLayout[r][c]);
            }
        }
    } else if (wifiState === 'connecting') {
        tft.print("CONNECTING..."); tft.setTextColor(0xFFFF); tft.setTextFont(2);
        tft.setCursor(30, 150); tft.print("Joining: " + wifiSelected); tft.setCursor(60, 180); tft.print("Please wait...");
    }
    drawStatusBar();
}

// ── CLOUD MUSIC PLAYER ────────────────────────────────────────
let cloudAudioObj = new Audio();
cloudAudioObj.crossOrigin = "anonymous";
let cloudMusicIndex = 0;
let cloudMusicPlaying = false;
let cloudTracks = [
    { name: "Test Song (MP3)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }, 
    { name: "Lofi Rain", url: "https://actions.google.com/sounds/v1/water/rain_on_roof.ogg" },
    { name: "8-Bit Bugle", url: "https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg" }
];

function launchCloudMusic() { currentApp = 'cloudmusic'; drawCloudMusicUI(); }
function drawCloudMusicUI() {
    tft.fillScreen(0x1082); tft.fillRect(0, 16, SCREEN_W, 30, 0x0820);
    tft.setTextColor(0x07FF); tft.setTextFont(4); tft.setCursor(5, 20); tft.print("CLOUD MUSIC");
    tft.drawFastHLine(0, 45, SCREEN_W, 0x07FF);
    
    const track = cloudTracks[cloudMusicIndex];
    tft.fillRect(40, 60, 160, 120, 0x2945); tft.drawRect(40, 60, 160, 120, 0x07FF);
    tft.fillCircle(120, 120, 40, 0x1082); tft.fillCircle(120, 120, 10, 0x07E0); // Vinyl mock
    
    tft.fillRect(0, 190, SCREEN_W, 130, 0x1082);
    tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(20, 200); tft.print(track.name);
    tft.setTextColor(0x7BEF); tft.setTextFont(2); tft.setCursor(20, 225); tft.print("Streaming via Cloudflare");
    
    tft.setTextColor(0x07E0); tft.setTextFont(2); tft.setCursor(20, 260); tft.print("[<-] Prev   [->] Next");
    tft.setTextColor(cloudMusicPlaying ? 0xF800 : 0x07FF); tft.setCursor(20, 280); tft.print("[A] " + (cloudMusicPlaying ? "Pause" : "Play") + "   [B] Exit");
    
    drawStatusBar();
}
function toggleCloudMusic() {
    if (cloudMusicPlaying) { cloudAudioObj.pause(); cloudMusicPlaying = false; }
    else { 
        cloudAudioObj.src = cloudTracks[cloudMusicIndex].url; 
        cloudAudioObj.volume = sysVolume / 100;
        cloudAudioObj.play().catch(e=>console.log(e)); cloudMusicPlaying = true; 
    }
    drawCloudMusicUI();
}

// ── DEV CONFIG ────────────────────────────────────────────────
let devState = 'list', devDevices = [
    { id: "may-ap-trung-001", name: "Máy Ấp Trứng #1", config: { temp_target: 37.5, humidity_target: 65, turn_hours: 8 } }
];
let devCursor = 0, devSelectedDevice = null, devConfigKeys = [], devConfigCursor = 0, devEditValue = 0, devEditKey = "";

function launchDevConfig() { currentApp = 'devconfig'; devState = 'list'; devCursor = 0; drawDevConfig(); }
function drawDevConfig() {
    tft.fillScreen(0x0000); tft.fillRect(0, 16, SCREEN_W, 30, 0x0820); tft.drawFastHLine(0, 45, SCREEN_W, 0x07FF);
    if (devState === 'list') {
        tft.setTextColor(0x07FF); tft.setTextFont(2); tft.setCursor(5, 25); tft.print("DEV CONFIG - Devices");
        for (let i = 0; i < devDevices.length; i++) {
            const y = 50 + i * 40; const sel = (i === devCursor);
            tft.fillRect(5, y, SCREEN_W - 10, 36, sel ? 0x1082 : 0x0820);
            if (sel) tft.drawRect(5, y, SCREEN_W - 10, 36, 0x07FF);
            tft.setTextColor(sel ? 0x07FF : 0xFFFF); tft.setTextFont(2); tft.setCursor(15, y + 10); tft.print(devDevices[i].name);
        }
    } else if (devState === 'detail') {
        tft.setTextColor(0x07FF); tft.setTextFont(2); tft.setCursor(5, 25); tft.print("CONFIG: " + devSelectedDevice.name);
        devConfigKeys = Object.keys(devSelectedDevice.config);
        for (let i = 0; i < devConfigKeys.length; i++) {
            const y = 55 + i * 35; const sel = (i === devConfigCursor);
            tft.fillRect(5, y, SCREEN_W - 10, 30, sel ? 0x1082 : 0x0820);
            if (sel) tft.drawRect(5, y, SCREEN_W - 10, 30, 0x07E0);
            tft.setTextColor(sel ? 0x07E0 : 0xFFFF); tft.setTextFont(1); tft.setCursor(10, y + 10); tft.print(devConfigKeys[i] + ": " + devSelectedDevice.config[devConfigKeys[i]]);
        }
    } else if (devState === 'edit') {
        tft.setTextColor(0x07FF); tft.setTextFont(2); tft.setCursor(5, 25); tft.print("EDIT VALUE");
        tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(20, 100); tft.print(devEditKey);
        tft.setTextColor(0x07E0); tft.setTextFont(4); tft.setCursor(50, 140); tft.print("< " + devEditValue.toFixed(1) + " >");
        tft.setTextColor(0x7BEF); tft.setTextFont(1); tft.setCursor(30, 200); tft.print("[UP/DN] Change   [A] Save  [B] Cancel");
    }
    drawStatusBar();
}

// ── GAMES & SETTINGS (Mô phỏng tĩnh để tiết kiệm code) ──────
function launchSnake() { currentApp = 'snake'; tft.fillScreen(0x0841); tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(20, 150); tft.print("Snake Game Running..."); drawStatusBar(); }
function launchDino() { currentApp = 'dino'; tft.fillScreen(0x0010); tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(20, 150); tft.print("Dino Game Running..."); drawStatusBar(); }
function launchFlappy() { currentApp = 'flappy'; tft.fillScreen(0x0410); tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(20, 150); tft.print("Flappy Bird Running..."); drawStatusBar(); }
function launchSpace() { currentApp = 'space'; tft.fillScreen(0x0000); tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(20, 150); tft.print("Space Shooter Running..."); drawStatusBar(); }
function launchSettings() { currentApp = 'settings'; tft.fillScreen(0x0000); tft.setTextColor(0xFFFF); tft.setTextFont(2); tft.setCursor(20, 150); tft.print("Settings UI..."); drawStatusBar(); }

// ── CLOUD GAMING (JSNES) ────────────────────────────────────────
let nes = null;
let nesCanvas = document.createElement('canvas'); nesCanvas.width = 256; nesCanvas.height = 240;
let nesCtx = nesCanvas.getContext('2d');
let nesImageData = nesCtx.createImageData(256, 240);
let nesDownloading = false, nesDownloadProgress = 0, nesPlaying = false;
const ROM_URL = "contra.nes"; // Local downloaded ROM

let nesAudioCtx = null, nesScriptProcessor = null, nesAudioBuffer = [];
function initNESAudio() {
    if (nesAudioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    nesAudioCtx = new AudioContext({sampleRate: 44100});
    // Create empty buffer to unlock iOS/Chrome audio
    let src = nesAudioCtx.createBufferSource();
    src.buffer = nesAudioCtx.createBuffer(1, 1, 44100);
    src.connect(nesAudioCtx.destination); src.start();
    
    nesScriptProcessor = nesAudioCtx.createScriptProcessor(2048, 0, 2);
    nesScriptProcessor.onaudioprocess = function(e) {
        let left = e.outputBuffer.getChannelData(0), right = e.outputBuffer.getChannelData(1);
        let len = left.length;
        if (nesAudioBuffer.length >= len * 2) {
            let vol = sysVolume / 100.0;
            for (let i = 0; i < len; i++) {
                left[i] = nesAudioBuffer[i*2] * vol; 
                right[i] = nesAudioBuffer[i*2+1] * vol;
            }
            nesAudioBuffer.splice(0, len * 2);
            // Giữ cho buffer không quá đầy (gây delay/lag)
            if (nesAudioBuffer.length > len * 4) {
                nesAudioBuffer.splice(0, nesAudioBuffer.length - len * 4);
            }
        } else {
            for (let i = 0; i < len; i++) { left[i] = 0; right[i] = 0; }
        }
    };
    nesScriptProcessor.connect(nesAudioCtx.destination);
}

// Unlock Audio via Overlay
document.getElementById('audio-overlay').addEventListener('click', function() {
    this.style.display = 'none';
    // Khởi tạo AudioContext rỗng để qua mặt trình duyệt
    initNESAudio();
    if(nesAudioCtx && nesAudioCtx.state === 'suspended') nesAudioCtx.resume();
    
    // Unlock cloud music audio
    cloudAudioObj.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    cloudAudioObj.play().catch(e=>{});
});

let nesROMFile = "", nesROMSize = "";

function launchNES(romFile, sizeStr) {
    currentApp = 'nes'; nesDownloading = true; nesPlaying = false; nesDownloadProgress = 0;
    nesROMFile = romFile; nesROMSize = sizeStr;
    
    let dlInterval = setInterval(() => {
        nesDownloadProgress += 20; if (nesDownloadProgress > 100) nesDownloadProgress = 100;
        tft.fillScreen(0x0000);
        tft.setTextColor(0x07FF); tft.setTextFont(2); tft.setCursor(40, 100); tft.print("CLOUD GAMING");
        tft.setTextColor(0xFFFF); tft.setTextFont(1); tft.setCursor(20, 140); tft.print("Downloading ROM (" + nesROMSize + ")...");
        tft.drawRect(20, 170, 200, 15, 0xFFFF); tft.fillRect(22, 172, (nesDownloadProgress/100)*196, 11, 0x07E0);
        drawStatusBar();
        
        if (nesDownloadProgress === 100) {
            clearInterval(dlInterval);
            fetch(nesROMFile).then(res => {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.arrayBuffer();
            }).then(buffer => {
                try {
                    nes = new jsnes.NES({
                        onFrame: function(buf) {
                            for(var i=0; i<256*240; i++) {
                                nesImageData.data[i*4] = buf[i] & 0xFF; nesImageData.data[i*4+1] = (buf[i] >> 8) & 0xFF;
                                nesImageData.data[i*4+2] = (buf[i] >> 16) & 0xFF; nesImageData.data[i*4+3] = 0xFF;
                            }
                        },
                        onAudioSample: function(l, r) {
                            if (nesAudioBuffer.length < 4096 * 4) nesAudioBuffer.push(l, r);
                        }
                    });
                    initNESAudio();
                    let str = ''; let bytes = new Uint8Array(buffer);
                    for(let i=0; i<bytes.length; i++) str += String.fromCharCode(bytes[i]);
                    nes.loadROM(str); nesDownloading = false; nesPlaying = true;
                } catch(e) {
                    tft.fillScreen(0x0000); tft.setCursor(10, 100); tft.setTextColor(0xF800); tft.print("ROM DECODE ERROR");
                    tft.setCursor(10, 120); tft.print(e.message); drawStatusBar();
                }
            }).catch(err => {
                tft.fillScreen(0x0000); tft.setCursor(10, 100); tft.setTextColor(0xF800); tft.print("FETCH ROM ERROR");
                tft.setCursor(10, 120); tft.print("ROM file not found:");
                tft.setCursor(10, 140); tft.print(nesROMFile); drawStatusBar();
            });
        }
    }, 200);
}

function runContraFrame() {
    if (!nesPlaying || !nes) return;
    const btnA = hw.buttons.A, btnB = hw.buttons.B, btnStart = hw.buttons.START, btnSelect = hw.buttons.SELECT;
    const btnUp = hw.buttons.UP || hw.joystick.y < 1748, btnDown = hw.buttons.DOWN || hw.joystick.y > 2348;
    const btnLeft = hw.buttons.LEFT || hw.joystick.x < 1748, btnRight = hw.buttons.RIGHT || hw.joystick.x > 2348;
    
    if (btnA) nes.buttonDown(1, jsnes.Controller.BUTTON_A); else nes.buttonUp(1, jsnes.Controller.BUTTON_A);
    if (btnB) nes.buttonDown(1, jsnes.Controller.BUTTON_B); else nes.buttonUp(1, jsnes.Controller.BUTTON_B);
    if (btnStart) nes.buttonDown(1, jsnes.Controller.BUTTON_START); else nes.buttonUp(1, jsnes.Controller.BUTTON_START);
    if (btnSelect) nes.buttonDown(1, jsnes.Controller.BUTTON_SELECT); else nes.buttonUp(1, jsnes.Controller.BUTTON_SELECT);
    if (btnUp) nes.buttonDown(1, jsnes.Controller.BUTTON_UP); else nes.buttonUp(1, jsnes.Controller.BUTTON_UP);
    if (btnDown) nes.buttonDown(1, jsnes.Controller.BUTTON_DOWN); else nes.buttonUp(1, jsnes.Controller.BUTTON_DOWN);
    if (btnLeft) nes.buttonDown(1, jsnes.Controller.BUTTON_LEFT); else nes.buttonUp(1, jsnes.Controller.BUTTON_LEFT);
    if (btnRight) nes.buttonDown(1, jsnes.Controller.BUTTON_RIGHT); else nes.buttonUp(1, jsnes.Controller.BUTTON_RIGHT);
    
    nes.frame(); nesCtx.putImageData(nesImageData, 0, 0);
    const mainCtx = document.getElementById('tft-screen').getContext('2d');
    mainCtx.drawImage(nesCanvas, 32, 0); 
    if (hw.buttons.HOME) { nesPlaying = false; launchMenu(); } // Thoát
}

function millis() { return performance.now(); }

// Hiệu ứng zoom transition khi mở app
function zoomTransition(fromX, fromY, color, callback) {
    if (transitionActive) return;
    transitionActive = true;
    let r = 4;
    const target = Math.max(SCREEN_W, SCREEN_H) * 1.2;
    function step() {
        tft.fillCircle(fromX, fromY, Math.floor(r), color);
        r *= 1.45;
        if (r < target) {
            setTimeout(step, 14);
        } else {
            transitionActive = false;
            callback();
        }
    }
    step();
}

let abHoldStart = 0;

function loop() {
    if (currentApp === null) return;
    const btnA = hw.buttons.A, btnB = hw.buttons.B, btnStart = hw.buttons.START, btnX = hw.buttons.X, btnY = hw.buttons.Y;
    const btnHome = hw.buttons.HOME, btnPower = hw.buttons.POWER;
    const btnUp = hw.buttons.UP || hw.joystick.y < 1748, btnDown = hw.buttons.DOWN || hw.joystick.y > 2348;
    const btnLeft = hw.buttons.LEFT || hw.joystick.x < 1748, btnRight = hw.buttons.RIGHT || hw.joystick.x > 2348;
    const jPressed = (k, prev) => k && !prev;

    // --- GLOBAL SYSTEM BUTTONS ---
    if (jPressed(btnHome, prevBtnHome)) {
        if (nesPlaying) nesPlaying = false;
        if (currentApp !== 'lockscreen' && currentApp !== 'menu') {
            launchMenu();
            return; // Skip rest of frame
        }
    }
    if (jPressed(btnPower, prevBtnPower)) {
        if (currentApp !== 'lockscreen') {
            if (nesPlaying) nesPlaying = false;
            currentApp = 'lockscreen';
            drawLockscreen();
            return;
        }
    }

    // Hard Reset System by holding A + B for 5 seconds
    if (btnA && btnB) {
        if (abHoldStart === 0) abHoldStart = millis();
        else if (millis() - abHoldStart > 5000) {
            abHoldStart = 0;
            tone(1000, 500); // Tiếng bíp dài báo hiệu reset
            if (nesPlaying) { nesPlaying = false; }
            if (cloudMusicPlaying) { cloudAudioObj.pause(); cloudMusicPlaying = false; }
            tft.fillScreen(0x0000);
            tft.setTextColor(0xF800); tft.setTextFont(2); tft.setCursor(40, 150); tft.print("SYSTEM RESET...");
            setTimeout(() => { currentApp = 'lockscreen'; drawLockscreen(); }, 1000);
            return;
        }
    } else {
        abHoldStart = 0;
    }

    // Control Center Drag-Down Logic (Giữ Y và kéo Joystick xuống)
    if (btnY && !ccOpen && btnDown) {
        ccTargetY = 20; ccOpen = true; tone(600, 50);
    }
    
    // Nút B để đóng nhanh Control Center
    if (ccOpen && !btnY && jPressed(btnB, prevBtnB)) {
        ccTargetY = -150; ccOpen = false; tone(400, 30);
    }

    let isAnimatingCC = Math.abs(ccY - ccTargetY) > 1;
    if (isAnimatingCC) ccY += (ccTargetY - ccY) * 0.4;

    // Lerp menu scroll
    if (Math.abs(menuScrollY - menuScrollYTarget) > 0.5) {
        menuScrollY += (menuScrollYTarget - menuScrollY) * 0.18;
    } else {
        menuScrollY = menuScrollYTarget;
    }
    
    let interactingWithCC = ccOpen || isAnimatingCC || btnY;

    if (interactingWithCC) {
        // Handle input if CC is open and Y is not held
        if (ccOpen && !btnY) {
            let interacted = false;
            if (jPressed(btnUp, prevBtnUp)) { ccCursor = 0; tone(400,20); interacted = true; }
            if (jPressed(btnDown, prevBtnDown)) { ccCursor = 1; tone(400,20); interacted = true; }
            if (btnLeft) { if (ccCursor===0 && sysBrightness > 0) sysBrightness-=2; if (ccCursor===1 && sysVolume > 0) sysVolume-=2; interacted = true; }
            if (btnRight) { if (ccCursor===0 && sysBrightness < 100) sysBrightness+=2; if (ccCursor===1 && sysVolume < 100) sysVolume+=2; interacted = true; }
            if (currentApp==='cloudmusic') cloudAudioObj.volume = sysVolume/100;
            
            if (interacted) ccLastInteractionTime = millis();
            
            // Auto close after 3 seconds of inactivity
            if (millis() - ccLastInteractionTime > 3000 && !isAnimatingCC) {
                ccTargetY = -150; ccOpen = false; tone(400,30);
            }
        } else if (btnY) {
            ccLastInteractionTime = millis();
        }
        
        // Redraw base UI then CC overlay on top
        if (isAnimatingCC || btnLeft || btnRight || jPressed(btnUp, prevBtnUp) || jPressed(btnDown, prevBtnDown) || btnY || jPressed(btnB, prevBtnB)) {
            if (currentApp==='menu') drawMenu(); else if (currentApp==='wifi') drawWiFi(); 
            else if (currentApp==='cloudmusic') drawCloudMusicUI(); else if (currentApp==='devconfig') drawDevConfig();
            else if (currentApp==='lockscreen') drawLockscreen();
            
            if (ccY > -140) drawControlCenter(ccY);
        }
        
        prevBtnA=btnA; prevBtnB=btnB; prevBtnStart=btnStart; prevBtnUp=btnUp; prevBtnDown=btnDown; prevBtnLeft=btnLeft; prevBtnRight=btnRight;
        return; // Block background app processing
    }

    // App Logic
    if (currentApp === 'lockscreen') {
        if (jPressed(btnStart, prevBtnStart) || jPressed(btnA, prevBtnA)) { tone(880,50); launchMenu(); }
        else drawLockscreen(); 
    }
    else if (currentApp === 'menu') {
        // Cập nhật phím di chuyển cho menu 4 cột
        const cols = 4;
        if (hw.buttons.LEFT && !prevBtnLeft) { menuCursor = (menuCursor - 1 + MENU_ITEMS.length) % MENU_ITEMS.length; }
        if (hw.buttons.RIGHT && !prevBtnRight) { menuCursor = (menuCursor + 1) % MENU_ITEMS.length; }
        if (hw.buttons.UP && !prevBtnUp) { menuCursor = (menuCursor - cols + MENU_ITEMS.length) % MENU_ITEMS.length; }
        if (hw.buttons.DOWN && !prevBtnDown) { menuCursor = (menuCursor + cols) % MENU_ITEMS.length; }
        if (jPressed(btnA, prevBtnA) || jPressed(btnStart, prevBtnStart)) {
            tone(880, 80);
            const item = MENU_ITEMS[menuCursor];
            const c = menuCursor % cols;
            const r = Math.floor(menuCursor / cols);
            const iconX = c * 75 + 47;
            const iconY = r * 85 + 65 - Math.floor(menuScrollY);
            zoomTransition(iconX, iconY, item.color, () => {
                const app = item.app;
                if (app==='cloudmusic') launchCloudMusic();
                else if (app==='wifi') launchWiFi();
                else if (app==='devconfig') launchDevConfig();
                else if (app==='nes') launchNES(item.rom, item.size);
                else if (app==='snake') launchSnake();
                else if (app==='dino') launchDino();
                else if (app==='space') launchSpace();
                else if (app==='settings') launchSettings();
            });
        }
    } 
    else if (currentApp === 'wifi') {
        if (wifiState === 'list') {
            if (jPressed(btnUp, prevBtnUp) && wifiCursor > 0) { wifiCursor--; tone(440,30); drawWiFi(); }
            if (jPressed(btnDown, prevBtnDown) && wifiCursor < wifiNetworks.length-1) { wifiCursor++; tone(440,30); drawWiFi(); }
            if (jPressed(btnA, prevBtnA)) { wifiSelected = wifiNetworks[wifiCursor]; wifiState = 'keyboard'; kbX=0; kbY=0; tone(880,50); drawWiFi(); }
            if (jPressed(btnB, prevBtnB)) launchMenu();
        } else if (wifiState === 'keyboard') {
            if (jPressed(btnUp, prevBtnUp)) { kbY = (kbY - 1 + 5) % 5; tone(440,20); drawWiFi(); }
            if (jPressed(btnDown, prevBtnDown)) { kbY = (kbY + 1) % 5; tone(440,20); drawWiFi(); }
            if (jPressed(btnLeft, prevBtnLeft)) { kbX = (kbX - 1 + 10) % 10; while(kbLayout[kbY][kbX]==='') kbX=(kbX-1+10)%10; tone(440,20); drawWiFi(); }
            if (jPressed(btnRight, prevBtnRight)) { kbX = (kbX + 1) % 10; while(kbLayout[kbY][kbX]==='') kbX=(kbX+1)%10; tone(440,20); drawWiFi(); }
            if (jPressed(btnA, prevBtnA)) {
                let key = kbLayout[kbY][kbX];
                if (key === 'DEL') wifiPwd = wifiPwd.slice(0, -1);
                else if (key === 'SPACE') wifiPwd += " ";
                else if (key === 'CONNECT') { 
                    wifiState = 'connecting'; drawWiFi(); 
                    setTimeout(() => { isWifiConnected = true; launchMenu(); }, 2000); 
                }
                else wifiPwd += key;
                tone(600,20); drawWiFi();
            }
            if (jPressed(btnB, prevBtnB)) { wifiState = 'list'; drawWiFi(); }
        }
    }
    else if (currentApp === 'cloudmusic') {
        if (jPressed(btnLeft, prevBtnLeft)) { cloudMusicIndex = (cloudMusicIndex - 1 + cloudTracks.length) % cloudTracks.length; if(cloudMusicPlaying) toggleCloudMusic(); drawCloudMusicUI(); tone(440,30); }
        if (jPressed(btnRight, prevBtnRight)) { cloudMusicIndex = (cloudMusicIndex + 1) % cloudTracks.length; if(cloudMusicPlaying) toggleCloudMusic(); drawCloudMusicUI(); tone(440,30); }
        if (jPressed(btnA, prevBtnA)) { toggleCloudMusic(); tone(880,50); }
        if (jPressed(btnB, prevBtnB)) { if (cloudMusicPlaying) toggleCloudMusic(); launchMenu(); }
    }
    else if (currentApp === 'devconfig') {
        if (devState === 'list') {
            if (jPressed(btnUp, prevBtnUp) && devCursor > 0) { devCursor--; tone(440,30); drawDevConfig(); }
            if (jPressed(btnDown, prevBtnDown) && devCursor < devDevices.length-1) { devCursor++; tone(440,30); drawDevConfig(); }
            if (jPressed(btnA, prevBtnA)) { devSelectedDevice = devDevices[devCursor]; devState = 'detail'; devConfigCursor = 0; tone(880,50); drawDevConfig(); }
            if (jPressed(btnB, prevBtnB)) launchMenu();
        } else if (devState === 'detail') {
            if (jPressed(btnUp, prevBtnUp) && devConfigCursor > 0) { devConfigCursor--; tone(440,30); drawDevConfig(); }
            if (jPressed(btnDown, prevBtnDown) && devConfigCursor < devConfigKeys.length-1) { devConfigCursor++; tone(440,30); drawDevConfig(); }
            if (jPressed(btnA, prevBtnA)) { devEditKey = devConfigKeys[devConfigCursor]; devEditValue = devSelectedDevice.config[devEditKey]; devState = 'edit'; tone(880,50); drawDevConfig(); }
            if (jPressed(btnB, prevBtnB)) { devState = 'list'; drawDevConfig(); }
        } else if (devState === 'edit') {
            if (jPressed(btnUp, prevBtnUp)) { devEditValue += 0.5; tone(600,20); drawDevConfig(); }
            if (jPressed(btnDown, prevBtnDown)) { devEditValue -= 0.5; tone(400,20); drawDevConfig(); }
            if (jPressed(btnA, prevBtnA)) { devSelectedDevice.config[devEditKey] = devEditValue; devState = 'detail'; tone(880,50); drawDevConfig(); }
            if (jPressed(btnB, prevBtnB)) { devState = 'detail'; drawDevConfig(); }
        }
    }
    else if (currentApp === 'nes') {
        runContraFrame();
    }
    else if (['snake','dino','space','settings'].includes(currentApp)) {
        if (jPressed(btnB, prevBtnB)) launchMenu();
    }

    prevBtnA=btnA; prevBtnB=btnB; prevBtnStart=btnStart; prevBtnUp=btnUp; prevBtnDown=btnDown; prevBtnLeft=btnLeft; prevBtnRight=btnRight; prevBtnHome=btnHome; prevBtnPower=btnPower;
}

showSplash();
setInterval(loop, 1000/30);
