"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface AuthContextType {
  isLoggedIn: boolean
  teamName: string | null
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const team = localStorage.getItem("teamName")
    setIsLoggedIn(loggedIn)
    setTeamName(team)
    setMounted(true)
  }, [])

  const logout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("teamName")
    localStorage.removeItem("email")
    setIsLoggedIn(false)
    setTeamName(null)
  }

  if (!mounted) return children

  return <AuthContext.Provider value={{ isLoggedIn, teamName, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
