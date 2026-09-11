import React, { useState, useContext } from 'react'
import logo from '../assets/logo.png'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../context/AuthContext'
import { ArrowRightIcon, CheckCircleIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, GlobeAltIcon, LockClosedIcon, MapPinIcon, SparklesIcon } from '@heroicons/react/24/outline'
import './LoginPage.css'

export default function LoginPage() {
  const { t } = useTranslation()
  const [isSignup, setIsSignup] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, signup } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/home'

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!formData.email.trim() || !formData.password.trim()) {
      setError(t('auth.emailRequired') + ' et ' + t('auth.passwordRequired'))
      return
    }
    if (isSignup && !formData.name.trim()) {
      setError(t('auth.emailRequired'))
      return
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (isSignup) {
        await signup(formData.name, formData.email, formData.password)
        setSuccess(t('auth.signupSuccess'))
        setTimeout(() => navigate('/home', { replace: true }), 700)
      } else {
        await login(formData.email, formData.password)
        navigate(redirectTo, { replace: true })
      }
    } catch (err) {
      setError(isSignup ? t('auth.signupError') : t('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-overlay" />
        <div className="login-visual-content">
          <div className="login-brand login-brand--visual"><img src={logo} alt="Globetrotter" className="login-brand-image" /><span>Globetrotter</span></div>
          <div className="login-visual-main">
            <span className="login-eyebrow"><SparklesIcon /> {t('home.subtitle')}</span>
            <h1>Découvrez<br /><strong>Libreville</strong><br />autrement.</h1>
            <p>Explorez les lieux qui rendent la ville unique, construisez vos itinéraires et gardez une trace de chaque aventure.</p>
          </div>
          <div className="login-discovery-cards">
            <div className="login-discovery-card"><div className="login-discovery-icon"><MapPinIcon /></div><div><strong>{t('navbar.explore')}</strong><span>Des lieux à découvrir</span></div></div>
            <div className="login-discovery-card"><div className="login-discovery-icon"><GlobeAltIcon /></div><div><strong>{t('itinerary.createItinerary')}</strong><span>Votre prochaine aventure</span></div></div>
          </div>
        </div>
        <div className="login-location"><MapPinIcon /> Libreville, Gabon</div>
      </section>
      <section className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-brand login-brand--mobile"><img src={logo} alt="Globetrotter" className="login-brand-image" /><span>Globetrotter</span></div>
          <div className="login-heading"><span className="login-heading-label">{isSignup ? 'Nouveau voyageur' : 'Bienvenue'}</span><h2>{isSignup ? t('auth.createAccount') : 'Votre prochaine aventure vous attend.'}</h2><p>{isSignup ? 'Rejoignez Globetrotter et commencez à construire votre carnet de voyage.' : 'Connectez-vous pour retrouver vos destinations, itinéraires et souvenirs.'}</p></div>
          <form className="login-form" onSubmit={handleSubmit}>
            {isSignup && <div className="login-field"><label htmlFor="name">{t('auth.fullName')}</label><div className="login-input-wrapper"><div className="login-input-icon"><SparklesIcon /></div><input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder={t('auth.fullName')} autoComplete="name" disabled={loading} /></div></div>}
            <div className="login-field"><label htmlFor="email">{t('auth.email')}</label><div className="login-input-wrapper"><div className="login-input-icon"><EnvelopeIcon /></div><input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="vous@exemple.com" autoComplete="email" disabled={loading} /></div></div>
            <div className="login-field"><label htmlFor="password">{t('auth.password')}</label><div className="login-input-wrapper"><div className="login-input-icon"><LockClosedIcon /></div><input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} placeholder={t('auth.password')} autoComplete={isSignup ? 'new-password' : 'current-password'} disabled={loading} /><button type="button" className="login-password-toggle" onClick={() => setShowPassword(previous => !previous)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} disabled={loading}>{showPassword ? <EyeSlashIcon /> : <EyeIcon />}</button></div>{isSignup && <span className="login-helper">Utilisez au moins 6 caractères.</span>}</div>
            {error && <div className="login-message login-message--error"><span className="login-message-icon">!</span><span>{error}</span></div>}
            {success && <div className="login-message login-message--success"><CheckCircleIcon /><span>{success}</span></div>}
            <button type="submit" className="login-submit" disabled={loading}><span>{loading ? (isSignup ? 'Création du compte...' : t('auth.login')) : (isSignup ? t('auth.createAccount') : t('auth.login'))}</span>{!loading && <ArrowRightIcon />}{loading && <span className="login-spinner" />}</button>
          </form>
          <div className="login-divider"><span>ou</span></div>
          <div className="login-switch"><span>{isSignup ? t('auth.haveAccount') : t('auth.noAccount')}</span><button type="button" onClick={() => { setIsSignup(previous => !previous); setError(''); setSuccess(''); setFormData({ email: '', password: '', name: '' }) }} disabled={loading}>{isSignup ? t('auth.login') : t('auth.createAccount')}</button></div>
          <div className="login-trust"><span className="login-trust-dot" /><span>Vos données restent protégées et votre expérience vous appartient.</span></div>
        </div>
      </section>
    </main>
  )
}
