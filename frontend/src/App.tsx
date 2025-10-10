import { Routes, Route, Link } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

function Home() {
  const [count, setCount] = useState(0)
  return (
    <div className="p-6">
      <div className="flex gap-4 items-center">
        <img src={viteLogo} className="logo" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1 className="mt-6">Bienvenue</h1>
      <div className="card mt-4">
        <Button onClick={() => setCount((c) => c + 1)}>count is {count}</Button>
      </div>
      <div className="mt-4">
        <Link to="/login">
          <Button>Aller à la page de login</Button>
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  )
}
