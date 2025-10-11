import { useMemo, useRef, useState, useEffect } from "react";
import "./css/message.css";

// Museo SVG Icons
const IconSearch = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconAttach = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconSend = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconMenu = ({ className = "msg-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
    <circle cx="12" cy="5" r="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
    <circle cx="12" cy="19" r="1" stroke="currentColor" strokeWidth="2" fill="currentColor" />
  </svg>
);

// Demo avatars (replace with real)
const AV = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/2ooze2k90v5e1.jpeg";
const ME = "https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/pics/images%20(6).jpg";

// People list
const PEOPLE = [
  { id: "jmg", name: "James Morgan McGill", note: "Garfield po", avatar: AV },
  { id: "nd", name: "Natsuki Deguchi", note: "Halo", avatar: AV },
  { id: "psh", name: "Park Shin Hye", note: "Musta u tutuy", avatar: AV },
  { id: "nahyun", name: "Nahyun world", note: "Hello", avatar: AV },
  { id: "gs", name: "Gintoki Sakata", note: "Meron ba tao diyan?", avatar: AV },
  { id: "st", name: "Shinsuke Takasugi", note: "Who u?", avatar: AV },
  { id: "mm", name: "Mae Manila", note: "Busy?", avatar: AV },
  { id: "sk", name: "Sofia Kurfunina", note: "Are u okay?", avatar: AV },
  { id: "ad", name: "Alexandra Daddario", note: "Notice me senpai", avatar: AV },
  { id: "ms", name: "Myrna Sanchez", note: "pa commission hehe", avatar: AV },
  { id: "gy", name: "Gasai Yuno", note: "Hi", avatar: AV }
];

// Seed messages
const SEED = [
  { id: 1, at: "7:31 pm", from: "them", text: "Pwede po ba pacommsion" },
  { id: 2, at: "7:34 pm", from: "me", text: "Pwede naman, Ano gusto u?" },
  { id: 3, at: "7:36 pm", from: "them", text: "Pa paint po" },
  { id: 4, at: "7:39 pm", from: "me", text: "Magkano budget mo tutuy?" },
  { id: 5, at: "7:42 pm", from: "them", text: "1500 po" },
  { id: 6, at: "8:42 pm", from: "me", text: "Okay?" }
];

export default function Message() {
  // Correct defaults so the thread always renders
  const FIRST_ID = PEOPLE?.id || "jmg";

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(FIRST_ID);
  const [threads, setThreads] = useState({ [FIRST_ID]: SEED });
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);

  // Filter left list by name or note
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PEOPLE;
    return PEOPLE.filter(p => p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q));
  }, [query]);

  const activePerson = PEOPLE.find(p => p.id === active) || PEOPLE;
  const msgs = threads[active] || [];

  // Scroll to bottom on conversation or new message
  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [active, msgs.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
    setThreads(t => {
      const curr = t[active] || [];
      return { ...t, [active]: [...curr, { id: Date.now(), at: time, from: "me", text }] };
    });
    setDraft("");
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="msgPage">
      <div className="msgWrap">
        {/* Sidebar */}
        <aside className="msgSide">
          <div className="msgSideHead">
            <h2 className="msg-title">Messages</h2>
          </div>
          <div className="msgSearch">
            <IconSearch className="msgSearchIcon" />
            <input
              className="msgSearchInput"
              placeholder="Search Messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="msgList">
            {filtered.map(p => (
              <a
                key={p.id}
                className={`msgItem ${p.id === active ? "is-active" : ""}`}
                onClick={() => setActive(p.id)}
                role="button"
                tabIndex={0}
              >
                <img className="msgAvatar" src={p.avatar} alt="" />
                <div className="msgMeta">
                  <div className="msgName">{p.name}</div>
                  <div className="msgNote">{p.note}</div>
                </div>
              </a>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <main className="msgMain">
          <header className="msgHead">
            <div className="msgPeer">
              <img className="msgAvatar msgAvatar--lg" src={activePerson.avatar} alt="" />
              <div className="msgPeerName">{activePerson.name}</div>
            </div>
            <a className="msgHeadDots" aria-label="Menu" role="button" tabIndex={0}>
              <IconMenu className="msg-icon" />
            </a>
          </header>

          <section className="msgBody">
            {msgs.map(m => (
              <article key={m.id} className={`bubbleRow ${m.from === "me" ? "from-me" : "from-them"}`}>
                {m.from === "them" && <img className="bubbleAvatar" src={activePerson.avatar} alt="" />}
                <div className={`bubble ${m.from === "me" ? "bubble--me" : "bubble--them"}`}>
                  <p className="bubbleText">{m.text}</p>
                  <div className="bubbleTime">{m.at}</div>
                </div>
                {m.from === "me" && <img className="bubbleAvatar" src={ME} alt="" />}
              </article>
            ))}
            <div ref={endRef} />
          </section>

          {/* Composer */}
          <footer className="msgCompose">
            <a className="mcBtn" aria-label="Attach" role="button" tabIndex={0}>
              <IconAttach className="msg-icon" />
            </a>
            <textarea
              className="mcInput"
              placeholder="Write a message..."
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
            />
            <a className="mcSend" onClick={send} aria-label="Send" role="button" tabIndex={0}>
              <IconSend className="msg-icon" />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
