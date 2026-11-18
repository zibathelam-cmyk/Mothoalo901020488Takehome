import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApp } from '../state/AppContext.jsx';
import Field from '../components/Field.jsx';

export default function SignIn() {
  const { session, signIn, notify } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ membershipNo: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.membershipNo.trim()) next.membershipNo = 'Enter your membership number.';
    if (!form.password) next.password = 'Enter your passphrase.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const member = await api.signIn({
        membershipNo: form.membershipNo.trim(),
        password: form.password,
      });
      signIn(member);
      notify(`Welcome back, ${member.fullName.split(' ')[0]}.`);
      navigate('/', { replace: true });
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signin-screen">
      <section className="signin-story">
        <div className="brand brand-light">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div><strong>BukaHub</strong><small>library desk</small></div>
        </div>

        <div className="story-copy">
          <p className="eyebrow">Circulation made simple</p>
          <h2>The desk is open.<br />Every book has a home.</h2>
          <p className="story-lead">
            Keep the catalogue tidy, watch the shelves that are running low, and record
            every copy that comes in or goes out.
          </p>
          <ul className="story-list">
            <li><span className="dot dot-amber" /> Catalogue with instant stock status</li>
            <li><span className="dot dot-violet" /> One ledger for arrivals and loans</li>
            <li><span className="dot dot-mint" /> Clear member roles and access</li>
          </ul>
        </div>

        <p className="story-foot">BukaHub · Community library system</p>
      </section>

      <section className="signin-panel">
        <form className="signin-card" onSubmit={submit} noValidate>
          <p className="eyebrow">Desk access</p>
          <h1>Sign in to continue</h1>
          <p className="muted">Use your library membership number and passphrase.</p>

          {errors.form && <p className="form-alert" role="alert">{errors.form}</p>}

          <Field label="Membership number" error={errors.membershipNo}>
            <input
              value={form.membershipNo}
              onChange={(event) => setForm({ ...form, membershipNo: event.target.value })}
              placeholder="e.g. CIRC-7420"
              autoComplete="username"
            />
          </Field>

          <Field label="Passphrase" error={errors.password}>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Your passphrase"
              autoComplete="current-password"
            />
          </Field>

          <button className="button button-primary button-block" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Open the desk'}
          </button>

          <div className="demo-note">
            <strong>Demo desk account</strong>
            <span>Membership <code>CIRC-7420</code></span>
            <span>Passphrase <code>deskPass!26</code></span>
          </div>
        </form>
      </section>
    </div>
  );
}
