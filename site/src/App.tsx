import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DivisionsApp } from "./apps/divisions/DivisionsApp";
import RankingsApp from "./apps/rankings/RankingsApp";
import { SeedingPage } from "./apps/seeding/SeedingPage";
import { HomePage } from "./hub/HomePage";
import { HubLayout } from "./hub/HubLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HubLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="rankings"
            element={
              <div className="hub-route-app">
                <RankingsApp />
              </div>
            }
          />
          <Route
            path="divisions"
            element={
              <div className="hub-route-app">
                <DivisionsApp />
              </div>
            }
          />
          <Route path="seeding" element={<SeedingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
