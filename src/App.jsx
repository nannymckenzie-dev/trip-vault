import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Trips from './pages/Trips'
import TripForm from './pages/TripForm'
import TripDetail from './pages/TripDetail'
import CardForm from './pages/CardForm'
import CardDetail from './pages/CardDetail'
import Documents from './pages/Documents'
import Tickets from './pages/Tickets'
import Import from './pages/Import'
import Share from './pages/Share'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Public read-only shared trip — no auth guard. */}
          <Route path="/share/:token" element={<Share />} />

          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <Trips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/new"
            element={
              <ProtectedRoute>
                <TripForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <TripDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id/edit"
            element={
              <ProtectedRoute>
                <TripForm />
              </ProtectedRoute>
            }
          />

          {/* File sections (static segments rank above the :section card routes). */}
          <Route
            path="/trips/:id/documents"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id/tickets"
            element={
              <ProtectedRoute>
                <Tickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id/import"
            element={
              <ProtectedRoute>
                <Import />
              </ProtectedRoute>
            }
          />

          {/* Card routes. `new` is static so it ranks above `:cardId`. */}
          <Route
            path="/trips/:id/:section/new"
            element={
              <ProtectedRoute>
                <CardForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id/:section/:cardId"
            element={
              <ProtectedRoute>
                <CardDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id/:section/:cardId/edit"
            element={
              <ProtectedRoute>
                <CardForm />
              </ProtectedRoute>
            }
          />

          {/* Root + unknown paths → /trips (ProtectedRoute redirects to /login if needed). */}
          <Route path="/" element={<Navigate to="/trips" replace />} />
          <Route path="*" element={<Navigate to="/trips" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
