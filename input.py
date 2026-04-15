import sys
import json
import ctypes

user32 = ctypes.windll.user32

MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010

# Get actual screen resolution
SCREEN_W = user32.GetSystemMetrics(0)
SCREEN_H = user32.GetSystemMetrics(1)
print(f"[input] Screen: {SCREEN_W}x{SCREEN_H}", file=sys.stderr, flush=True)

for line in sys.stdin:
    try:
        cmd = json.loads(line.strip())
        t = cmd.get('type')

        if t == 'move':
            # Normalized coords (0-1) -> screen pixels
            x = max(0, min(1, cmd['x']))
            y = max(0, min(1, cmd['y']))
            user32.SetCursorPos(int(x * SCREEN_W), int(y * SCREEN_H))

        elif t == 'click':
            btn = cmd.get('button', 'left')
            if btn == 'left':
                user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            elif btn == 'right':
                user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
                user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)

    except Exception as e:
        print(f"[input] Error: {e}", file=sys.stderr, flush=True)
