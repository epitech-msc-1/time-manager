import React, { useState } from 'react'
import AuthCard from '@/components/ui/AuthCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) return setError('Tous les champs sont requis')
    // TODO: appel API
    console.log('submit', { email, password })
  }

  return (
    <AuthCard title="Connexion" description="Connecte-toi pour accéder à ton compte">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex flex-col gap-2">
          <Button type="submit">Se connecter</Button>
          <Button variant="outline">Se connecter avec Google</Button>
          <Button variant="outline">Se connecter avec GitHub</Button>
        </div>

        <div className="text-center text-sm">
          <Link to="/register" className="text-sky-600 hover:underline">Créer un compte</Link>
        </div>
      </form>
    </AuthCard>
  )
}
