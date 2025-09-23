// UZUPEŁNIJ: w App registrations (Entra ID)
// - clientId: SPA application (frontend)
// - tenantId: GUID albo "common"/"organizations"
// - redirectUri: dokładnie taki jak w rejestracji, np. http://localhost:5173

export const msalConfig = {
  auth: {
    clientId: "2a04d36c-e1a3-42fd-b3f2-d899965986d6",
    authority: "https://login.microsoftonline.com/3c47c7e5-7bea-4fd0-a1bc-14bb84f31a17",
    //redirectUri: "http://localhost:8080", // HTTP jest OK na localhost w DEV
    redirectUri: "https://test104.pl:8080" // Redirect na https
  },
  cache: { cacheLocation: "sessionStorage" }, // rekomendowane dla SPA
  
};

// UZUPEŁNIJ scope do swojego API (App ID URI), np. api://<BACKEND-APP-ID>/Files.ReadWrite
export const loginRequest = {
  scopes: ["openid", "profile", "email", "api://42afd9a7-204c-4b39-bb4c-020eddbf86ec/Files.ReadWrite"],
};
