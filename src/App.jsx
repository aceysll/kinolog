import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Search from './pages/Search'
import Discover from './pages/Discover'
import Onboarding from './pages/Onboarding'
import Profile from './pages/Profile'
import Watched from './pages/Watched'
import Stats from './pages/Stats'
import Lists from './pages/Lists'
import ListDetail from './pages/ListDetail'
import Franchise from './pages/Franchise'
import TitleDetail from './pages/TitleDetail'
import PersonDetail from './pages/PersonDetail'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watched"
            element={
              <ProtectedRoute>
                <Watched />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lists"
            element={
              <ProtectedRoute>
                <Lists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lists/:id"
            element={
              <ProtectedRoute>
                <ListDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/franchise/:id"
            element={
              <ProtectedRoute>
                <Franchise />
              </ProtectedRoute>
            }
          />
          <Route
            path="/title/:source/:mediaType/:externalId"
            element={
              <ProtectedRoute>
                <TitleDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/person/:id"
            element={
              <ProtectedRoute>
                <PersonDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
