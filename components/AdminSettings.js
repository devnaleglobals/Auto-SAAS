'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

async function api(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return [res.ok, await res.json().catch(() => ({}))];
}

function useSettingForm(key, initial) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((o) => ({ ...o, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  async function save(e, override) {
    e?.preventDefault();
    setBusy(true);
    const [ok, d] = await api(`/api/admin/settings/${key}`, 'PUT', override || v);
    setBusy(false);
    toast(ok ? 'Saved' : d.error || 'Couldn’t save.', ok ? 'ok' : 'bad');
    if (ok) router.refresh();
    return ok;
  }
  return { v, setV, set, busy, save };
}

export function Card({ title, description, children }) {
  return (
    <section className="card p-6">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
const Field = ({ id, label, hint, children }) => <div><label className="label" htmlFor={id}>{label}</label>{children}{hint && <p className="hint">{hint}</p>}</div>;
const Toggle = ({ id, label, hint, checked, onChange }) => (
  <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-2">
    <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-[#141B2E]" checked={Boolean(checked)} onChange={onChange} />
    <span><span className="block text-sm font-semibold">{label}</span>{hint && <span className="text-sm text-slate">{hint}</span>}</span>
  </label>
);
const SaveBar = ({ busy, label = 'Save changes' }) => <div className="mt-6 flex justify-end"><button disabled={busy} className="btn-dark">{busy && <Spinner />}{label}</button></div>;
// Secret input: never shows the saved value; empty keeps it.
function Secret({ id, label, hint, isSet, value, onChange }) {
  return (
    <Field id={id} label={label} hint={hint || (isSet ? 'Saved. Leave empty to keep it, or type a new value to replace it.' : 'Not set.')}>
      <input id={id} type="password" autoComplete="new-password" className="field font-mono" placeholder={isSet ? '•••••••• (saved)' : ''} value={value || ''} onChange={onChange} />
    </Field>
  );
}

// ---------------- General ----------------
export function GeneralForm({ initial }) {
  const { v, set, busy, save } = useSettingForm('general', initial);
  const f = (k, label, hint, props = {}) => <Field id={k} label={label} hint={hint}><input id={k} className="field" value={v[k] || ''} onChange={set(k)} {...props} /></Field>;
  return (
    <form onSubmit={save}>
      <Card title="Brand and business details" description="Shown on the website, legal pages, invoices and emails. Leave a field empty to use the value from Vercel environment variables.">
        <div className="grid gap-4 sm:grid-cols-2">
          {f('appName', 'Product name', 'Used in emails and the website.')}
          {f('companyName', 'Business name', 'As on your GST certificate.')}
          {f('legalName', 'Proprietor / legal name')}
          {f('gstin', 'GSTIN', null, { maxLength: 15 })}
          <div className="sm:col-span-2">{f('companyAddress', 'Registered address')}</div>
          {f('phone', 'Phone')}
          {f('supportEmail', 'Support email', 'Shown on Contact and legal pages.', { type: 'email' })}
          {f('jurisdiction', 'Courts (city) for the Terms', 'e.g. Bidar, Karnataka')}
          {f('responseTime', 'Support reply time', 'e.g. one working day')}
          {f('grievanceName', 'Grievance Officer name')}
          {f('grievanceEmail', 'Grievance Officer email', null, { type: 'email' })}
        </div>
        <SaveBar busy={busy} />
      </Card>
    </form>
  );
}

// ---------------- Sign-up, trial, maintenance ----------------
export function SignupForm({ initial, plans }) {
  const { v, set, busy, save } = useSettingForm('signup', initial);
  return (
    <form onSubmit={save} className="space-y-6">
      <Card title="Sign-ups" description="Control whether new clients can create accounts.">
        <Toggle id="su-open" label="Allow new sign-ups" hint="When off, the signup page and new Instagram/Facebook sign-ins are refused. Existing clients can still log in." checked={v.signupOpen} onChange={set('signupOpen')} />
      </Card>
      <Card title="Free trial" description="New workspaces get a paid plan for free for a few days, then move to Free unless they pay.">
        <Toggle id="tr-on" label="Give new clients a free trial" checked={v.trialEnabled} onChange={set('trialEnabled')} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field id="tr-days" label="Trial length (days)"><input id="tr-days" type="number" min={1} max={90} className="field" value={v.trialDays} onChange={set('trialDays')} disabled={!v.trialEnabled} /></Field>
          <Field id="tr-plan" label="Plan during the trial"><select id="tr-plan" className="field" value={v.trialPlan} onChange={set('trialPlan')} disabled={!v.trialEnabled}>{plans.filter((p) => p.key !== 'FREE').map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></Field>
        </div>
        <p className="hint mt-3">Changes apply to new sign-ups. To change one client’s trial, open the client in Clients.</p>
      </Card>
      <Card title="Maintenance mode" description="Pauses all sending for every client and shows a banner in their dashboard.">
        <Toggle id="mt-on" label="Maintenance mode is on" checked={v.maintenance} onChange={set('maintenance')} />
        <Field id="mt-msg" label="Message shown to clients"><input id="mt-msg" className="field" value={v.maintenanceMessage || ''} onChange={set('maintenanceMessage')} placeholder="Scheduled maintenance until 6 pm IST. Automations resume after that." /></Field>
      </Card>
      <SaveBar busy={busy} />
    </form>
  );
}

// ---------------- Plans and pricing ----------------
export function PlansForm({ initial, keys, mode }) {
  const { v, setV, busy, save } = useSettingForm('plans', initial);
  const setP = (k, field) => (e) => setV((o) => ({ ...o, [k]: { ...o[k], [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } }));
  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        {keys.map((k) => {
          const p = v[k] || {};
          const free = k === 'FREE';
          return (
            <Card key={k} title={`${p.name || k}${free ? ' (free plan)' : ''}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`${k}-name`} label="Name"><input id={`${k}-name`} className="field" value={p.name || ''} onChange={setP(k, 'name')} /></Field>
                <Field id={`${k}-price`} label="Price (₹ / month)"><input id={`${k}-price`} type="number" min={0} className="field" value={free ? 0 : p.price ?? ''} onChange={setP(k, 'price')} disabled={free} /></Field>
                <Field id={`${k}-msg`} label="Messages per month"><input id={`${k}-msg`} type="number" min={0} className="field" value={p.messages ?? ''} onChange={setP(k, 'messages')} /></Field>
                <Field id={`${k}-acc`} label="Connected accounts"><input id={`${k}-acc`} type="number" min={1} className="field" value={p.accounts ?? ''} onChange={setP(k, 'accounts')} /></Field>
                <Field id={`${k}-mem`} label="Team members"><input id={`${k}-mem`} type="number" min={1} className="field" value={p.members ?? ''} onChange={setP(k, 'members')} /></Field>
                {!free && <Field id={`${k}-rz`} label={`Razorpay plan ID (${mode} mode)`} hint="Create the plan in Razorpay → Subscriptions → Plans with the same price."><input id={`${k}-rz`} className="field font-mono" placeholder="plan_…" value={p.razorpayPlanId || ''} onChange={setP(k, 'razorpayPlanId')} /></Field>}
                <div className="sm:col-span-2"><Field id={`${k}-blurb`} label="Short description"><input id={`${k}-blurb`} className="field" value={p.blurb || ''} onChange={setP(k, 'blurb')} /></Field></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6">
                {!free && <Toggle id={`${k}-active`} label="Available to buy" checked={p.active !== false} onChange={setP(k, 'active')} />}
                <Toggle id={`${k}-pop`} label="Mark as “Most popular”" checked={p.popular} onChange={setP(k, 'popular')} />
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Features listed on every plan" description="One per line. Shown on the pricing and billing pages.">
        <textarea className="field" rows={7} value={(v.features || []).join('\n')} onChange={(e) => setV((o) => ({ ...o, features: e.target.value.split('\n') }))} aria-label="Features" />
      </Card>
      <p className="text-sm text-slate">A price change here doesn’t change what existing subscribers pay in Razorpay. Create a new Razorpay plan with the new price and paste its ID; new purchases use it.</p>
      <SaveBar busy={busy} label="Save plans" />
    </form>
  );
}

// ---------------- Email ----------------
export function EmailForm({ initial, providers, presets, secretsSet, envFallback }) {
  const { v, setV, set, busy, save } = useSettingForm('email', initial);
  const { toast } = useFeedback();
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const prov = providers[v.provider];
  const secret = (k, label, hint) => <Secret id={k} label={label} hint={hint} isSet={secretsSet[k]} value={v[k]} onChange={set(k)} />;
  async function test() {
    setTesting(true);
    const [ok, d] = await api('/api/admin/email/test', 'POST', { to: testTo || undefined });
    setTesting(false);
    toast(ok ? `Test email sent to ${d.to}` : d.error, ok ? 'ok' : 'bad');
  }
  return (
    <form onSubmit={save} className="space-y-6">
      <Card title="Email provider" description="Every email the platform sends (password resets, invites, alerts, payment and support emails) goes through this provider.">
        {envFallback && !v.provider && <p className="mb-4 rounded-lg bg-sky/5 p-3 text-sm">Right now emails use <strong>Resend</strong> from the Vercel variables (RESEND_API_KEY / EMAIL_FROM). Choose a provider here to manage it from the console instead.</p>}
        <Field id="em-prov" label="Provider">
          <select id="em-prov" className="field" value={v.provider || ''} onChange={set('provider')}>
            <option value="">Not set (use Vercel variables)</option>
            {Object.entries(providers).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
        </Field>
        {prov && <p className="hint">{prov.help}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {v.provider === 'resend' && secret('resendKey', 'Resend API key')}
          {v.provider === 'sendgrid' && secret('sendgridKey', 'SendGrid API key')}
          {v.provider === 'postmark' && secret('postmarkToken', 'Postmark server token')}
          {v.provider === 'brevo' && secret('brevoKey', 'Brevo API key')}
          {v.provider === 'zeptomail' && (<>
            {secret('zeptoToken', 'ZeptoMail send mail token')}
            <Field id="zr" label="Account region"><select id="zr" className="field" value={v.zeptoRegion || 'in'} onChange={set('zeptoRegion')}><option value="in">India (zeptomail.in)</option><option value="com">Global (zeptomail.com)</option></select></Field>
          </>)}
          {v.provider === 'mailgun' && (<>
            {secret('mailgunKey', 'Mailgun API key')}
            <Field id="mgd" label="Sending domain"><input id="mgd" className="field" value={v.mailgunDomain || ''} onChange={set('mailgunDomain')} placeholder="mg.example.com" /></Field>
            <Field id="mgr" label="Region"><select id="mgr" className="field" value={v.mailgunRegion || 'us'} onChange={set('mailgunRegion')}><option value="us">US</option><option value="eu">EU</option></select></Field>
          </>)}
          {v.provider === 'smtp' && (<>
            <div className="sm:col-span-2"><Field id="smp" label="Quick setup" hint="Fills in the server for common providers.">
              <select id="smp" className="field" defaultValue="" onChange={(e) => { const p = presets[e.target.value]; if (p) setV((o) => ({ ...o, smtpHost: p.smtpHost, smtpPort: p.smtpPort, smtpSecure: p.smtpSecure })); }}>
                <option value="">Choose…</option>{Object.entries(presets).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
              </select></Field></div>
            <Field id="smh" label="SMTP host"><input id="smh" className="field" value={v.smtpHost || ''} onChange={set('smtpHost')} /></Field>
            <Field id="smport" label="Port"><input id="smport" type="number" className="field" value={v.smtpPort || ''} onChange={set('smtpPort')} /></Field>
            <Field id="smu" label="Username"><input id="smu" className="field" autoComplete="off" value={v.smtpUser || ''} onChange={set('smtpUser')} /></Field>
            {secret('smtpPass', 'Password / app password')}
            <Toggle id="sms" label="Use SSL/TLS from the start (port 465)" hint="Off for port 587 (STARTTLS)." checked={v.smtpSecure} onChange={set('smtpSecure')} />
          </>)}
        </div>
      </Card>

      <Card title="Sender addresses" description="The “From” domain must be verified with your provider (Gmail addresses only work through Gmail SMTP).">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fn" label="Sender name"><input id="fn" className="field" value={v.fromName || ''} onChange={set('fromName')} placeholder="ReplyRelay" /></Field>
          <Field id="fe" label="From email (account emails)" hint="Password resets, invites, welcome."><input id="fe" type="email" className="field" value={v.fromEmail || ''} onChange={set('fromEmail')} placeholder="noreply@yourdomain.com" /></Field>
          <Field id="fa" label="From email for alerts" hint="Reconnect and payment alerts. Empty = same as above."><input id="fa" type="email" className="field" value={v.alertsFrom || ''} onChange={set('alertsFrom')} placeholder="alerts@yourdomain.com" /></Field>
          <Field id="fs" label="From email for support" hint="Ticket emails. Empty = same as above."><input id="fs" type="email" className="field" value={v.supportFrom || ''} onChange={set('supportFrom')} placeholder="support@yourdomain.com" /></Field>
          <Field id="rt" label="Reply-to address" hint="Where client replies to account and alert emails go."><input id="rt" type="email" className="field" value={v.replyTo || ''} onChange={set('replyTo')} /></Field>
          <Field id="si" label="Support team inbox" hint="Receives new-ticket and client-reply notifications. Empty = all Owner/Admin/Support admins."><input id="si" type="email" className="field" value={v.supportInbox || ''} onChange={set('supportInbox')} /></Field>
        </div>
        <Toggle id="en" label="Sending is on" hint="Turn off to stop all platform emails (they are logged as skipped)." checked={v.enabled !== false} onChange={set('enabled')} />
      </Card>
      <SaveBar busy={busy} label="Save email settings" />

      <Card title="Send a test email" description="Save first. Uses the saved settings.">
        <div className="flex flex-wrap gap-2">
          <input type="email" className="field max-w-sm" placeholder="Your email (empty = your admin email)" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Test recipient" />
          <button type="button" onClick={test} disabled={testing} className="btn-ghost">{testing && <Spinner />}Send test</button>
        </div>
      </Card>
    </form>
  );
}

// ---------------- Email templates ----------------
export function TemplatesForm({ templates, overrides }) {
  const keys = Object.keys(templates);
  const [sel, setSel] = useState(keys[0]);
  const [all, setAll] = useState(() => Object.fromEntries(keys.map((k) => [k, {
    subject: overrides[k]?.subject || templates[k].subject, body: overrides[k]?.body || templates[k].body, enabled: overrides[k]?.enabled !== false,
  }])));
  const { busy, save } = useSettingForm('emailTemplates', {});
  const t = all[sel];
  const upd = (field) => (e) => setAll((o) => ({ ...o, [sel]: { ...o[sel], [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } }));
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <ul className="card h-fit divide-y divide-line text-sm">
        {keys.map((k) => <li key={k}><button type="button" onClick={() => setSel(k)} className={`w-full px-4 py-2.5 text-left ${sel === k ? 'bg-canvas font-semibold' : 'hover:bg-canvas'}`}>{templates[k].label}{overrides[k] && <span className="ml-1 text-xs text-slate">· edited</span>}</button></li>)}
      </ul>
      <form onSubmit={(e) => save(e, all)}>
        <Card title={templates[sel].label} description={<>Placeholders: {templates[sel].vars.map((x) => <code key={x} className="mr-1.5 rounded bg-canvas px-1">{`{{${x}}}`}</code>)}</>}>
          <Toggle id="tp-en" label="Send this email" checked={t.enabled} onChange={upd('enabled')} />
          <Field id="tp-sub" label="Subject"><input id="tp-sub" className="field" value={t.subject} onChange={upd('subject')} /></Field>
          <div className="mt-4"><Field id="tp-body" label="Message" hint="Plain text. Links become clickable; the email gets your brand header and footer."><textarea id="tp-body" rows={12} className="field font-mono text-sm" value={t.body} onChange={upd('body')} /></Field></div>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button type="button" className="btn-ghost" onClick={() => setAll((o) => ({ ...o, [sel]: { subject: templates[sel].subject, body: templates[sel].body, enabled: true } }))}>Reset to default</button>
            <button disabled={busy} className="btn-dark">{busy && <Spinner />}Save all templates</button>
          </div>
        </Card>
      </form>
    </div>
  );
}

// ---------------- Payments ----------------
export function PaymentsForm({ initial, secretsSet, envInfo, webhookUrl }) {
  const { v, set, busy, save } = useSettingForm('payments', initial);
  return (
    <form onSubmit={save} className="space-y-6">
      <Card title="Razorpay" description="Keys saved here are encrypted and override the Vercel variables. Test and Live keys, plans and webhooks are separate: keep them all in the same mode.">
        <p className="mb-4 rounded-lg bg-canvas p-3 text-sm">Currently using <strong>{envInfo.mode} mode</strong> keys from <strong>{envInfo.source === 'admin' ? 'this page' : 'Vercel variables'}</strong>{envInfo.keyId ? <> ({envInfo.keyId.slice(0, 14)}…)</> : ' (none set)'}.</p>
        <Toggle id="pay-on" label="Online payments are on" hint="When off, clients can’t upgrade; existing subscriptions keep renewing in Razorpay." checked={v.enabled !== false} onChange={set('enabled')} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field id="kid" label="Key ID" hint="rzp_test_… or rzp_live_…"><input id="kid" className="field font-mono" value={v.keyId || ''} onChange={set('keyId')} /></Field>
          <Secret id="ksec" label="Key secret" isSet={secretsSet.keySecret} value={v.keySecret} onChange={set('keySecret')} />
          <Secret id="wsec" label="Webhook secret" isSet={secretsSet.webhookSecret} value={v.webhookSecret} onChange={set('webhookSecret')} />
          <Field id="wurl" label="Webhook URL (paste in Razorpay → Webhooks)"><input id="wurl" className="field font-mono text-xs" readOnly value={webhookUrl} onFocus={(e) => e.target.select()} /></Field>
        </div>
        <p className="hint mt-3">Razorpay webhook events: all subscription.* events. Plan IDs are set in Plans &amp; pricing.</p>
        <SaveBar busy={busy} label="Save payment settings" />
      </Card>
    </form>
  );
}

// ---------------- Admin team ----------------
export function AdminsManager({ admins, meId }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [n, setN] = useState({ email: '', name: '', role: 'SUPPORT', password: '' });
  const [busy, setBusy] = useState('');
  async function run(key, url, method, body, okMsg) {
    setBusy(key);
    const [ok, d] = await api(url, method, body);
    setBusy('');
    toast(ok ? okMsg : d.error, ok ? 'ok' : 'bad');
    if (ok) router.refresh();
    return ok;
  }
  return (
    <div className="space-y-6">
      <Card title="Admins" description="People who can open this console. Roles: Owner (everything), Admin (everything except admins), Support (tickets, view clients), Billing (payments, plans).">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b border-line"><tr><th className="th">Admin</th><th className="th">Role</th><th className="th">2-step</th><th className="th">Last sign-in</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{admins.map((a) => (
            <tr key={a.id} className="border-b border-line last:border-0">
              <td className="td"><span className="font-semibold">{a.name}</span>{a.id === meId && <span className="text-slate"> (you)</span>}<span className="block text-xs text-slate">{a.email}{!a.active && ' · deactivated'}</span></td>
              <td className="td"><select className="field py-1.5" value={a.role} disabled={!!busy} onChange={(e) => run(a.id, `/api/admin/admins/${a.id}`, 'PATCH', { role: e.target.value }, 'Role changed')} aria-label="Role">{['OWNER', 'ADMIN', 'SUPPORT', 'BILLING'].map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}</select></td>
              <td className="td">{a.totpEnabled ? 'On' : <span className="text-bad">Off</span>}</td>
              <td className="td text-slate">{a.lastLoginAt || 'Never'}</td>
              <td className="td">{a.id !== meId && <span className="flex flex-wrap justify-end gap-1.5">
                <button className="btn-ghost btn-sm" onClick={() => run(a.id, `/api/admin/admins/${a.id}`, 'PATCH', { active: !a.active }, a.active ? 'Deactivated' : 'Activated')}>{a.active ? 'Deactivate' : 'Activate'}</button>
                {a.totpEnabled && <button className="btn-ghost btn-sm" onClick={async () => { if (await confirm({ title: `Reset 2-step for ${a.name}?`, body: 'They sign in with just the password until they set it up again.', confirmLabel: 'Reset' })) run(a.id, `/api/admin/admins/${a.id}`, 'PATCH', { reset2fa: true, signOut: true }, '2-step reset'); }}>Reset 2-step</button>}
                <button className="btn-ghost btn-sm text-bad" onClick={async () => { if (await confirm({ title: `Remove ${a.name}?`, body: 'They lose access to the admin console immediately.', confirmLabel: 'Remove', danger: true })) run(a.id, `/api/admin/admins/${a.id}`, 'DELETE', null, 'Admin removed'); }}>Remove</button>
              </span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      <form onSubmit={async (e) => { e.preventDefault(); if (await run('new', '/api/admin/admins', 'POST', n, 'Admin added. Share the temporary password privately.')) setN({ email: '', name: '', role: 'SUPPORT', password: '' }); }}>
        <Card title="Add an admin" description="They get an email with the sign-in link. Give them the temporary password in person or by phone, never in the same email.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="na-name" label="Name"><input id="na-name" className="field" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} required /></Field>
            <Field id="na-email" label="Email"><input id="na-email" type="email" className="field" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} required /></Field>
            <Field id="na-role" label="Role"><select id="na-role" className="field" value={n.role} onChange={(e) => setN({ ...n, role: e.target.value })}>{['ADMIN', 'SUPPORT', 'BILLING', 'OWNER'].map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}</select></Field>
            <Field id="na-pw" label="Temporary password" hint="10+ characters, upper and lower case and a number."><input id="na-pw" type="text" autoComplete="off" className="field font-mono" value={n.password} onChange={(e) => setN({ ...n, password: e.target.value })} required /></Field>
          </div>
          <SaveBar busy={busy === 'new'} label="Add admin" />
        </Card>
      </form>
    </div>
  );
}

// ---------------- My security (password + 2-step) ----------------
export function SecurityForms({ totpEnabled }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [offPw, setOffPw] = useState('');
  const [busy, setBusy] = useState('');
  async function run(key, url, method, body, okMsg) {
    setBusy(key);
    const [ok, d] = await api(url, method, body);
    setBusy('');
    if (!ok) { toast(d.error, 'bad'); return null; }
    if (okMsg) toast(okMsg);
    return d;
  }
  return (
    <div className="space-y-6">
      <Card title="2-step verification" description="Asks for a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy) after your password.">
        {totpEnabled ? (
          <form onSubmit={async (e) => { e.preventDefault(); if (await run('off', '/api/admin/me/2fa', 'DELETE', { password: offPw }, '2-step verification turned off')) router.refresh(); }} className="space-y-3">
            <p className="text-sm font-semibold text-ok">On for your account.</p>
            <div className="flex flex-wrap gap-2"><input type="password" className="field max-w-xs" placeholder="Your password" value={offPw} onChange={(e) => setOffPw(e.target.value)} aria-label="Password to turn off" required /><button className="btn-ghost text-bad" disabled={busy === 'off'}>{busy === 'off' && <Spinner />}Turn off</button></div>
          </form>
        ) : !setup ? (
          <button className="btn-dark" disabled={busy === 'start'} onClick={async () => { const d = await run('start', '/api/admin/me/2fa', 'GET'); if (d) setSetup(d); }}>{busy === 'start' && <Spinner />}Set up 2-step verification</button>
        ) : (
          <form onSubmit={async (e) => { e.preventDefault(); if (await run('on', '/api/admin/me/2fa', 'POST', { code }, '2-step verification is on')) { setSetup(null); router.refresh(); } }} className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <img src={setup.qr} alt="QR code to scan with your authenticator app" className="h-[220px] w-[220px] rounded-lg bg-white p-2" />
            <div className="space-y-3 text-sm">
              <p>1. Scan the QR code with your authenticator app, or enter this key: <code className="break-all rounded bg-canvas px-1.5 py-0.5 font-mono">{setup.secret}</code></p>
              <p>2. Enter the 6-digit code it shows:</p>
              <input className="field max-w-[180px] text-center font-mono text-lg tracking-[0.3em]" inputMode="numeric" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code" required />
              <div><button className="btn-dark" disabled={busy === 'on'}>{busy === 'on' && <Spinner />}Turn on</button></div>
            </div>
          </form>
        )}
      </Card>
      <form onSubmit={async (e) => { e.preventDefault(); if (pw.next !== pw.confirm) return toast('The new passwords don’t match.', 'bad'); if (await run('pw', '/api/admin/me/password', 'POST', { current: pw.current, next: pw.next }, 'Password changed. Other devices are signed out.')) setPw({ current: '', next: '', confirm: '' }); }}>
        <Card title="Change password" description="At least 10 characters with upper and lower case letters and a number. Signs out your other devices.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="cp-c" label="Current password"><input id="cp-c" type="password" autoComplete="current-password" className="field" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
            <Field id="cp-n" label="New password"><input id="cp-n" type="password" autoComplete="new-password" minLength={10} className="field" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></Field>
            <Field id="cp-r" label="Confirm"><input id="cp-r" type="password" autoComplete="new-password" minLength={10} className="field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></Field>
          </div>
          <SaveBar busy={busy === 'pw'} label="Change password" />
        </Card>
      </form>
    </div>
  );
}

// ---------------- Pay-as-you-go credit packs ----------------
export function CreditsForm({ initial }) {
  const { v, setV, set, busy, save } = useSettingForm('credits', initial);
  const packs = v.packs || [];
  const upd = (i, k) => (e) => setV((o) => ({ ...o, packs: o.packs.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)) }));
  return (
    <form onSubmit={save} className="mt-6">
      <Card title="Pay as you go: message credits" description="Clients buy credits once (Razorpay one-time payment). Credits are used only after the plan’s monthly messages run out, and never expire. Combine with the Free plan for a pure pay-as-you-go option.">
        <Toggle id="cr-on" label="Sell credit packs on the Billing page" checked={v.enabled} onChange={set('enabled')} />
        <div className="mt-3 space-y-3">
          {packs.map((p, i) => (
            <div key={p.id || i} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
              <Field id={`cp-n${i}`} label="Pack name"><input id={`cp-n${i}`} className="field" value={p.name || ''} onChange={upd(i, 'name')} placeholder="5,000 messages" /></Field>
              <Field id={`cp-c${i}`} label="Messages"><input id={`cp-c${i}`} type="number" min={1} className="field" value={p.credits ?? ''} onChange={upd(i, 'credits')} /></Field>
              <Field id={`cp-p${i}`} label="Price (₹)"><input id={`cp-p${i}`} type="number" min={1} className="field" value={p.price ?? ''} onChange={upd(i, 'price')} /></Field>
              <button type="button" className="btn-ghost btn-sm text-bad" onClick={() => setV((o) => ({ ...o, packs: o.packs.filter((_, j) => j !== i) }))}>Remove</button>
            </div>
          ))}
        </div>
        {packs.length < 6 && <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => setV((o) => ({ ...o, packs: [...(o.packs || []), { name: '', credits: '', price: '' }] }))}>+ Add pack</button>}
        <p className="hint mt-3">Prices include GST if your plans do. Razorpay sends a payment receipt; issue the GST invoice for credit packs from your accounting software.</p>
        <SaveBar busy={busy} label="Save credit packs" />
      </Card>
    </form>
  );
}
