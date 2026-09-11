import React, { useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ExplorerPage from './pages/ExplorerPage'
import ItineraryPage from './pages/ItineraryPage'
import SharedItineraryPage from './pages/SharedItineraryPage'
import ProposePage from './pages/ProposePage'
import ProfilePage from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'
import MyHistoryPage from './pages/MyHistoryPage'
import AdminPage from './pages/AdminPage'
import EventsPage from './pages/EventsPage'
import DefisPage from './pages/DefisPage'
import PatrimoinePage from './pages/PatrimoinePage'
import GroupPage from './pages/GroupPage'
import { AuthProvider, AuthContext } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute'
import AudioPlayer from './components/AudioPlayer'
import { AudioProvider } from './context/AudioContext'

function AppContent() {
  const { isAuthenticated } = useContext(AuthContext)
  
  return (
    <>
      {isAuthenticated ? (
        <AudioProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Navigate to="/home" />} />
              <Route path="/" element={<Navigate to="/home" />} />
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/explorer"
                element={
                  <ProtectedRoute>
                    <ExplorerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/itinerary"
                element={
                  <ProtectedRoute>
                    <ItineraryPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/itineraire/:shareToken" element={<SharedItineraryPage />} />
              <Route
                path="/defis"
                element={
                  <ProtectedRoute>
                    <DefisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patrimoine"
                element={
                  <ProtectedRoute>
                    <PatrimoinePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groupes"
                element={
                  <ProtectedRoute>
                    <GroupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/propose"
                element={
                  <ProtectedRoute>
                    <ProposePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-history"
                element={
                  <ProtectedRoute>
                    <MyHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/home" />} />
            </Routes>
            <AudioPlayer />
          </Router>
        </AudioProvider>
      ) : (
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/itineraire/:shareToken" element={<SharedItineraryPage />} />
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      )}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App
