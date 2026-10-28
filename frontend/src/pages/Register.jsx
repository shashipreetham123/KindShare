import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Phone, MapPin, Building2, Globe, ArrowRight, Loader2, HeartHandshake } from 'lucide-react';
import api from '../services/api';
import './Register.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    type: 'individual',
    countryCode: '+91',
    phoneNumber: '',
    address: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.username.trim().length < 4 || formData.username.trim().length > 20) {
      setError('Username must be between 4 and 20 characters.');
      return;
    }

    if (formData.password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (formData.address.trim().length < 5) {
      setError('Address must be at least 5 characters long.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/register', {
        username: formData.username.trim(),
        password: formData.password,
        type: formData.type,
        countryCode: formData.countryCode.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        email: formData.email.trim()
      });

      // Redirect to login after successful registration
      navigate('/login');
    } catch (err) {
      setError(
        (err.data && err.data.message) ||
        err.message ||
        'Failed to register. Please check your inputs.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="logo-badge">
            <HeartHandshake className="logo-icon" size={32} />
          </div>
          <h1>Create an Account</h1>
          <p>Join KindShare to donate, request, and share items</p>
        </div>

        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. johndoe"
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="type">Account Type</label>
              <div className="input-wrapper">
                <Building2 className="input-icon" size={18} />
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="individual">Individual</option>
                  <option value="organization">Organization</option>
                  <option value="business">Business</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 4 characters"
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-row phone-row">
            <div className="form-group country-code-group">
              <label htmlFor="countryCode">Country Code</label>
              <div className="input-wrapper">
                <Globe className="input-icon" size={18} />
                <input
                  id="countryCode"
                  name="countryCode"
                  type="text"
                  value={formData.countryCode}
                  onChange={handleChange}
                  placeholder="+91"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group phone-number-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <div className="input-wrapper">
                <Phone className="input-icon" size={18} />
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="7-15 digits"
                  autoComplete="tel"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <div className="input-wrapper">
              <MapPin className="input-icon" size={18} />
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, city, state"
                autoComplete="street-address"
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spinner" size={18} />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="register-footer">
          <span>Already have an account?</span>
          <Link to="/login" className="btn-secondary">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
