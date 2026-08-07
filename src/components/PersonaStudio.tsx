import { useEffect, useRef, useState, useCallback } from 'react';
import {
  type Persona,
  type ChatMessage,
  VOICES,
  ACCENTS,
  emptyPersona,
  buildSystemPrompt,
  validatePersona,
  initials,
  pickEmoji,
  uid,
} from '../lib/persona';
import { PRESETS } from '../lib/presets';
import { shareUrl, readShared } from '../lib/share';
import { loadAll, saveOne, removeOne, exportJson, importJson } from '../lib/store';

type View = 'gallery' | 'edit' | 'chat';

function Avatar({ p, size = 44 }: { p: Persona; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, ${p.accent}, #22d3ee)` }}
      aria-hidden="true"
    >
      {p.emoji || initials(p.name)}
    </span>
  );
}

export default function PersonaStudio() {
  const [view, setView] = useState<View>('gallery');
  const [saved, setSaved] = useState<Persona[]>([]);
  const [draft, setDraft] = useState<Persona | null>(null);
  const [active, setActive] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [traitInput, setTraitInput] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => setSaved(await loadAll()), []);

  useEffect(() => {
    refresh();
    const shared = readShared(location.search);
    if (shared) {
      setActive(shared);
      setMessages(shared.greeting ? [{ role: 'assistant', content: shared.greeting }] : []);
      setView('chat');
      history.replaceState(null, '', location.pathname);
      flash(`Loaded shared character: ${shared.name}`);
    }
  }, [refresh]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  }

  function startNew() {
    setDraft(emptyPersona());
    setErr('');
    setTraitInput('');
    setView('edit');
  }
  function editExisting(p: Persona) {
    setDraft({ ...p });
    setErr('');
    setTraitInput('');
    setView('edit');
  }

  function addTrait() {
    const t = traitInput.trim();
    if (!t || !draft) return;
    if (!draft.traits.includes(t)) setDraft({ ...draft, traits: [...draft.traits, t] });
    setTraitInput('');
  }

  async function saveDraft() {
    if (!draft) return;
    const p = { ...draft, emoji: draft.emoji || pickEmoji(draft.name) };
    const errs = validatePersona(p);
    if (errs.length) return setErr(errs.join(' · '));
    await saveOne(p);
    await refresh();
    flash(`Saved ${p.name}`);
    openChat(p);
  }

  function openChat(p: Persona) {
    setActive(p);
    setMessages(p.greeting ? [{ role: 'assistant', content: p.greeting }] : []);
    setView('chat');
  }

  async function send() {
    if (!active || !input.trim() || thinking) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setThinking(true);
    setErr('');
    abortRef.current = new AbortController();
    try {
      const { chat } = await import('@chirag127/oz-ai');
      const stream = await chat(
        history.map((m) => ({ role: m.role, content: m.content })),
        { system: buildSystemPrompt(active), stream: true, signal: abortRef.current.signal },
      );
      let acc = '';
      setMessages([...history, { role: 'assistant', content: '' }]);
      for await (const chunk of stream) {
        acc += chunk;
        setMessages([...history, { role: 'assistant', content: acc }]);
      }
      if (!acc.trim()) throw new Error('empty');
    } catch (e) {
      const aborted = (e as Error)?.message === 'aborted';
      setMessages((m) => m.filter((x) => x.content !== ''));
      if (!aborted) setErr('AI providers are busy — try again in a moment. Your character and chat are safe.');
    } finally {
      setThinking(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function share() {
    if (!active) return;
    const url = shareUrl(active, location.origin);
    try {
      await navigator.clipboard.writeText(url);
      flash('Share link copied to clipboard');
    } catch {
      prompt('Copy this share link:', url);
    }
  }

  async function del(id: string) {
    await removeOne(id);
    await refresh();
    flash('Character deleted');
  }

  async function doExport() {
    const { downloadBlob } = await import('@chirag127/oz-file');
    downloadBlob(new Blob([await exportJson()], { type: 'application/json' }), 'oriz-personas.json');
  }

  async function onImport(f: File) {
    const { readAsText } = await import('@chirag127/oz-file');
    try {
      const n = await importJson(await readAsText(f));
      await refresh();
      flash(`Imported ${n} character${n === 1 ? '' : 's'}`);
    } catch {
      flash('Import failed — invalid file');
    }
  }

  const list = saved.length ? saved : PRESETS;

  return (
    <div className="studio">
      {toast && <div className="toast" role="status">{toast}</div>}

      {view === 'gallery' && (
        <section aria-label="Character gallery">
          <div className="bar">
            <h2 className="h">{saved.length ? 'Your characters' : 'Try a starter character'}</h2>
            <div className="bar__actions">
              <button className="pbtn pbtn--primary" style={{ padding: '.55rem 1.1rem' }} onClick={startNew}>+ New character</button>
              {saved.length > 0 && <button className="pbtn pbtn--ghost" style={{ padding: '.5rem .9rem' }} onClick={doExport}>Export</button>}
              <button className="pbtn pbtn--ghost" style={{ padding: '.5rem .9rem' }} onClick={() => fileRef.current?.click()}>Import</button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            </div>
          </div>
          {!saved.length && <p className="muted">These are examples. Chat with one, or hit <b>New character</b> to build your own — everything stays in your browser.</p>}
          <div className="grid">
            {list.map((p) => (
              <article key={p.id} className="pcard">
                <div className="pcard__inner ccard">
                  <div className="ccard__top" style={{ background: `linear-gradient(135deg, ${p.accent}, #22d3ee)` }}>
                    <Avatar p={p} size={58} />
                  </div>
                  <div className="ccard__body">
                    <h3 className="ccard__name">{p.name}</h3>
                    <p className="ccard__tag">{p.tagline || '—'}</p>
                    <div className="ccard__traits">
                      {p.traits.slice(0, 4).map((t) => <span key={t} className="chip">{t}</span>)}
                    </div>
                  </div>
                  <div className="ccard__foot">
                    <button className="pbtn pbtn--primary" style={{ padding: '.45rem 1rem', flex: 1 }} onClick={() => openChat(p)}>Chat</button>
                    <button className="pbtn pbtn--ghost" style={{ padding: '.4rem .7rem' }} onClick={() => editExisting(p)} aria-label={`Edit ${p.name}`}>✏️</button>
                    {saved.length > 0 && <button className="pbtn pbtn--ghost" style={{ padding: '.4rem .7rem' }} onClick={() => del(p.id)} aria-label={`Delete ${p.name}`}>🗑️</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {view === 'edit' && draft && (
        <section className="editor" aria-label="Character editor">
          <div className="bar">
            <button className="pbtn pbtn--ghost" style={{ padding: '.4rem .9rem' }} onClick={() => setView('gallery')}>← Back</button>
            <h2 className="h">{draft.name ? `Editing ${draft.name}` : 'New character'}</h2>
          </div>
          <div className="editor__grid">
            <label className="lbl">Name
              <input className="field" value={draft.name} maxLength={60} placeholder="e.g. Vera Sable" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="lbl">Concept / tagline
              <input className="field" value={draft.tagline} placeholder="razor-sharp noir detective" onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
            </label>
            <label className="lbl">Voice / tone
              <select className="field" value={draft.voice} onChange={(e) => setDraft({ ...draft, voice: e.target.value })}>
                {VOICES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <div className="lbl">Card colour
              <div className="swatches">
                {ACCENTS.map((c) => (
                  <button key={c} className={`swatch${draft.accent === c ? ' swatch--on' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, accent: c })} aria-label={`Colour ${c}`} />
                ))}
              </div>
            </div>
            <div className="lbl lbl--full">Traits
              <div className="traitrow">
                <input className="field" value={traitInput} placeholder="add a trait, press Enter" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrait())} onChange={(e) => setTraitInput(e.target.value)} />
                <button className="pbtn pbtn--ghost" style={{ padding: '.5rem .9rem' }} onClick={addTrait}>Add</button>
              </div>
              <div className="ccard__traits">
                {draft.traits.map((t) => (
                  <button key={t} className="chip" onClick={() => setDraft({ ...draft, traits: draft.traits.filter((x) => x !== t) })}>{t} ✕</button>
                ))}
              </div>
            </div>
            <label className="lbl lbl--full">Opening line (greeting)
              <textarea className="field" rows={2} value={draft.greeting} placeholder="*lights a cigarette* Sit down. Talk." onChange={(e) => setDraft({ ...draft, greeting: e.target.value })} />
            </label>
            <label className="lbl lbl--full">Scene / setting
              <input className="field" value={draft.scenario} placeholder="A dim office above a jazz bar, 1947." onChange={(e) => setDraft({ ...draft, scenario: e.target.value })} />
            </label>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="editor__foot">
            <button className="pbtn pbtn--primary" style={{ padding: '.6rem 1.4rem' }} onClick={saveDraft}>Save & chat</button>
          </div>
        </section>
      )}

      {view === 'chat' && active && (
        <section className="chat" aria-label={`Chat with ${active.name}`}>
          <header className="chat__head pcard">
            <div className="pcard__inner chat__headinner">
              <button className="pbtn pbtn--ghost" style={{ padding: '.35rem .7rem' }} onClick={() => { stop(); setView('gallery'); }}>←</button>
              <Avatar p={active} size={40} />
              <div className="chat__who">
                <b>{active.name}</b>
                <span className="muted">{active.tagline}</span>
              </div>
              <div className="chat__headbtns">
                <button className="pbtn pbtn--ghost" style={{ padding: '.35rem .8rem' }} onClick={share}>Share</button>
                <button className="pbtn pbtn--ghost" style={{ padding: '.35rem .8rem' }} onClick={() => setMessages(active.greeting ? [{ role: 'assistant', content: active.greeting }] : [])}>Restart</button>
              </div>
            </div>
          </header>

          <div className="chat__log" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble bubble--${m.role === 'user' ? 'me' : 'them'}`}>{m.content}</div>
            ))}
            {thinking && (
              <div className="bubble bubble--them dots" aria-label={`${active.name} is typing`}><span></span><span></span><span></span></div>
            )}
            {err && <p className="err" role="alert">{err}</p>}
          </div>

          <form className="chat__input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              className="field"
              rows={1}
              value={input}
              placeholder={`Message ${active.name}…`}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            {thinking
              ? <button type="button" className="pbtn pbtn--ghost" style={{ padding: '.6rem 1rem' }} onClick={stop}>Stop</button>
              : <button type="submit" className="pbtn pbtn--primary" style={{ padding: '.6rem 1.2rem' }} disabled={!input.trim()}>Send</button>}
          </form>
        </section>
      )}
    </div>
  );
}
