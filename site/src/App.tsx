import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DivisionsApp } from "./apps/divisions/DivisionsApp";
import { RankingsRouteShell } from "./apps/rankings/RankingsRouteShell";
import { PodiumsPage } from "./apps/rankings/pages/PodiumsPage";
import { RiderDirectoryPage } from "./apps/rankings/pages/RiderDirectoryPage";
import { RotyPage } from "./apps/rankings/pages/RotyPage";
import { SeasonRankingsPage } from "./apps/rankings/pages/SeasonRankingsPage";
import { AttendancePage } from "./apps/rankings/pages/AttendancePage";
import { TeamsDirectoryPage } from "./apps/rankings/pages/TeamsDirectoryPage";
import { SeedingPage } from "./apps/seeding/SeedingPage";
import { HomePage } from "./hub/HomePage";
import { HubLayout } from "./hub/HubLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HubLayout />}>
          <Route index element={<HomePage />} />

          <Route element={<RankingsRouteShell />}>
            <Route path="rankings" element={<SeasonRankingsPage />} />
            <Route path="rider-directory" element={<RiderDirectoryPage />} />
            <Route path="teams" element={<TeamsDirectoryPage />} />
            <Route path="roty" element={<RotyPage />} />
            <Route path="podiums" element={<PodiumsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
          </Route>

          <Route path="stats" element={<Navigate to="/attendance" replace />} />

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
