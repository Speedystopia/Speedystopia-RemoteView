import tkinter as tk
import subprocess
import threading
import os
import sys
import signal

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
server_process = None
log_lines = []


def check_deps():
    """Check and install dependencies if needed."""
    # npm deps
    if not os.path.isdir(os.path.join(SCRIPT_DIR, "node_modules")):
        append_log("Installation des dependances npm...")
        subprocess.run(["npm", "install"], cwd=SCRIPT_DIR, shell=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        append_log("npm: OK")

    # Python deps
    try:
        import soundcard  # noqa: F401
    except ImportError:
        append_log("Installation de soundcard + numpy...")
        subprocess.run([sys.executable, "-m", "pip", "install", "soundcard", "numpy"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        append_log("pip: OK")


def append_log(text):
    log_lines.append(text)
    # Keep last 200 lines
    if len(log_lines) > 200:
        del log_lines[:50]
    update_log()


def update_log():
    log_box.config(state=tk.NORMAL)
    log_box.delete("1.0", tk.END)
    log_box.insert(tk.END, "\n".join(log_lines))
    log_box.see(tk.END)
    log_box.config(state=tk.DISABLED)


def read_output(pipe):
    for line in iter(pipe.readline, ""):
        if line:
            append_log(line.rstrip())
    pipe.close()


def start_server():
    global server_process
    if server_process and server_process.poll() is None:
        append_log("Deja en cours d'execution.")
        return

    log_lines.clear()
    append_log("Verification des dependances...")
    check_deps()
    append_log("Demarrage du serveur...")

    try:
        server_process = subprocess.Popen(
            ["node", "server.js"],
            cwd=SCRIPT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            bufsize=1,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    except FileNotFoundError:
        append_log("[ERREUR] Node.js non trouve. Installez-le: https://nodejs.org/")
        return

    btn_start.config(state=tk.DISABLED)
    btn_stop.config(state=tk.NORMAL)
    status_var.set("● En cours")
    status_label.config(fg="#4ade80")

    # Read stdout in background thread
    t = threading.Thread(target=read_output, args=(server_process.stdout,), daemon=True)
    t.start()

    # Watch for process exit
    threading.Thread(target=watch_exit, daemon=True).start()


def watch_exit():
    server_process.wait()
    append_log(f"Serveur arrete (code {server_process.returncode})")
    btn_start.config(state=tk.NORMAL)
    btn_stop.config(state=tk.DISABLED)
    status_var.set("● Arrete")
    status_label.config(fg="#f87171")


def stop_server():
    global server_process
    if not server_process or server_process.poll() is not None:
        append_log("Rien a arreter.")
        return

    append_log("Arret en cours...")
    try:
        # Kill process tree (node + ffmpeg + python children)
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(server_process.pid)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except Exception:
        try:
            server_process.kill()
        except Exception:
            pass
    server_process = None


def on_close():
    stop_server()
    root.destroy()


# --- GUI ---
root = tk.Tk()
root.title("Speedystopia")
root.geometry("620x420")
root.configure(bg="#1a1a2e")
root.resizable(True, True)
root.protocol("WM_DELETE_WINDOW", on_close)

# Icon color scheme
FG = "#e0e0e0"
BG = "#1a1a2e"
BTN_BG = "#16213e"
BTN_ACTIVE = "#0f3460"
ACCENT = "#6366f1"

# Title
title_frame = tk.Frame(root, bg=BG)
title_frame.pack(fill=tk.X, padx=16, pady=(16, 4))
tk.Label(title_frame, text="Speedystopia", font=("Segoe UI", 18, "bold"),
         fg=ACCENT, bg=BG).pack(side=tk.LEFT)

# Status
status_var = tk.StringVar(value="● Arrete")
status_label = tk.Label(title_frame, textvariable=status_var,
                        font=("Segoe UI", 11), fg="#f87171", bg=BG)
status_label.pack(side=tk.RIGHT)

# Buttons
btn_frame = tk.Frame(root, bg=BG)
btn_frame.pack(fill=tk.X, padx=16, pady=8)

btn_start = tk.Button(btn_frame, text="▶  Lancer", font=("Segoe UI", 11, "bold"),
                      fg="#fff", bg="#22c55e", activebackground="#16a34a",
                      relief=tk.FLAT, padx=20, pady=6, cursor="hand2",
                      command=start_server)
btn_start.pack(side=tk.LEFT, padx=(0, 8))

btn_stop = tk.Button(btn_frame, text="■  Arreter", font=("Segoe UI", 11, "bold"),
                     fg="#fff", bg="#ef4444", activebackground="#dc2626",
                     relief=tk.FLAT, padx=20, pady=6, cursor="hand2",
                     state=tk.DISABLED, command=stop_server)
btn_stop.pack(side=tk.LEFT)

# Log area
log_frame = tk.Frame(root, bg=BG)
log_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=(4, 16))

log_box = tk.Text(log_frame, bg="#0d1117", fg="#8b949e", font=("Consolas", 9),
                  relief=tk.FLAT, borderwidth=0, highlightthickness=1,
                  highlightbackground="#30363d", state=tk.DISABLED, wrap=tk.WORD)
log_box.pack(fill=tk.BOTH, expand=True)

# Start
root.mainloop()
