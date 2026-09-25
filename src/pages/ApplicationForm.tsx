import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, ArrowRight, Check, Cloud } from 'lucide-react';
import { Button, Field, inputCls } from '../components/ui';
import { Logo } from '../components/Logo';
import { api } from '../lib/supabase';

const steps = ['Personal Details', 'Technical Profile', 'Domain Preference', 'Questions', 'Review'];
const domainList = ['Software', 'Electronics', 'Mechanical', 'Embedded', 'Computer Vision'];

export function ApplicationForm() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [primary, setPrimary] = useState('Software');
  const [secondary, setSecondary] = useState('Computer Vision');
  const [motivation, setMotivation] = useState('');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const next = async () => {
    if (step < steps.length - 1) { setStep((s) => s + 1); return; }
    setSaving(true); setNotice('');
    try {
      await api('/application', { method: 'PUT', body: JSON.stringify({ primary, secondary, motivation, experience_summary: experienceSummary, github_url: githubUrl, portfolio_url: portfolioUrl, submit: true }) });
      nav('/dashboard');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to submit your application.'); }
    finally { setSaving(false); }
  };
  const saveDraft = async () => {
    setSaving(true); setNotice('');
    try {
      await api('/application', { method: 'PUT', body: JSON.stringify({ primary, secondary, motivation, experience_summary: experienceSummary, github_url: githubUrl, portfolio_url: portfolioUrl }) });
      setNotice('Draft saved securely.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save your draft.'); }
    finally { setSaving(false); }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[900px] items-center justify-between px-6">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <Cloud size={14} className="text-[#2f9e63]" /> Draft autosaved
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-6 py-10">
        {/* Progress header */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition ${
                    i < step ? 'bg-celadon text-indigo' : i === step ? 'bg-tekhelet text-white' : 'bg-paper-2 text-ink-soft'
                  }`}>
                    {i < step ? <Check size={15} /> : i + 1}
                  </div>
                  <span className={`hidden text-[11px] font-medium sm:block ${i === step ? 'text-ink' : 'text-ink-soft'}`}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`mx-2 h-px flex-1 ${i < step ? 'bg-celadon' : 'bg-line'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-7 md:p-9">
          <h1 className="font-display text-2xl font-bold">{steps[step]}</h1>

          <div className="mt-6">
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required><input className={inputCls} defaultValue="Aarav Shah" /></Field>
                <Field label="PICT email" required><input className={inputCls} defaultValue="aarav.shah@pict.edu" /></Field>
                <Field label="Phone" required><input className={inputCls} placeholder="98220 11234" /></Field>
                <Field label="Branch" required>
                  <select className={inputCls} defaultValue="IT"><option>Computer</option><option>IT</option><option>E&TC</option><option>Mechanical</option></select>
                </Field>
                <Field label="Division" required>
                  <select className={inputCls}><option>A</option><option>B</option><option>C</option></select>
                </Field>
                <Field label="Year" required>
                  <select className={inputCls}><option>First Year (FY)</option><option>Second Year (SY)</option></select>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-5">
                <Field label="Skills" hint="Comma-separated"><input className={inputCls} placeholder="PID control, PCB design, OpenCV" /></Field>
                <Field label="Programming languages"><input className={inputCls} placeholder="C++, Python" /></Field>
                <Field label="Projects you've built"><textarea value={experienceSummary} onChange={(e) => setExperienceSummary(e.target.value)} rows={3} className={inputCls} placeholder="Briefly list what you've made..." /></Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="GitHub"><input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className={inputCls} placeholder="github.com/username" /></Field>
                  <Field label="Portfolio / LinkedIn"><input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className={inputCls} placeholder="in/username" /></Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium">Primary preference <span className="text-tekhelet">*</span></p>
                  <div className="flex flex-wrap gap-2">
                    {domainList.map((d) => (
                      <button key={d} onClick={() => setPrimary(d)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${primary === d ? 'border-tekhelet bg-tekhelet text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Secondary preference</p>
                  <div className="flex flex-wrap gap-2">
                    {domainList.filter((d) => d !== primary).map((d) => (
                      <button key={d} onClick={() => setSecondary(d)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${secondary === d ? 'border-glaucous bg-glaucous/15 text-tekhelet' : 'border-line bg-white text-ink-soft hover:border-line-strong'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5">
                <Field label="Why do you want to join Robotics Club?" required><textarea required value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={3} className={inputCls} /></Field>
                <Field label="Tell us about something you have built." required><textarea rows={3} className={inputCls} /></Field>
                <Field label="What technical skill would you like to learn?" required><textarea rows={2} className={inputCls} /></Field>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-ink-soft">Review your application before submitting.</p>
                {[
                  ['Name', 'Aarav Shah'], ['Email', 'aarav.shah@pict.edu'], ['Branch / Division', 'IT · B'],
                  ['Year', 'First Year (FY)'], ['Primary domain', primary], ['Secondary domain', secondary],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-line pb-3 text-sm">
                    <span className="text-ink-soft">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-celadon/15 p-4 text-sm text-[#1e6b43]">
                  By submitting you confirm the information above is accurate.
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
            {step > 0 ? (
              <button onClick={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <Link to="/recruitment" className="text-sm text-ink-soft hover:text-ink">Cancel</Link>
            )}
            <div className="flex gap-3">
              <Button variant="outline" size="md" disabled={saving} onClick={saveDraft}>Save Draft</Button>
              <Button variant="cta" disabled={saving} onClick={next}>
                {saving ? 'Saving…' : step === steps.length - 1 ? 'Submit Application' : 'Continue'} <ArrowRight size={16} />
              </Button>
            </div>
          </div>
          {notice && <p className="mt-4 rounded-lg border border-[#f3c0c0] bg-[#fbe9e9]/60 px-3 py-2 text-sm text-[#a13939]">{notice}</p>}
        </div>
      </div>
    </div>
  );
}
