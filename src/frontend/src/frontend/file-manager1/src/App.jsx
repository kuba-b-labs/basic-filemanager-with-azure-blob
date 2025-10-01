import { useState, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { EventType, InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "./authConfig";
import "./index.css";

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dstContainer, setDstContainer] = useState("");
  const [authStatus, setAuthStatus] = useState("Nie zalogowano");
  const [notifications, setNotifications] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isRootView, setIsRootView] = useState(true);

  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const API = "http://localhost:8000";

  // 🔔 Powiadomienia
  const pushNotification = (msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // MSAL setup
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

  // 📂 API calls
  const fetchContainers = async () => {
    try {
      const res = await authFetch(`${API}/containers`);
      if (!res.ok) return;
      const data = await res.json();
      setContainers([...data].sort((a, b) => a.localeCompare(b)));
      setIsRootView(true);
      setDstContainer("");
      setFiles([]);
      setHasFetched(true);
      if (data.length === 0) pushNotification("Brak folderów.", "info");
    } catch {
      setContainers([]);
      pushNotification("Błąd pobierania listy folderów.", "error");
    }
  };

  const openContainer = (name) => {
    setDstContainer(name);
    setIsRootView(false);
    fetchFiles(name);
  };

  const fetchFiles = async (containerName = dstContainer) => {
    if (!containerName) return pushNotification("Podaj nazwę folderu!", "error");
    try {
      const res = await authFetch(`${API}/listblobs/${containerName}`);
      if (res.status === 404) {
        setFiles([]);
        pushNotification("❌ Kontener nie istnieje!", "error");
        setHasFetched(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setFiles(data);
      setHasFetched(true);
      if (data.length === 0) pushNotification("Brak plików w folderze.", "info");
      setAuthStatus("Zalogowano do kontenera ✅");
    } catch {
      setFiles([]);
      pushNotification("Błąd pobierania listy plików.", "error");
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return pushNotification("Nie wybrano pliku!", "error");
    if (!dstContainer) return pushNotification("Podaj nazwę folderu!", "error");

    try {
      // 🔹 najpierw GET do API na listblobs dla upewnienia się o folderze
      await authFetch(`${API}/listblobs/${dstContainer}`);

      const formData = new FormData();
      formData.append("entry", selectedFile);
      const res = await authFetch(`${API}/upload/${dstContainer}`, { method: "POST", body: formData });
      if (!res.ok) return;
      setSelectedFile(null);
      pushNotification("✅ Plik został wrzucony.", "success");
      fetchFiles();
    } catch {
      pushNotification("Błąd przy wrzucaniu pliku.", "error");
    }
  };

const deleteContainer = async (containerName) => {
  if (!containerName) return pushNotification("Podaj nazwę folderu!", "error");
  try {
    const res = await authFetch(`${API}/delete/${containerName}`, { method: "DELETE" });
    if (res.ok) {
      pushNotification(`🗑️ Folder "${containerName}" został usunięty.`, "success");
      if (isRootView) {
        fetchContainers();
      } else {
        // jeżeli usuwasz folder w którym jesteś → wróć do listy folderów
        setIsRootView(true);
        setDstContainer("");
        fetchContainers();
      }
    } else {
      pushNotification(`❌ Nie udało się usunąć folderu "${containerName}".`, "error");
    }
  } catch {
    pushNotification("Błąd przy usuwaniu folderu.", "error");
  }
};

  const deleteFile = async (filename) => {
    if (!dstContainer) return pushNotification("Podaj nazwę folderu!", "error");
    const res = await authFetch(`${API}/delete/${dstContainer}/${filename}`, { method: "DELETE" });
    if (!res.ok) return;
    pushNotification(`🗑️ Plik "${filename}" został usunięty.`, "success");
    fetchFiles();
  };

  const downloadFile = async (filename) => {
    if (!dstContainer) return pushNotification("Podaj nazwę folderu!", "error");
    try {
      const res = await authFetch(`${API}/download/${dstContainer}/${filename}`);
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
      const res = await authFetch(
        `${API}/container/create/${encodeURIComponent(dstContainer)}`,
        { method: "POST" }
      );
      if (res.ok) {
        setAuthStatus(`Folder "${dstContainer}" został utworzony ✅`);
        pushNotification(`📂 Folder "${dstContainer}" został utworzony.`, "success");
        if (isRootView) fetchContainers();
      } else {
        const text = await res.text().catch(() => "");
        setAuthStatus(`Folder nie został utworzony ❌ (HTTP ${res.status})`);
        pushNotification(`❌ Folder nie został utworzony. ${text || res.statusText}`, "error");
      }
    } catch {
      setAuthStatus("Folder nie został utworzony ❌ (błąd połączenia)");
      pushNotification("❌ Folder nie został utworzony. Sprawdź połączenie/API.", "error");
    }
  };

  // 📑 Context menu
  const handleContextMenu = (e, type, filename) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, type, filename });
  };

  const handleMenuClick = (action) => {
    if (!contextMenu) return;
    const { type, filename } = contextMenu;
    if (type === "file") {
      if (action === "download") downloadFile(filename);
      if (action === "delete") deleteFile(filename);
    }
    if (type === "folder") {
      if (action === "open") openContainer(filename);
      if (action === "create") createContainer();
      if (action === "deleteFolder") deleteContainer(filename);
    }
    setContextMenu(null);
  };

  const activeUsername = instance.getActiveAccount()?.username;

  if (inProgress !== InteractionStatus.None) {
    return <div style={{ padding: 16 }}>Trwa uwierzytelnianie…</div>;
  }
  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <div className="login-box">
          <h2>WELCOME</h2>
          <button className="login-btn" onClick={login}>
            Zaloguj się przez Microsoft
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="filemanager">
      {/* 🔝 Header */}
      <header className="fm-header">
        <div className="fm-logo">file<span>manager</span></div>
        <div className="fm-login">
          {!isAuthenticated ? (
            <button onClick={login}>Zaloguj przez Microsoft</button>
          ) : (
            <>
              <span>{activeUsername}</span>
              <button onClick={logout}>Wyloguj</button>
            </>
          )}
        </div>
      </header>

      {/* Powiadomienia */}
      <div className="fm-notifications">
        {notifications.map((n) => (
          <div key={n.id} className={`fm-note ${n.type}`}>{n.msg}</div>
        ))}
      </div>

      {/* Inputy */}
      <div className="fm-controls">
        <input
          type="text"
          placeholder="Podaj nazwę folderu..."
          value={dstContainer}
          onChange={(e) => setDstContainer(e.target.value)}
        />
        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />

        {isRootView ? (
          <>
            <button onClick={createContainer}>Stwórz folder (kontener)</button>
            <button onClick={fetchContainers}>Odśwież listę folderów</button>
            
          </>
        ) : (
          <>
            <button onClick={createContainer}>Stwórz folder</button>
            <button onClick={uploadFile}>Wrzuć plik</button>
            <button onClick={() => fetchFiles(dstContainer)}>Wyświetl listę plików</button>
            <button onClick={fetchContainers}>⬅️ Wróć do folderów</button>
            <button onClick={() => deleteContainer(dstContainer)}>🗑️ Usuń ten folder</button>
          </>
        )}
      </div>

      {/* 📋 Tabela */}
      <div className="fm-table-container">
        {isRootView ? (
          containers && containers.length > 0 ? (
            <table className="fm-table">
              <thead>
                <tr>
                  <th>Foldery</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c, idx) => (
                  <tr
                    key={idx}
                    onClick={() => openContainer(c)}
                    onContextMenu={(e) => handleContextMenu(e, "folder", c)}
                    className="fm-row folder"
                  >
                    <td>📁 {c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="fm-empty">📂 Brak folderów</div>
          )
        ) : files && files.length > 0 ? (
          <table className="fm-table">
            <thead>
              <tr>
                <th>Nazwa</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr
                  key={idx}
                  onContextMenu={(e) => handleContextMenu(e, "file", file)}
                  className="fm-row file"
                >
                  <td>📄 {file}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="fm-empty">📂 Brak plików w folderze</div>
        )}
      </div>

      {/* 📌 Menu kontekstowe */}
      {contextMenu && (
        <ul
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === "folder" && (
            <>
              <li onClick={() => handleMenuClick("open")}>📂 Otwórz</li>
              <li onClick={() => handleMenuClick("create")}>➕ Utwórz folder</li>
              <li onClick={() => handleMenuClick("deleteFolder")}>🗑️ Usuń folder</li>
            </>
          )}
          {contextMenu.type === "file" && (
            <>
              <li onClick={() => handleMenuClick("download")}>⬇️ Pobierz</li>
              <li onClick={() => handleMenuClick("delete")}>🗑️ Usuń</li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}
