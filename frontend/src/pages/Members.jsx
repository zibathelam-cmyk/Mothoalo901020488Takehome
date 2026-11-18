import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../state/AppContext.jsx';
import Field from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { initials, shortDate } from '../utils/display.js';

const blank = { fullName: '', membershipNo: '', role: 'member', password: '' };

function validate(values, isEdit) {
  const errors = {};
  if (!values.fullName.trim()) errors.fullName = 'Enter the full name.';
  if (!values.membershipNo.trim()) errors.membershipNo = 'Enter a membership number.';
  if (!isEdit && values.password.length < 6) errors.password = 'Use at least 6 characters.';
  if (isEdit && values.password && values.password.length < 6) errors.password = 'Use at least 6 characters.';
  return errors;
}

export default function Members() {
  const { session, revision, refresh, notify } = useApp();
  const isAdmin = session?.role === 'admin';
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let live = true;
    api.getMembers()
      .then((data) => live && setMembers(data))
      .catch((error) => live && notify(error.message, 'error'));
    return () => { live = false; };
  }, [isAdmin, revision, notify]);

  if (!isAdmin) {
    return (
      <section className="panel access-panel">
        <span className="empty-mark"><Icon name="members" size={24} /></span>
        <h3>Your membership</h3>
        <p>Member administration is available to desk administrators only.</p>
        <div className="own-profile">
          <span className="avatar avatar-large">{initials(session?.fullName)}</span>
          <div>
            <strong>{session?.fullName}</strong>
            <span>{session?.membershipNo} · joined {shortDate(session?.joinedOn)}</span>
          </div>
          <StatusPill tone="violet">{session?.role}</StatusPill>
        </div>
      </section>
    );
  }

  const closeEditor = () => { setEditor(null); setErrors({}); };

  const submit = async (event) => {
    event.preventDefault();
    const isEdit = Boolean(editor.id);
    const found = validate(editor.values, isEdit);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      fullName: editor.values.fullName.trim(),
      membershipNo: editor.values.membershipNo.trim(),
      role: editor.values.role,
    };
    if (editor.values.password) payload.password = editor.values.password;

    setBusy(true);
    try {
      if (isEdit) {
        await api.updateMember(editor.id, payload);
        notify('Member details updated.');
      } else {
        await api.addMember(payload);
        notify('New member registered.');
      }
      closeEditor();
      refresh();
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api.removeMember(confirm.id);
      notify('Member removed.');
      setConfirm(null);
      refresh();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const needle = search.trim().toLowerCase();
  const visible = members.filter((member) =>
    !needle || [member.fullName, member.membershipNo, member.role]
      .some((value) => String(value).toLowerCase().includes(needle))
  );

  return (
    <div className="members-page">
      <section className="toolbar">
        <div className="search-box">
          <Icon name="search" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a member…"
            aria-label="Search members"
          />
        </div>
        <button type="button" className="button button-primary" onClick={() => setEditor({ id: null, values: { ...blank } })}>
          <Icon name="plus" size={16} /> Register member
        </button>
      </section>

      <div className="member-grid">
        {visible.map((member) => (
          <article key={member.id} className="member-card">
            <div className="member-card-top">
              <span className={`avatar avatar-lg ${member.role === 'admin' ? 'avatar-admin' : ''}`}>
                {initials(member.fullName)}
              </span>
              <StatusPill tone={member.role === 'admin' ? 'violet' : 'slate'}>
                {member.role}
              </StatusPill>
            </div>
            <h3>{member.fullName}</h3>
            <p className="mono">{member.membershipNo}</p>
            <p className="muted small">Joined {shortDate(member.joinedOn)}</p>
            <div className="member-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setEditor({
                  id: member.id,
                  values: {
                    fullName: member.fullName,
                    membershipNo: member.membershipNo,
                    role: member.role,
                    password: '',
                  },
                })}
              >
                <Icon name="edit" size={15} /> Edit
              </button>
              <button type="button" className="button button-quiet danger-text" onClick={() => setConfirm(member)}>
                <Icon name="trash" size={15} /> Remove
              </button>
            </div>
          </article>
        ))}
        {visible.length === 0 && <p className="muted empty-note">No members match that search.</p>}
      </div>

      <Modal
        open={Boolean(editor)}
        title={editor?.id ? 'Edit member' : 'Register a member'}
        subtitle="Membership numbers are unique across the library."
        onClose={closeEditor}
        footer={
          <>
            <button type="button" className="button button-quiet" onClick={closeEditor}>Cancel</button>
            <button type="submit" form="member-form" className="button button-primary" disabled={busy}>
              {busy ? 'Saving…' : editor?.id ? 'Save changes' : 'Register'}
            </button>
          </>
        }
      >
        {editor && (
          <form id="member-form" className="form-grid" onSubmit={submit} noValidate>
            {errors.form && <p className="form-alert form-wide" role="alert">{errors.form}</p>}
            <Field label="Full name" error={errors.fullName} wide>
              <input value={editor.values.fullName} onChange={(event) => setEditor({ ...editor, values: { ...editor.values, fullName: event.target.value } })} />
            </Field>
            <Field label="Membership number" error={errors.membershipNo}>
              <input value={editor.values.membershipNo} onChange={(event) => setEditor({ ...editor, values: { ...editor.values, membershipNo: event.target.value } })} placeholder="MEM-1043" />
            </Field>
            <Field label="Role">
              <select value={editor.values.role} onChange={(event) => setEditor({ ...editor, values: { ...editor.values, role: event.target.value } })}>
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </Field>
            <Field
              label={editor.id ? 'New passphrase (optional)' : 'Passphrase'}
              error={errors.password}
              hint={editor.id ? 'Leave blank to keep the current one.' : 'At least 6 characters.'}
              wide
            >
              <input type="password" value={editor.values.password} onChange={(event) => setEditor({ ...editor, values: { ...editor.values, password: event.target.value } })} />
            </Field>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        title="Remove this member?"
        compact
        onClose={() => setConfirm(null)}
        footer={
          <>
            <button type="button" className="button button-quiet" onClick={() => setConfirm(null)}>Keep member</button>
            <button type="button" className="button button-danger" onClick={remove}>Remove member</button>
          </>
        }
      >
        <p><strong>{confirm?.fullName}</strong> will no longer be able to sign in to the desk.</p>
      </Modal>
    </div>
  );
}
