import { useState, useEffect, useRef } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { EventType, InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "./authConfig";
import { Folder, File as FileIcon, ChevronRight, ChevronDown, Download, PlusCircle, Upload, Trash2 } from "lucide-react";

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dstContainer, setDstContainer] = useState("");
  const [authStatus, setAuthStatus] = useState("Nie zalogowano");
  const [notifications, setNotifications] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [containers, setContainers] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [contextMenu, setContextMenu] = useState(null); // {x, y, type, container?, file?}

  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const API = "http://localhost:8000";
  const menuRef = useRef(null);

  const pushNotification = (msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const all = instance.getAllAccounts();
    if (all.length > 0 && !instance.getActiveAccount()) {
      instance.setActiveAccount(all[0]);
    }
  }, [instance]);

  useEffect(() => {
    const cbId = instance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
        instance.setActiveAccount(event.payload.account);
        fetchContainers();
      }
    });
    return () => {
      if (cbId) instance.removeEventCallback(cbId);
    };
  }, [instance]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getAccessToken = async () => {
    const active = instance.getActiveAccount();
    if (!active) throw new Error("Brak zalogowanego użytkownika");
    const resp = await instance.acquireTokenSilent({ ...loginRequest, account: active });
    return resp.accessToken;
  };

  const authFetch = async (url, options = {}) => {
    try {
      const token = await getAccessToken();
      const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        setAuthStatus("Sesja wygasła / 401");
        pushNotification("Sesja wygasła. Zaloguj się ponownie.", "error");
      }
      return res;
    } catch (e) {
      pushNotification("Najpierw zaloguj się przez Microsoft.", "error");
      throw e;
    }
  };

  const login = () => instance.loginRedirect(loginRequest);
  const logout = () => instance.logoutRedirect();

  const fetchContainers = async () => {
    try {
      const res = await authFetch(`${API}/containers`);
      if (!res.ok) return;
      const data = await res.json();
      setContainers(data);
    } catch {
      pushNotification("Błąd pobierania kontenerów.", "error");
    }
  };

  const fetchFiles = async (container) => {
    if (!container) return pushNotification("Podaj nazwę folderu!", "error");
    try {
      const res = await authFetch(`${API}/listblobs/${container}`);
      if (res.status === 404) return [];
      if (!res.ok) return [];
      const data = await res.json();
      return data;
    } catch {
      pushNotification("Błąd pobierania listy plików.", "error");
      return [];
    }
  };

  const toggleContainer = async (containerName) => {
    if (expanded[containerName]) {
      setExpanded((prev) => ({ ...prev, [containerName]: null }));
    } else {
      const files = await fetchFiles(containerName);
      setExpanded((prev) => ({ ...prev, [containerName]: files }));
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return pushNotification("Nie wybrano pliku!", "error");
    if (!dstContainer) return pushNotification("Podaj nazwę folderu!", "error");
    const formData = new FormData();
    formData.append("entry", selectedFile);
    const res = await authFetch(`${API}/upload/${dstContainer}`, { method: "POST", body: formData });
    if (!res.ok) return;
    setSelectedFile(null);
    pushNotification("✅ Plik został wrzucony.", "success");
    toggleContainer(dstContainer);
  };

  const deleteFile = async (container, filename) => {
    const res = await authFetch(`${API}/delete/${container}/${filename}`, { method: "DELETE" });
    if (!res.ok) return;
    pushNotification(`🗑️ Plik "${filename}" został usunięty.`, "success");
    toggleContainer(container);
  };

  const downloadFile = async (container, filename) => {
    try {
      const res = await authFetch(`${API}/download/${container}/${filename}`);
      const textData = await res.text();
      const fileUrl = JSON.parse(textData);
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      pushNotification(`📥 Plik "${filename}" został pobrany.`, "success");
    } catch (err) {
      pushNotification("Błąd pobierania pliku.", "error");
    }
  };

  const createContainer = async () => {
    if (!dstContainer) return pushNotification("Podaj nazwę folderu!", "error");
    try {
      const res = await authFetch(`${API}/container/create/${encodeURIComponent(dstContainer)}`, { method: "POST" });
      if (res.ok) {
        setAuthStatus(`Folder "${dstContainer}" został utworzony ✅`);
        pushNotification(`📂 Folder "${dstContainer}" został utworzony.`, "success");
        fetchContainers();
      } else {
        const text = await res.text().catch(() => "");
        setAuthStatus(`Folder nie został utworzony ❌ (HTTP ${res.status})`);
        pushNotification(`❌ Folder nie został utworzony. ${text || res.statusText}`, "error");
      }
    } catch (err) {
      setAuthStatus("Folder nie został utworzony ❌ (błąd połączenia)");
      pushNotification("❌ Folder nie został utworzony. Sprawdź połączenie/API.", "error");
    }
  };

  const handleContextMenu = (e, type, container, file) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, type, container, file });
  };

  const activeUsername = instance.getActiveAccount()?.username;

  if (inProgress !== InteractionStatus.None) {
    return <div style={{ padding: 16 }}>Trwa uwierzytelnianie…</div>;
  }

  return (
    <div style={styles.page}>
      {isAuthenticated && (
        <div style={styles.sidebar}>
          <h3>📁 Akcje</h3>
          <input type="text" placeholder="Podaj nazwę folderu..." value={dstContainer} onChange={(e) => setDstContainer(e.target.value)} style={styles.input} />
          <button onClick={createContainer} style={styles.buttonBlue}>Stwórz folder</button>
          <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} style={styles.input} />
          <button onClick={uploadFile} style={styles.buttonBlue}>Wrzuc plik</button>

          <h3 style={{ marginTop: "20px" }}>📂 Moje foldery</h3>
          {containers.length === 0 ? (
            <div style={styles.emptyBox}>Brak dostępnych folderów</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {containers.map((c) => (
                <li key={c}>
                  <div style={styles.folderItem} onClick={() => toggleContainer(c)} onContextMenu={(e) => handleContextMenu(e, "folder", c)}>
                    {expanded[c] ? <ChevronDown size={16} /> : <ChevronRight size={16} />} <Folder size={16} /> {c}
                  </div>
                  {expanded[c] && (
                    <ul style={{ listStyle: "none", paddingLeft: "20px" }}>
                      {expanded[c].map((f) => (
                        <li key={f} style={styles.fileItem} onContextMenu={(e) => handleContextMenu(e, "file", c, f)}>
                          <FileIcon size={14} /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={styles.container}>
        <h1 style={styles.title}>📂 File Manager</h1>

        <div style={styles.notificationsBox}>
          {notifications.map((n) => (
            <div key={n.id} style={{ ...styles.notification, ...(n.type === "error" ? styles.error : {}), ...(n.type === "success" ? styles.success : {}) }}>{n.msg}</div>
          ))}
        </div>

        <div style={styles.authBox}>
          {!isAuthenticated ? (
            <>
              <button onClick={login} style={styles.buttonBlue}>Zaloguj przez Microsoft</button>
              <div style={styles.authStatus}><b>Status:</b> {authStatus}</div>
            </>
          ) : (
            <>
              <div><b>Zalogowano:</b> {activeUsername}</div>
              <button onClick={logout} style={styles.buttonGray}>Wyloguj</button>
              <div style={styles.authStatus}><b>Status:</b> {authStatus}</div>
            </>
          )}
        </div>
      </div>

      {contextMenu && (
        <ul ref={menuRef} style={{ position: "absolute", top: contextMenu.y, left: contextMenu.x, background: "white", border: "1px solid #ddd", borderRadius: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", listStyle: "none", padding: "6px 0", margin: 0, zIndex: 9999, minWidth: "150px" }}>
          {contextMenu.type === "file" && (
            <>
              <li style={styles.contextItem} onClick={() => { downloadFile(contextMenu.container, contextMenu.file); setContextMenu(null); }}><Download size={14} /> Pobierz</li>
              <li style={styles.contextItem} onClick={() => { deleteFile(contextMenu.container, contextMenu.file); setContextMenu(null); }}><Trash2 size={14} /> Usuń</li>
            </>
          )}
          {contextMenu.type === "folder" && (
            <>
              <li style={styles.contextItem} onClick={() => { createContainer(); setContextMenu(null); }}><PlusCircle size={14} /> Stwórz folder</li>
              <li style={styles.contextItem} onClick={() => { document.querySelector('input[type="file"]').click(); setContextMenu(null); }}><Upload size={14} /> Wrzuc plik</li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}

const styles = {
  page: { display: "flex", minHeight: "100vh", backgroundColor: "#f3f3f3" },
  sidebar: { width: "300px", backgroundColor: "white", borderRight: "1px solid #ddd", padding: "15px", boxShadow: "2px 0 5px rgba(0,0,0,0.05)", overflowY: "auto" },
  container: { flex: 1, padding: "20px", backgroundColor: "white", borderRadius: "12px", margin: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "10px" },
  title: { textAlign: "center", fontSize: "20px", fontWeight: "bold" },
  notificationsBox: { display: "flex", flexDirection: "column", gap: "6px" },
  notification: { padding: "8px", borderRadius: "6px", fontSize: "14px", backgroundColor: "#e5e7eb", color: "#111827" },
  error: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  success: { backgroundColor: "#dcfce7", color: "#166534" },
  authBox: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px", background: "#fafafa" },
  authStatus: { fontSize: "12px", color: "#374151", marginTop: "6px" },
  input: { padding: "8px", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "10px", width: "100%", boxSizing: "border-box" },
  buttonBlue: { padding: "10px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", marginBottom: "10px", width: "100%" },
  buttonGray: { padding: "10px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", width: "100%", marginBottom: "10px" },
  folderItem: { display: "flex", alignItems: "center", padding: "6px 4px", borderRadius: "4px", cursor: "pointer", userSelect: "none", gap: "4px" },
  fileItem: { display: "flex", alignItems: "center", padding: "4px 2px", fontSize: "14px", color: "#374151", cursor: "context-menu", gap: "4px" },
  emptyBox: { fontSize: "14px", color: "#6b7280", fontStyle: "italic", padding: "4px 0" },
  contextItem: { display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" },
};
