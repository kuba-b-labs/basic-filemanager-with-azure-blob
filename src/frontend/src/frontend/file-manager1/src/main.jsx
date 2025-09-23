import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";
import FileManager from "./App"; // Twój komponent z poniższego bloku

const pca = new PublicClientApplication(msalConfig);

ReactDOM.createRoot(document.getElementById("root")).render(
  <MsalProvider instance={pca}>
    <FileManager />
  </MsalProvider>
);
