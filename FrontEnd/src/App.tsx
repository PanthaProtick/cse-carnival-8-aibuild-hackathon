import { Bell, Bot, Building2, CalendarDays, ClipboardCheck, LayoutDashboard, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { Overview } from './pages/Overview'
import { Schedules, Announcements, Assignments } from './pages/Resources'
import { Rooms } from './pages/Rooms'
import { Events } from './pages/Events'
import { Assistant } from './pages/Assistant'
import { usePremiumPointer } from './usePremiumPointer'

const links = [
  ['/', LayoutDashboard, 'Overview'], ['/schedules', CalendarDays, 'Schedule'], ['/rooms', Building2, 'Rooms'],
  ['/events', CalendarDays, 'Events'], ['/announcements', Bell, 'Announcements'], ['/assignments', ClipboardCheck, 'Assignments'], ['/assistant', Bot, 'AI assistant'],
] as const
export function App() {
  usePremiumPointer()
  const [open, setOpen] = useState(false)
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.me })
  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><span className="brand-mark">C</span><div><strong>CampusOS</strong><small>AUST • CSE</small></div><button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Primary navigation">{links.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="profile"><span>{user?.name.split(' ').map(x => x[0]).slice(0,2).join('') ?? 'SH'}</span><div><strong>{user?.name ?? 'Loading…'}</strong><small>{user?.student_id ?? 'Campus account'}</small></div></div>
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)}/>} 
    <section className="content"><header className="topbar"><button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu/></button><div><strong>Fall 2026</strong><span className="status-dot"/> <small>Mock API connected</small></div></header>
      <Routes><Route path="/" element={<Overview/>}/><Route path="/schedules" element={<Schedules/>}/><Route path="/rooms" element={<Rooms/>}/><Route path="/events" element={<Events/>}/><Route path="/announcements" element={<Announcements/>}/><Route path="/assignments" element={<Assignments/>}/><Route path="/assistant" element={<Assistant/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>
    </section>
  </div>
}
