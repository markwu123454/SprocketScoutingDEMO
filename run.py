import subprocess
import threading
import os
import sys
import signal

def stream_output(process, name):
    try:
        for line in iter(process.stdout.readline, b''):
            print(f"[{name}] {line.decode().rstrip()}")
    except Exception:
        pass
    finally:
        process.stdout.close()

def run_process(name, cmd, cwd):
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
        shell=(sys.platform == "win32")
    )
    thread = threading.Thread(target=stream_output, args=(proc, name), daemon=True)
    thread.start()
    return proc

def terminate_process(proc, name):
    if proc.poll() is None:
        print(f"Terminating {name}...")
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            print(f"Forcing kill on {name}")
            proc.kill()

project_root = os.path.abspath(os.path.dirname(__file__))
frontend_proc = run_process("FRONTEND", ["npm", "run", "dev"], os.path.join(project_root, "DEMOFRONTEND"))
backend_proc = run_process("BACKEND", ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"], os.path.join(project_root, "DEMOBACKEND"))

try:
    frontend_proc.wait()
    backend_proc.wait()
except KeyboardInterrupt:
    terminate_process(frontend_proc, "FRONTEND")
    terminate_process(backend_proc, "BACKEND")
