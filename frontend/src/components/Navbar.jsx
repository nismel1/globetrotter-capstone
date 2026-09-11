import React, { useContext, useState, useRef, useEffect } from 'react'
import logo from '../assets/logo.png'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../context/AuthContext'
import {
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MusicalNoteIcon,
  PlusCircleIcon,
  SpeakerXMarkIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { useAudio } from '../context/AudioContext'
import WeatherWidget from './WeatherWidget'
import SearchBar from './SearchBar'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationBell from './NotificationBell'
import '../styles/navbar.css'

export default function Navbar() {
  const { t } = useTranslation()
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const audio = useAudio()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Primary visible links in main header bar
  const PRIMARY_NAV = [
    { path: '/home', label: t('navbar.home') || 'Accueil', Icon: HomeIcon },
    { path: '/explorer', label: t('navbar.explore') || 'Explorer', Icon: MagnifyingGlassIcon },
    { path: '/itinerary', label: t('navbar.myItineraries') || 'Itinéraires', Icon: MapIcon },
    { path: '/events', label: t('navbar.events') || 'Événements', Icon: CalendarDaysIcon },
    { path: '/messages', label: 'Messages', Icon: ChatBubbleLeftRightIcon },
  ]

  // Secondary community & feature links inside "Découvrir" dropdown
  const SECONDARY_NAV = [
    { path: '/defis', label: t('navbar.defis') || 'Défis & Missions', Icon: TrophyIcon },
    { path: '/patrimoine', label: t('navbar.patrimoine') || 'Patrimoine', Icon: BuildingLibraryIcon },
    { path: '/groupes', label: t('navbar.groupes') || 'Groupes & Amis', Icon: UserGroupIcon },
    { path: '/propose', label: t('navbar.propose') || 'Proposer un lieu', Icon: PlusCircleIcon },
  ]

  if (user?.role === 'admin') {
    SECONDARY_NAV.push({ path: '/admin', label: t('navbar.admin') || 'Administration', Icon: ShieldCheckIcon })
  }

  const isSecondaryActive = SECONDARY_NAV.some(item => item.path === pathname)

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close menus on route change
  useEffect(() => {
    setDropdownOpen(false)
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="navbar">
        {/* Logo Brand */}
        <button className="navbar-brand" onClick={() => navigate('/home')} aria-label={t('common.back')}>
          <img src={logo} alt="Globetrotter LBV" className="navbar-logo" />
          <span>Globetrotter</span><strong>LBV</strong>
        </button>

        {/* Search Bar */}
        <div className="navbar-search-wrapper">
          <SearchBar
            placeholder={t('home.searchPlaceholder') || 'Chercher un lieu...'}
            style={{ width: 200 }}
          />
        </div>

        {/* Primary Desktop Nav Links */}
        <nav className="navbar-links" aria-label="Navigation principale">
          {PRIMARY_NAV.map(({ path, label, Icon }) => (
            <button
              key={path}
              className={pathname === path ? 'navbar-link is-active' : 'navbar-link'}
              onClick={() => navigate(path)}
              aria-current={pathname === path ? 'page' : undefined}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}

          {/* "Découvrir" Dropdown Menu */}
          <div className="navbar-dropdown-wrapper" ref={dropdownRef}>
            <button
              className={`navbar-link navbar-dropdown-btn ${isSecondaryActive ? 'is-active' : ''} ${dropdownOpen ? 'is-open' : ''}`}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <TrophyIcon />
              <span>{t('navbar.more') || 'Découvrir'}</span>
              <ChevronDownIcon className={`dropdown-chevron ${dropdownOpen ? 'rotate' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="navbar-dropdown-menu">
                {SECONDARY_NAV.map(({ path, label, Icon }) => (
                  <button
                    key={path}
                    className={`dropdown-item ${pathname === path ? 'is-active' : ''}`}
                    onClick={() => {
                      navigate(path)
                      setDropdownOpen(false)
                    }}
                  >
                    <Icon className="dropdown-icon" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Right Actions & Utilities */}
        <div className="navbar-actions">
          <WeatherWidget size="compact" />
          <NotificationBell />
          <button
            className={audio.enabled ? 'navbar-audio is-active' : 'navbar-audio'}
            onClick={audio.toggle}
            title="Ambiance sonore"
            aria-label="Ambiance sonore"
          >
            {audio.enabled ? <MusicalNoteIcon /> : <SpeakerXMarkIcon />}
            <span>{audio.enabled ? 'Ambiance' : 'Mute'}</span>
          </button>
          <LanguageSwitcher />
          
          <button
            className={`navbar-user ${pathname === '/profile' ? 'is-active' : ''}`}
            onClick={() => navigate('/profile')}
            title="Mon profil"
          >
            <span className="navbar-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            <span className="user-name-text">{user?.name?.split(' ')[0] || t('navbar.profile')}</span>
          </button>

          <button
            className="navbar-logout"
            onClick={handleLogout}
            title={t('common.logout')}
            aria-label={t('common.logout')}
          >
            <ArrowRightOnRectangleIcon />
          </button>

          {/* Mobile Drawer Hamburger Button */}
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <XMarkIcon /> : <Bars3Icon />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay & Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="mobile-drawer-user">
                <span className="navbar-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                <div>
                  <div className="drawer-username">{user?.name || 'Visiteur'}</div>
                  <div className="drawer-useremail">{user?.email || 'Bienvenue sur Globetrotter'}</div>
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setMobileMenuOpen(false)}>
                <XMarkIcon />
              </button>
            </div>

            <div className="mobile-drawer-nav">
              <div className="drawer-section-title">Navigation</div>
              {PRIMARY_NAV.map(({ path, label, Icon }) => (
                <button
                  key={path}
                  className={`mobile-drawer-link ${pathname === path ? 'is-active' : ''}`}
                  onClick={() => {
                    navigate(path)
                    setMobileMenuOpen(false)
                  }}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              ))}

              <div className="drawer-section-title">Découvrir</div>
              {SECONDARY_NAV.map(({ path, label, Icon }) => (
                <button
                  key={path}
                  className={`mobile-drawer-link ${pathname === path ? 'is-active' : ''}`}
                  onClick={() => {
                    navigate(path)
                    setMobileMenuOpen(false)
                  }}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="mobile-drawer-footer">
              <button className="mobile-logout-btn" onClick={handleLogout}>
                <ArrowRightOnRectangleIcon />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Quick Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile rapide">
        {PRIMARY_NAV.map(({ path, label, Icon }) => (
          <button
            key={path}
            className={pathname === path ? 'mobile-nav-link is-active' : 'mobile-nav-link'}
            onClick={() => navigate(path)}
            aria-current={pathname === path ? 'page' : undefined}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
        <button
          className={mobileMenuOpen ? 'mobile-nav-link is-active' : 'mobile-nav-link'}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <Bars3Icon />
          <span>Menu</span>
        </button>
      </nav>
    </>
  )
}
