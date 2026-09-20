import type { CSSProperties } from 'react';

const cardStyle: CSSProperties = {
  border: '1px solid rgba(108, 92, 231, 0.16)',
  borderRadius: 24,
  background: '#ffffff',
  padding: 28,
  boxShadow: '0 14px 40px rgba(30, 32, 50, 0.08)',
  textAlign: 'left',
};

export default function Home() {
  const goTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f7f5ff 0%, #f8fbff 100%)',
        padding: '48px 24px',
        color: '#25283b',
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: '0 auto',
        }}
      >
        <section style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '7px 12px',
              borderRadius: 999,
              background: 'rgba(108, 92, 231, 0.1)',
              color: '#6c5ce7',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.4,
              marginBottom: 16,
            }}
          >
            AI × SDGs Platform
          </div>

          <h1
            style={{
              margin: '0 auto 14px',
              maxWidth: 760,
              fontSize: 'clamp(34px, 5vw, 56px)',
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: -1.2,
            }}
          >
            Pilih mode pembelajaran
          </h1>

          <p
            style={{
              margin: '0 auto',
              maxWidth: 720,
              color: '#6f7488',
              fontSize: 17,
              lineHeight: 1.7,
            }}
          >
            Pilih pendekatan yang akan digunakan untuk mengeksplorasi isu,
            melakukan fact check, menyusun argumen, dan mempersiapkan debat.
          </p>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 22,
          }}
        >
          <article style={cardStyle}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(108, 92, 231, 0.1)',
                color: '#6c5ce7',
                fontSize: 22,
                fontWeight: 800,
                marginBottom: 20,
              }}
            >
              01
            </div>

            <h2 style={{ margin: '0 0 10px', fontSize: 24, lineHeight: 1.2 }}>
              Source Pack
            </h2>
            <p style={{ margin: '0 0 22px', color: '#70758b', lineHeight: 1.7 }}>
              Gunakan sumber yang telah disiapkan sebagai basis eksplorasi,
              fact check, dan penyusunan argumen.
            </p>

            <button
              type="button"
              onClick={() => goTo('/source-pack')}
              style={{
                width: '100%',
                border: 0,
                borderRadius: 14,
                padding: '13px 18px',
                background: '#6c5ce7',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Masuk Source Pack
            </button>
          </article>

          <article style={cardStyle}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                fontSize: 22,
                fontWeight: 800,
                marginBottom: 20,
              }}
            >
              02
            </div>

            <h2 style={{ margin: '0 0 10px', fontSize: 24, lineHeight: 1.2 }}>
              AI + Web Search
            </h2>
            <p style={{ margin: '0 0 22px', color: '#70758b', lineHeight: 1.7 }}>
              Gunakan Gemini dengan Google Search untuk eksplorasi dan fact
              check berbasis informasi web terbaru.
            </p>

            <button
              type="button"
              onClick={() => goTo('/ai')}
              style={{
                width: '100%',
                border: 0,
                borderRadius: 14,
                padding: '13px 18px',
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Masuk AI + Web Search
            </button>
          </article>
        </section>

        <p
          style={{
            margin: '28px auto 0',
            maxWidth: 760,
            textAlign: 'center',
            color: '#8b8fa1',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          AI digunakan sebagai alat bantu eksplorasi, pemeriksaan, dan persiapan.
          Debat resmi tetap dilakukan oleh siswa PRO dan KONTRA.
        </p>
      </div>
    </main>
  );
}
