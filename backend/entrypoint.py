import os
import sys
import threading
import socket

def start_tcp_proxy(listen_port: int, target_port: int):
    """
    Forwards incoming connections from listen_port to target_port.
    Guarantees that whether Railway routes traffic to port 8000, 8080,
    or a dynamic $PORT, requests always reach the application.
    """
    def handle_client(client_sock, target_port):
        try:
            target_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            target_sock.connect(('127.0.0.1', target_port))
            
            def pipe(src, dst):
                try:
                    while True:
                        data = src.recv(4096)
                        if not data:
                            break
                        dst.sendall(data)
                except Exception:
                    pass
                finally:
                    try:
                        dst.shutdown(socket.SHUT_WR)
                    except Exception:
                        pass

            t1 = threading.Thread(target=pipe, args=(client_sock, target_sock), daemon=True)
            t2 = threading.Thread(target=pipe, args=(target_sock, client_sock), daemon=True)
            t1.start()
            t2.start()
            t1.join()
            t2.join()
        except Exception:
            pass
        finally:
            try:
                client_sock.close()
            except Exception:
                pass

    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server_sock.bind(('0.0.0.0', listen_port))
        server_sock.listen(128)
        print(f"[Port Proxy] Forwarding 0.0.0.0:{listen_port} -> 127.0.0.1:{target_port}", flush=True)
        while True:
            client_sock, _ = server_sock.accept()
            threading.Thread(target=handle_client, args=(client_sock, target_port), daemon=True).start()
    except Exception as e:
        print(f"[Port Proxy] Could not bind to port {listen_port}: {e}", flush=True)

def main():
    raw_port = os.getenv("PORT", "8000").strip()
    try:
        app_port = int(raw_port)
    except ValueError:
        app_port = 8000

    print(f"[Startup] Primary application binding to 0.0.0.0:{app_port}...", flush=True)

    # If app_port is not 8000, proxy 8000 -> app_port so Railway's default EXPOSE 8000 works
    if app_port != 8000:
        threading.Thread(target=start_tcp_proxy, args=(8000, app_port), daemon=True).start()

    # Also proxy 8080 -> app_port in case Railway routes to 8080
    if app_port != 8080:
        threading.Thread(target=start_tcp_proxy, args=(8080, app_port), daemon=True).start()

    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=app_port, workers=1)

if __name__ == "__main__":
    main()
