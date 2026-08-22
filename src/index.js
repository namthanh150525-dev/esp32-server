/**
 * ESP32 Game Console - Cloudflare Worker API
 * Repo: github.com/namthanh150525-dev/esp32-server
 * 
 * API Endpoints:
 * GET  /manifest              → Danh sách game + nhạc
 * GET  /game/:name            → Download game assets
 * GET  /music/:name           → Stream nhạc
 * GET  /config/:deviceId      → Lấy config thiết bị
 * POST /config/:deviceId      → Lưu config thiết bị
 * GET  /firmware/latest       → Kiểm tra firmware mới nhất
 * GET  /health                → Health check
 */

// ============================================================
// CORS Headers — cho phép ESP32 kết nối từ bất kỳ đâu
// ============================================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-ID',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

// ============================================================
// MANIFEST — Danh sách game và nhạc có sẵn
// (Cập nhật file này khi thêm game mới)
// ============================================================
const GAME_MANIFEST = {
  version: "1.0.0",
  updated: "2026-08-22",
  games: [
    {
      id: "dino",
      name: "Dino Runner",
      description: "Khủng long nhảy qua chướng ngại vật",
      version: "1.0",
      size_bytes: 81920,
      file: "game/dino/assets.bin",
      icon: "🦕",
      controls: "BTN_A to jump"
    },
    {
      id: "snake",
      name: "Snake",
      description: "Rắn ăn mồi, dài dần ra",
      version: "1.0",
      size_bytes: 30720,
      file: "game/snake/assets.bin",
      icon: "🐍",
      controls: "Joystick to move"
    },
    {
      id: "tetris",
      name: "Tetris",
      description: "Xếp hình rơi kinh điển",
      version: "1.0",
      size_bytes: 51200,
      file: "game/tetris/assets.bin",
      icon: "🧱",
      controls: "Joystick + BTN_A to rotate"
    },
    {
      id: "space_shooter",
      name: "Space Shooter",
      description: "Bắn phi thuyền từ trên xuống",
      version: "1.0",
      size_bytes: 102400,
      file: "game/space_shooter/assets.bin",
      icon: "✈️",
      controls: "Joystick + BTN_A to fire"
    }
  ],
  music: [
    {
      id: "menu_bgm",
      name: "Menu Theme",
      file: "music/menu_bgm.mp3",
      size_bytes: 204800
    },
    {
      id: "game_over",
      name: "Game Over",
      file: "music/game_over.mp3",
      size_bytes: 51200
    },
    {
      id: "victory",
      name: "Victory",
      file: "music/victory.mp3",
      size_bytes: 81920
    }
  ],
  firmware: {
    latest_version: "1.0.0",
    file: "firmware/esp32_v1.0.0.bin",
    size_bytes: 1048576,
    changelog: "Initial release"
  }
};

// ============================================================
// ROUTER
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── Health check ──────────────────────────────────────────
    if (path === '/health') {
      return jsonResponse({
        success: true,
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'ESP32 Game Server is running!'
      });
    }

    // ── GET /manifest ─────────────────────────────────────────
    if (path === '/manifest' && method === 'GET') {
      return jsonResponse({
        success: true,
        ...GAME_MANIFEST
      });
    }

    // ── GET /game/:name ───────────────────────────────────────
    const gameMatch = path.match(/^\/game\/([a-zA-Z0-9_]+)$/);
    if (gameMatch && method === 'GET') {
      const gameName = gameMatch[1];
      const game = GAME_MANIFEST.games.find(g => g.id === gameName);

      if (!game) {
        return errorResponse(`Game '${gameName}' not found`, 404);
      }

      try {
        const object = await env.GAME_ASSETS.get(game.file);
        if (!object) {
          return errorResponse('Game file not found in storage', 404);
        }

        return new Response(object.body, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': object.size,
            'X-Game-Name': game.name,
            'X-Game-Version': game.version,
            'Cache-Control': 'public, max-age=3600',
            ...CORS_HEADERS,
          },
        });
      } catch (e) {
        return errorResponse('Failed to fetch game: ' + e.message, 500);
      }
    }

    // ── GET /music/:name ──────────────────────────────────────
    const musicMatch = path.match(/^\/music\/([a-zA-Z0-9_]+)$/);
    if (musicMatch && method === 'GET') {
      const musicName = musicMatch[1];
      const track = GAME_MANIFEST.music.find(m => m.id === musicName);

      if (!track) {
        return errorResponse(`Music '${musicName}' not found`, 404);
      }

      try {
        const object = await env.GAME_ASSETS.get(track.file);
        if (!object) {
          return errorResponse('Music file not found in storage', 404);
        }

        return new Response(object.body, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': object.size,
            'Cache-Control': 'public, max-age=86400',
            ...CORS_HEADERS,
          },
        });
      } catch (e) {
        return errorResponse('Failed to fetch music: ' + e.message, 500);
      }
    }

    // ── GET /firmware/latest ──────────────────────────────────
    if (path === '/firmware/latest' && method === 'GET') {
      const deviceVersion = request.headers.get('X-Device-Version') || '0.0.0';
      const latestVersion = GAME_MANIFEST.firmware.latest_version;
      const needsUpdate = deviceVersion !== latestVersion;

      return jsonResponse({
        success: true,
        current_version: deviceVersion,
        latest_version: latestVersion,
        needs_update: needsUpdate,
        download_url: needsUpdate ? `/firmware/download` : null,
        changelog: GAME_MANIFEST.firmware.changelog
      });
    }

    // ── GET /firmware/download ────────────────────────────────
    if (path === '/firmware/download' && method === 'GET') {
      try {
        const object = await env.GAME_ASSETS.get(GAME_MANIFEST.firmware.file);
        if (!object) {
          return errorResponse('Firmware file not found', 404);
        }
        return new Response(object.body, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': object.size,
            'X-Firmware-Version': GAME_MANIFEST.firmware.latest_version,
            ...CORS_HEADERS,
          },
        });
      } catch (e) {
        return errorResponse('Failed to fetch firmware: ' + e.message, 500);
      }
    }

    // ── GET /config/:deviceId ─────────────────────────────────
    const configGetMatch = path.match(/^\/config\/([a-zA-Z0-9_\-:]+)$/);
    if (configGetMatch && method === 'GET') {
      const deviceId = configGetMatch[1];
      try {
        // Lưu config trong R2 bucket (configs/ folder)
        const object = await env.GAME_ASSETS.get(`configs/${deviceId}.json`);
        if (!object) {
          return jsonResponse({
            success: true,
            device_id: deviceId,
            config: {},
            message: 'No config found, using defaults'
          });
        }
        const text = await object.text();
        return jsonResponse({
          success: true,
          device_id: deviceId,
          config: JSON.parse(text)
        });
      } catch (e) {
        return errorResponse('Failed to get config: ' + e.message, 500);
      }
    }

    // ── POST /config/:deviceId ────────────────────────────────
    const configPostMatch = path.match(/^\/config\/([a-zA-Z0-9_\-:]+)$/);
    if (configPostMatch && method === 'POST') {
      const deviceId = configPostMatch[1];
      try {
        const body = await request.json();
        const configData = {
          ...body,
          device_id: deviceId,
          updated_at: new Date().toISOString()
        };
        // Lưu vào R2 bucket (configs/ folder)
        await env.GAME_ASSETS.put(
          `configs/${deviceId}.json`,
          JSON.stringify(configData),
          { httpMetadata: { contentType: 'application/json' } }
        );
        return jsonResponse({
          success: true,
          message: 'Config saved successfully',
          device_id: deviceId,
          config: configData
        });
      } catch (e) {
        return errorResponse('Failed to save config: ' + e.message, 500);
      }
    }

    // ── 404 Not Found ─────────────────────────────────────────
    return errorResponse(`Endpoint '${path}' not found`, 404);
  },
};
