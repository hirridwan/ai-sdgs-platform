import type { CSSProperties } from 'react';

type ModeCardProps = {
  number: string;
  title: string;
  description: string;
  buttonText: string;
  path: string;
  accentColor: string;
  accentBackground: string;
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f7f5ff 0%, #f8fbff 100%)',
    padding: '48px 24px',
    color: '#25283b',
  } as CSSProperties,

  container: {
    maxWidth: 1040,
    margin: '0 auto',
  } as CSSProperties,

  hero: {
    textAlign: 'center',
    marginBottom: 40,
  } as CSSProperties,

  badge: {
    display: 'inline-block',
    padding: '7px 12px',
    borderRadius: 999,
    background: 'rgba(108, 92, 231, 0.1)',
    color: '#6c5ce7',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.4,
    marginBottom: 16,
  } as CSSProperties,

  title: {
    margin: '0 auto 14px',
    maxWidth: 760,
    fontSize: 'clamp(34px, 5vw, 56px)',
    lineHeight: 1.08,
    fontWeight: 800,
    letterSpacing: -1.2,
  } as CSSProperties,

  subtitle: {
    margin: '0 auto',
    maxWidth: 720,
    color: '#6f7488',
    fontSize: 17,
    lineHeight: 1.7,
  } as CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 22,
  } as CSSProperties,

  card: {
    border: '1px solid rgba(108, 92, 231, 0.16)',
    borderRadius: 24,
    background: '#ffffff',
    padding: 28,
    boxShadow: '0 14px 40px rgba(30, 32, 50, 0.08)',
    textAlign: 'left',
  } as CSSProperties,

  numberBox: (background: string, color: string): CSSProperties => ({
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background,
    color,
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 20,
  }),

  cardTitle: {
    margin: '0 0 10px',
    fontSize: 24,
    lineHeight: 1.2,
  } as CSSProperties,

  cardDescription: {
    margin: '0 0 22px',
    color: '#70758b',
    lineHeight: 1.7,
  } as CSSProperties,

  button: (background: string): CSSProperties => ({
    width: '100%',
    border: 0,
    borderRadius: 14,
    padding: '13px 18px',
    background,
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
  }),

  footerNote: {
    margin: '28px auto 0',
    maxWidth: 760,
    textAlign: 'center',
    color: '#8b8fa1',
    fontSize: 13,
    lineHeight: 1.6,
  } as CSSProperties,
};

function ModeCard({
  number,
  title,
  description,
  buttonText,
  path,
  accentColor,
  accentBackground,
}: ModeCardProps) {
  const goTo = () => {
    window.location.href = path;
  };

  return (
    <article style={styles.card}>
      <div style={styles.numberBox(accentBackground, accentColor)}>
        {number}
      </div>

      <h2 style={styles.cardTitle}>{title}</h2>

      <p style={styles.cardDescription}>{description}</p>

      <button
        type="button"
        onClick={goTo}
        style={styles.button(accentColor)}
      >
        {buttonText}
      </button>
    </article>
  );
}

export default function Home() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* Hero / Header */}
        <section style={styles.hero}>
          <div style={styles.badge}>AI × SDGs Platform</div>

          <h1 style={styles.title}>
            Pilih mode pembelajaran
          </h1>

          <p style={styles.subtitle}>
            Pilih pendekatan yang akan digunakan untuk mengeksplorasi isu,
            melakukan fact check, menyusun argumen, dan mempersiapkan debat.
          </p>
        </section>

        {/* Mode Selection */}
        <section style={styles.grid}>
          <ModeCard
            number="01"
            title="Source Pack"
            description="Gunakan sumber yang telah disiapkan sebagai basis eksplorasi, fact check, dan penyusunan argumen."
            buttonText="Masuk Source Pack"
            path="/source-pack"
            accentColor="#6c5ce7"
            accentBackground="rgba(108, 92, 231, 0.1)"
          />

          <ModeCard
            number="02"
            title="AI + Web Search"
            description="Gunakan Gemini dengan Google Search untuk eksplorasi dan fact check berbasis informasi web terbaru."
            buttonText="Masuk AI + Web Search"
            path="/ai"
            accentColor="#2563eb"
            accentBackground="rgba(59, 130, 246, 0.1)"
          />
        </section>

        {/* Footer Note */}
        <p style={styles.footerNote}>
          AI digunakan sebagai alat bantu eksplorasi, pemeriksaan, dan
          persiapan. Debat resmi tetap dilakukan oleh siswa PRO dan KONTRA.
        </p>
      </div>
    </main>
  );
}