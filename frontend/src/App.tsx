import { BrowserRouter, Route, Routes } from "react-router-dom"

import { Layout } from "./components/Layout"
import { DashboardPage } from "./pages/DashboardPage"
import { NotFoundPage } from "./pages/NotFoundPage"
import { PatientDetailPage } from "./pages/PatientDetailPage"
import { PatientFormPage } from "./pages/PatientFormPage"
import { PatientListPage } from "./pages/PatientListPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="patients" element={<PatientListPage />} />
          <Route path="patients/new" element={<PatientFormPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="patients/:id/edit" element={<PatientFormPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
