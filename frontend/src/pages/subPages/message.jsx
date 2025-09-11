import { useMemo, useRef, useState, useEffect } from "react";
import "./css/message.css";

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
          <div className="msgSideHead">Messages</div>
          <div className="msgSearch">
            <span className="msgSearchIcon">🔍</span>
            <input
              className="msgSearchInput"
              placeholder="Search Messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="msgList">
            {filtered.map(p => (
              <button
                key={p.id}
                className={`msgItem ${p.id === active ? "is-active" : ""}`}
                onClick={() => setActive(p.id)}
              >
                <img className="msgAvatar" src={p.avatar} alt="" />
                <div className="msgMeta">
                  <div className="msgName">{p.name}</div>
                  <div className="msgNote">{p.note}</div>
                </div>
              </button>
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
            <button className="msgHeadDots" aria-label="Menu">⋯</button>
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
            <button className="mcBtn" aria-label="Attach">▦</button>
            <textarea
              className="mcInput"
              placeholder="Write a message..."
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="mcSend" onClick={send} aria-label="Send">➤</button>
          </footer>
        </main>
      </div>
    </div>
  );
}
