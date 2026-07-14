import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthenticatedOnboardingProvider } from "@/components/onboarding/authenticated-onboarding-provider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthenticatedOnboardingProvider>
      <App />
    </AuthenticatedOnboardingProvider>
  </React.StrictMode>
);
