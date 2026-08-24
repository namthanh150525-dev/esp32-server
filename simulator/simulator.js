// ESP32 Simulator Core

class VirtualHardware {
    constructor() {
        this.buttons = {
            A: false, B: false, X: false, Y: false,
            UP: false, DOWN: false, LEFT: false, RIGHT: false,
            START: false, SELECT: false
        };
        this.joystick = {
            x: 2048, // 0 - 4095
            y: 2048
        };
        
        this.initInputHandlers();
    }

    initInputHandlers() {
        // Keyboard mapping
        const keyMap = {
            'w': 'UP', 's': 'DOWN', 'a': 'LEFT', 'd': 'RIGHT',
            'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
            'j': 'A', 'k': 'B', 'u': 'X', 'i': 'Y',
            'Enter': 'START', 'Shift': 'SELECT', 'c': 'SELECT'
        };

        window.addEventListener('keydown', (e) => {
            if(keyMap[e.key]) {
                this.buttons[keyMap[e.key]] = true;
                this.updateUIBtnState(keyMap[e.key], true);
            }
        });

        window.addEventListener('keyup', (e) => {
            if(keyMap[e.key]) {
                this.buttons[keyMap[e.key]] = false;
                this.updateUIBtnState(keyMap[e.key], false);
            }
        });

        // Mouse mapping for D-Pad and Action buttons
        document.querySelectorAll('[data-btn]').forEach(el => {
            const btn = el.getAttribute('data-btn');
            
            const press = (e) => {
                if (e.cancelable) e.preventDefault();
                this.buttons[btn] = true;
                el.classList.add('active');
            };
            
            const release = (e) => {
                if (e.cancelable) e.preventDefault();
                this.buttons[btn] = false;
                el.classList.remove('active');
            };

            el.addEventListener('mousedown', press);
            el.addEventListener('touchstart', press, {passive: false});
            
            el.addEventListener('mouseup', release);
            el.addEventListener('mouseleave', release);
            el.addEventListener('touchend', release);
        });

        // Analog Joystick dragging logic
        const joyContainer = document.getElementById('analog-stick');
        const joyThumb = joyContainer.querySelector('.analog-thumb');
        
        let isDragging = false;
        let joyRect = joyContainer.getBoundingClientRect();
        
        window.addEventListener('resize', () => {
            joyRect = joyContainer.getBoundingClientRect();
        });

        const updateJoystick = (clientX, clientY) => {
            const centerX = joyRect.left + joyRect.width / 2;
            const centerY = joyRect.top + joyRect.height / 2;
            
            let dx = clientX - centerX;
            let dy = clientY - centerY;
            
            const maxRadius = joyRect.width / 2;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > maxRadius) {
                dx = (dx / dist) * maxRadius;
                dy = (dy / dist) * maxRadius;
            }
            
            joyThumb.style.transform = `translate(${dx}px, ${dy}px)`;
            
            // Map -maxRadius...maxRadius to 0...4095
            this.joystick.x = Math.floor(2048 + (dx / maxRadius) * 2047);
            this.joystick.y = Math.floor(2048 + (dy / maxRadius) * 2047);
        };
        
        const resetJoystick = () => {
            joyThumb.style.transform = `translate(0px, 0px)`;
            this.joystick.x = 2048;
            this.joystick.y = 2048;
            joyThumb.style.transition = 'transform 0.1s';
        };

        joyContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            joyThumb.style.transition = 'none';
            updateJoystick(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            updateJoystick(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            if(isDragging) {
                isDragging = false;
                resetJoystick();
            }
        });
        
        joyContainer.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
            isDragging = true;
            joyThumb.style.transition = 'none';
            updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive: false});
        
        window.addEventListener('touchmove', (e) => {
            if(!isDragging) return;
            updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
        });
        
        window.addEventListener('touchend', () => {
            if(isDragging) {
                isDragging = false;
                resetJoystick();
            }
        });
    }

    updateUIBtnState(btnName, isPressed) {
        const el = document.querySelector(`[data-btn="${btnName}"]`);
        if (el) {
            if (isPressed) el.classList.add('active');
            else el.classList.remove('active');
        }
    }

    updateStatusPanel() {
        document.getElementById('joy-x-val').innerText = this.joystick.x;
        document.getElementById('joy-y-val').innerText = this.joystick.y;
        
        const active = Object.keys(this.buttons).filter(k => this.buttons[k]);
        document.getElementById('active-btns-val').innerText = active.length > 0 ? active.join(', ') : 'None';
    }
}

// Emulate TFT_eSPI/Adafruit_GFX
class VirtualTFT {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.cursorX = 0;
        this.cursorY = 0;
        this.textColor = '#FFFFFF';
        this.textBg = null;
        this.textSize = 1; 
        
        this.ctx.imageSmoothingEnabled = false;
    }
    
    parseColor(color) {
        if (typeof color === 'string') return color;
        // RGB565 to RGB888
        let r = (color & 0xF800) >> 11;
        let g = (color & 0x07E0) >> 5;
        let b = color & 0x001F;
        
        r = Math.floor((r * 255) / 31);
        g = Math.floor((g * 255) / 63);
        b = Math.floor((b * 255) / 31);
        
        return `rgb(${r},${g},${b})`;
    }

    fillScreen(color) {
        this.ctx.fillStyle = this.parseColor(color);
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawPixel(x, y, color) {
        this.ctx.fillStyle = this.parseColor(color);
        this.ctx.fillRect(x, y, 1, 1);
    }

    drawRect(x, y, w, h, color) {
        this.ctx.strokeStyle = this.parseColor(color);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x+0.5, y+0.5, w-1, h-1); 
    }

    fillRect(x, y, w, h, color) {
        this.ctx.fillStyle = this.parseColor(color);
        this.ctx.fillRect(x, y, w, h);
    }
    
    drawCircle(x, y, r, color) {
        this.ctx.strokeStyle = this.parseColor(color);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    fillCircle(x, y, r, color) {
        this.ctx.fillStyle = this.parseColor(color);
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLine(x0, y0, x1, y1, color) {
        this.ctx.strokeStyle = this.parseColor(color);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x0 + 0.5, y0 + 0.5);
        this.ctx.lineTo(x1 + 0.5, y1 + 0.5);
        this.ctx.stroke();
    }

    setTextColor(color, bg = null) {
        this.textColor = this.parseColor(color);
        if (bg !== null) this.textBg = this.parseColor(bg);
        else this.textBg = null;
    }

    setTextSize(size) {
        this.textSize = size;
    }

    setCursor(x, y) {
        this.cursorX = x;
        this.cursorY = y;
    }

    print(text) {
        const fontSize = this.textSize * 8;
        const fontMap = { 1: 8, 2: 12, 4: 16, 7: 32 };
        const actualSize = fontMap[this._textFont || this.textSize] || (this.textSize * 8);
        this.ctx.font = `bold ${actualSize}px monospace`;
        this.ctx.textBaseline = 'top';
        
        if (this.textBg) {
            const metrics = this.ctx.measureText(String(text));
            this.ctx.fillStyle = this.textBg;
            this.ctx.fillRect(this.cursorX, this.cursorY, metrics.width, actualSize);
        }
        
        this.ctx.fillStyle = this.textColor;
        this.ctx.fillText(String(text), this.cursorX, this.cursorY);
        this.cursorX += this.ctx.measureText(String(text)).width;
    }

    println(text) {
        this.print(text);
        this.cursorY += (this._textFont ? { 1:8,2:12,4:16,7:32 }[this._textFont] || 10 : this.textSize * 8);
        this.cursorX = 0;
    }

    // Simulated printf: replace %d, %s, %f etc
    printf(fmt, ...args) {
        let i = 0;
        const str = fmt.replace(/%[disfcu%]/g, m => {
            if (m === '%%') return '%';
            const v = args[i++];
            if (m === '%d' || m === '%i' || m === '%u' || m === '%c') return Math.floor(Number(v));
            if (m === '%f') return parseFloat(v).toFixed(2);
            return String(v);
        });
        this.print(str);
    }

    setTextFont(font) {
        this._textFont = font;
    }

    drawFastHLine(x, y, w, color) {
        this.ctx.fillStyle = this.parseColor(color);
        this.ctx.fillRect(x, y, w, 1);
    }

    drawFastVLine(x, y, h, color) {
        this.ctx.fillStyle = this.parseColor(color);
        this.ctx.fillRect(x, y, 1, h);
    }

    fillRoundRect(x, y, w, h, r, color) {
        this.ctx.fillStyle = this.parseColor(color);
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, r);
        this.ctx.fill();
    }

    drawRoundRect(x, y, w, h, r, color) {
        this.ctx.strokeStyle = this.parseColor(color);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
        this.ctx.stroke();
    }

    color565(r, g, b) {
        r = Math.min(255, Math.max(0, r));
        g = Math.min(255, Math.max(0, g));
        b = Math.min(255, Math.max(0, b));
        return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    }

}

// Global instances
window.hw = new VirtualHardware();
window.tft = new VirtualTFT('tft-screen');

// Main loop for the simulator to update status
function __simLoop() {
    window.hw.updateStatusPanel();
    requestAnimationFrame(__simLoop);
}
__simLoop();
