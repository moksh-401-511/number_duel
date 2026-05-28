import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import type { Difficulty } from '../../utils/api';

interface HomeScreenProps {
  user: any;
  playerName: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onCreateRoom: (difficulty: Difficulty) => void;
  onJoinRoom: () => void;
  onMatchmaking: (difficulty: Difficulty) => void;
}

interface FeedbackState {
  rating: number;
  hovered: number;
  comment: string;
  submitted: boolean;
}

export function HomeScreen({
  user,
  playerName,
  onSignIn,
  onSignOut,
  onCreateRoom,
  onJoinRoom,
  onMatchmaking,
}: HomeScreenProps) {
  const [joinCode, setJoinCode] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>({
    rating: 0,
    hovered: 0,
    comment: '',
    submitted: false,
  });

  const handleJoin = () => {
    if (joinCode.trim().length >= 4) onJoinRoom();
  };

  const handleFeedbackSubmit = () => {
    if (feedback.rating === 0) return;
    setFeedback(f => ({ ...f, submitted: true }));
  };

  const ratingLabels = ['', 'Meh 😐', 'Okay 🙂', 'Good 😊', 'Great 🤩', 'Addicted! 🔥'];

  return (
    <div
      style={{
        background: 'var(--cream)',
        minHeight: '100vh',
        fontFamily: 'var(--ff-display)',
        color: 'var(--ink)',
        overflowX: 'hidden',
      }}
    >
      {/* ── Nav ── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '2.5px solid var(--ink)',
          background: 'var(--cream)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🎯 <span style={{ color: 'var(--orange)' }}>Number</span> Duel
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {user ? (
            <>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.75rem', color: '#666' }}>
                👋 {playerName}
              </span>
              <button
                className="nd-btn nd-btn-ghost nd-btn-sm"
                onClick={onSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <button className="nd-btn nd-btn-ghost nd-btn-sm" onClick={onSignIn}>Log in</button>
              <button className="nd-btn nd-btn-ink nd-btn-sm" onClick={onSignIn}>Sign up</button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div
        style={{
          position: 'relative',
          padding: '3rem 1.5rem 2.5rem',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Blobs */}
        {[
          { bg: 'var(--orange)', style: { width: 340, height: 340, top: -80, left: -100, animationDuration: '8s' } },
          { bg: 'var(--teal)',   style: { width: 280, height: 280, bottom: -60, right: -80, animationDuration: '10s', animationDirection: 'reverse' as const } },
          { bg: 'var(--pink)',   style: { width: 200, height: 200, top: 60, right: '10%', animationDuration: '7s', animationDelay: '2s' } },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              filter: 'blur(40px)',
              opacity: 0.18,
              pointerEvents: 'none',
              background: b.bg,
              animation: `drift ${b.style.animationDuration || '8s'} ease-in-out infinite`,
              animationDelay: (b.style as any).animationDelay || '0s',
              animationDirection: (b.style as any).animationDirection || 'normal',
              ...b.style,
            }}
          />
        ))}

        {/* Floating digits */}
        {[
          { d: '4', left: '8%', top: '60%', delay: '0s', dur: '5s' },
          { d: '7', left: '15%', top: '40%', delay: '1.5s', dur: '7s' },
          { d: '2', right: '12%', top: '55%', delay: '0.8s', dur: '6s' },
          { d: '9', right: '20%', top: '35%', delay: '2.2s', dur: '4.5s' },
          { d: '1', left: '30%', top: '70%', delay: '3s', dur: '5.5s' },
        ].map((f, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              fontFamily: 'var(--ff-mono)',
              fontSize: '1.1rem',
              fontWeight: 700,
              opacity: 0.12,
              pointerEvents: 'none',
              animation: `floatUp ${f.dur} linear infinite`,
              animationDelay: f.delay,
              left: f.left,
              right: (f as any).right,
              top: f.top,
            }}
          >
            {f.d}
          </div>
        ))}

        {/* Eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--ff-mono)',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--orange)',
            background: 'rgba(255,107,53,0.1)',
            border: '1.5px solid var(--orange)',
            borderRadius: 20,
            padding: '0.3rem 0.9rem',
            marginBottom: '1rem',
            animation: 'fadeUp 0.6s ease both',
          }}
        >
          <span style={{ animation: 'blink 1.2s step-end infinite' }}>●</span>
          LIVE NOW · 2-PLAYER MIND GAME
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            position: 'relative',
            animation: 'fadeUp 0.6s ease 0.1s both',
            marginBottom: 0,
          }}
        >
          <span style={{ display: 'block', color: 'var(--ink)' }}>NUMBER</span>
          <span
            style={{
              display: 'block',
              color: 'var(--orange)',
              position: 'relative',
              WebkitTextStroke: '0',
            }}
          >
            DUEL
            <span
              aria-hidden
              style={{
                content: 'DUEL',
                position: 'absolute',
                inset: 0,
                color: 'transparent',
                WebkitTextStroke: '3px var(--ink)',
                transform: 'translate(5px, 5px)',
                zIndex: -1,
                display: 'block',
              }}
            >
              DUEL
            </span>
          </span>
        </h1>

        <p
          style={{
            fontSize: '1rem',
            color: '#555',
            maxWidth: 460,
            margin: '1rem auto 1.75rem',
            lineHeight: 1.5,
            animation: 'fadeUp 0.6s ease 0.2s both',
          }}
        >
          Pick a secret number. Crack your opponent's before they crack yours. Every guess reveals a clue.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            animation: 'fadeUp 0.6s ease 0.3s both',
          }}
        >
          <button className="nd-btn nd-btn-orange nd-btn-lg" onClick={() => onMatchmaking(4)}>
            ⚡ Play Now
          </button>
          <button
            className="nd-btn nd-btn-yellow nd-btn-lg"
            onClick={() => document.getElementById('quick-match')?.scrollIntoView({ behavior: 'smooth' })}
          >
            🎮 Choose Mode
          </button>
        </div>
      </div>

      {/* ── Sections wrapper ── */}
      <div style={{ padding: '0 1.5rem', maxWidth: 900, margin: '0 auto' }}>

        {/* ── Sign in banner (if not logged in) ── */}
        {!user && (
          <div
            style={{
              background: 'rgba(255,107,53,0.06)',
              border: '2.5px solid var(--ink)',
              borderRadius: 16,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              boxShadow: '3px 3px 0 var(--ink)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Track your wins 🏆</div>
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>Sign in with Google to save stats</div>
            </div>
            <button className="nd-btn nd-btn-ink nd-btn-sm" onClick={onSignIn} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <LogIn size={14} /> Sign In
            </button>
          </div>
        )}

        {/* ── Quick Match ── */}
        <div id="quick-match" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          ⚡ Quick Match
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            marginBottom: '2.5rem',
          }}
        >
          {[
            { digits: 3, label: 'Easy', desc: '3-digit numbers. Great for beginners.', sub: '~5 min · 720 combos', bg: '#E8FFF5', badgeBg: 'var(--green)', badgeColor: '#fff' },
            { digits: 4, label: 'Medium', desc: 'Classic 4-digit mode. Perfect challenge.', sub: '~10 min · 5040 combos', bg: '#FFF8E1', badgeBg: 'var(--yellow)', badgeColor: 'var(--ink)' },
            { digits: 5, label: 'Hard', desc: '5-digit brutality. For masochists.', sub: '~20 min · 30240 combos', bg: '#FFF0F0', badgeBg: 'var(--red)', badgeColor: '#fff' },
          ].map(card => (
            <DiffCard key={card.digits} {...card} onClick={() => onMatchmaking(card.digits as Difficulty)} />
          ))}
        </div>

        {/* ── Create or Join ── */}
        <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          🚪 Create or Join a Room
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Create */}
          <div
            className="nd-btn"
            onClick={() => onCreateRoom(4)}
            style={{
              background: 'var(--orange)',
              color: '#fff',
              borderRadius: 20,
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              cursor: 'pointer',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏠</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem', color: '#fff' }}>Create Room</h3>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              Start a private room and share the code with a friend.
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
              {['3 digits', '4 digits', '5 digits'].map(t => (
                <span
                  key={t}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 7,
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Join */}
          <div
            style={{
              background: 'var(--yellow)',
              border: '2.5px solid var(--ink)',
              borderRadius: 20,
              padding: '1.4rem',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🔑</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>Join a Room</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.4, marginBottom: '0.75rem' }}>
              Have a code from a friend? Jump straight in.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="ABC123"
                maxLength={6}
                style={{
                  flex: 1,
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  padding: '0.55rem 0.8rem',
                  border: '2.5px solid var(--ink)',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.55)',
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
              <button className="nd-btn nd-btn-ink nd-btn-sm" onClick={handleJoin}>
                Join →
              </button>
            </div>
          </div>
        </div>

        {/* ── How to Play ── */}
        <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          📖 How to Play
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {[
            { step: '01', title: 'Pick a Secret', body: 'Choose a number with no repeated digits. Only you can see it.' },
            { step: '02', title: 'Take Turns Guessing', body: 'Alternate guesses with your opponent. 30 seconds per turn.' },
            { step: '03', title: 'Read the Clues', body: 'After each guess you learn how many digits and positions are correct.' },
            { step: '04', title: 'First to Crack Wins', body: 'Guess all digits in the exact right positions to win!' },
          ].map(s => (
            <div
              key={s.step}
              style={{
                padding: '1.1rem',
                borderRadius: 16,
                border: '2.5px solid var(--ink)',
                boxShadow: '3px 3px 0 var(--ink)',
                background: 'var(--card-bg)',
              }}
            >
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--orange)', marginBottom: '0.4rem' }}>
                STEP {s.step}
              </div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>{s.title}</h4>
              <p style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.4, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>

        {/* Example */}
        <div
          className="nd-card"
          style={{ padding: '1.2rem', marginBottom: '3rem' }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>🔍 Example Round</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              flexWrap: 'wrap',
              fontFamily: 'var(--ff-mono)',
              fontSize: '0.82rem',
            }}
          >
            <span>Secret: <strong>5731</strong></span>
            <span style={{ color: '#aaa' }}>→</span>
            <span>Guess: <strong>5178</strong></span>
            <span style={{ color: '#aaa' }}>→</span>
            <span style={{ background: 'rgba(0,194,168,0.1)', border: '1.5px solid var(--teal)', color: '#007a6b', padding: '0.2rem 0.55rem', borderRadius: 6 }}>
              3 digits ✓
            </span>
            <span style={{ background: 'rgba(255,210,63,0.15)', border: '1.5px solid #d4a600', color: '#8a6800', padding: '0.2rem 0.55rem', borderRadius: 6 }}>
              1 position ✓
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.55rem', lineHeight: 1.5 }}>
            5, 1 and 7 exist in the secret. Only 5 is in the correct position (index 0).
          </p>
        </div>

        {/* ── Feedback & Rating ── */}
        <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          💬 Feedback & Rating
        </div>

        <div
          className="nd-card"
          style={{ padding: '1.5rem', marginBottom: '4rem' }}
        >
          {feedback.submitted ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.25rem' }}>Thanks for the feedback!</div>
              <div style={{ color: '#666', fontSize: '0.85rem' }}>It means a lot to us. Happy dueling!</div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Enjoying Number Duel? Rate your experience and share a thought — it helps us improve!
              </p>

              {/* Star Rating */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', fontWeight: 700, color: '#999', letterSpacing: '0.06em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Your Rating
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setFeedback(f => ({ ...f, rating: star }))}
                      onMouseEnter={() => setFeedback(f => ({ ...f, hovered: star }))}
                      onMouseLeave={() => setFeedback(f => ({ ...f, hovered: 0 }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '2rem',
                        padding: '0 0.1rem',
                        transition: 'transform 0.1s',
                        transform: star <= (feedback.hovered || feedback.rating) ? 'scale(1.2)' : 'scale(1)',
                        filter: star <= (feedback.hovered || feedback.rating) ? 'none' : 'grayscale(100%) opacity(0.3)',
                        lineHeight: 1,
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                  {(feedback.hovered || feedback.rating) > 0 && (
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.75rem', color: 'var(--orange)', marginLeft: '0.4rem', fontWeight: 700 }}>
                      {ratingLabels[feedback.hovered || feedback.rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', fontWeight: 700, color: '#999', letterSpacing: '0.06em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Comment (optional)
                </div>
                <textarea
                  value={feedback.comment}
                  onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))}
                  placeholder="What do you love? What could be better?"
                  rows={3}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--ff-display)',
                    fontSize: '0.9rem',
                    padding: '0.65rem 0.85rem',
                    border: '2.5px solid var(--ink)',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.7)',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                    transition: 'box-shadow 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.boxShadow = '3px 3px 0 var(--ink)'; }}
                  onBlur={e => { e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                className="nd-btn nd-btn-orange nd-btn-full"
                onClick={handleFeedbackSubmit}
                disabled={feedback.rating === 0}
                style={{ justifyContent: 'center' }}
              >
                Submit Feedback ✈
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function DiffCard({
  digits, label, desc, sub, bg, badgeBg, badgeColor, onClick,
}: {
  digits: number; label: string; desc: string; sub: string;
  bg: string; badgeBg: string; badgeColor: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '1.25rem 0.9rem',
        borderRadius: 16,
        border: '2.5px solid var(--ink)',
        boxShadow: 'var(--card-shadow)',
        textAlign: 'center',
        cursor: 'pointer',
        background: bg,
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--ink)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
      }}
    >
      <div
        style={{
          display: 'inline-block',
          fontFamily: 'var(--ff-mono)',
          fontSize: '1.8rem',
          fontWeight: 700,
          width: 52,
          height: 52,
          lineHeight: '52px',
          borderRadius: 14,
          border: '2.5px solid var(--ink)',
          marginBottom: '0.5rem',
          background: badgeBg,
          color: badgeColor,
        }}
      >
        {digits}
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>{label}</h3>
      <p style={{ fontSize: '0.78rem', color: '#666', margin: 0 }}>{desc}</p>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.65rem', color: '#999', marginTop: '0.3rem' }}>{sub}</div>
    </div>
  );
}
