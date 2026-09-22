import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { adminApi, message, useLoad } from './api';

type Motion = {
  id: number;
  text: string;
  sdgNumber: number | null;
  createdAt: string;
};

type Sdg = {
  number: number;
  title: string;
};

type MotionResponse = {
  motions: Motion[];
};

export default function BankMosi() {
  const bank = useLoad<MotionResponse>('/api/admin/motions');
  const sdgs = useLoad<{ sdgs: Sdg[] }>('/api/sdgs');

  const [updated, setUpdated] = useState<Motion[] | null>(null);

  // Form tambah/edit.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [selectedSdg, setSelectedSdg] = useState('');
  const textInput = useRef<HTMLTextAreaElement>(null);

  // Pencarian dan pagination.
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  // Status operasi.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const motions = updated ?? bank.data?.motions ?? [];
  const options = sdgs.data?.sdgs ?? [];

  const ready = Boolean(bank.data && sdgs.data);
  const loading = bank.loading || sdgs.loading;

  const filtered = motions.filter(item => {
    const matchText = item.text
      .toLocaleLowerCase('id-ID')
      .includes(query.trim().toLocaleLowerCase('id-ID'));

    const matchSdg =
      filter === ''
      || (
        filter === 'none'
          ? item.sdgNumber === null
          : item.sdgNumber === Number(filter)
      );

    return matchText && matchSdg;
  });

  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  const sdgsWithMotions = options.filter(sdg =>
    motions.some(item => item.sdgNumber === sdg.number),
  ).length;

  const motionsWithoutSdg = motions.filter(
    item => item.sdgNumber === null,
  ).length;

  function sdgLabel(number: number | null) {
    if (number === null) return 'Tanpa SDG';

    const found = options.find(item => item.number === number);

    return found
      ? `SDG ${number} — ${found.title}`
      : `SDG ${number}`;
  }

  function chooseFilter(value: string) {
    setFilter(value);
    setPage(1);
  }

  function resetForm() {
    setEditingId(null);
    setDraft('');
    setSelectedSdg('');
    setError('');
  }

  function startEdit(item: Motion) {
    if (busy) return;

    setEditingId(item.id);
    setDraft(item.text);
    setSelectedSdg(
      item.sdgNumber === null ? '' : String(item.sdgNumber),
    );

    setError('');
    setNotice('');

    textInput.current?.focus({ preventScroll: true });
    textInput.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  async function saveMotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || !ready || !draft.trim()) return;

    const isEditing = editingId !== null;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await adminApi<MotionResponse>(
        isEditing
          ? `/api/admin/motions/${editingId}`
          : '/api/admin/motions',
        {
          method: isEditing ? 'PATCH' : 'POST',
          body: JSON.stringify({
            text: draft.trim(),
            sdgNumber: selectedSdg ? Number(selectedSdg) : null,
          }),
        },
      );

      setUpdated(result.motions);
      resetForm();

      if (!isEditing) {
        setQuery('');
        setFilter('');
        setPage(1);
      }

      setNotice(
        isEditing
          ? 'Perubahan mosi berhasil disimpan.'
          : 'Mosi berhasil ditambahkan ke bank.',
      );
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteMotion(item: Motion) {
    if (busy) return;

    const confirmed = window.confirm(
      `Hapus mosi berikut dari Bank Mosi?\n\n${item.text}\n\n`
      + 'Mosi yang sudah tersimpan pada profil tim dan riwayat '
      + 'interaksi tetap tersimpan.',
    );

    if (!confirmed) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const result = await adminApi<MotionResponse>(
        `/api/admin/motions/${item.id}`,
        { method: 'DELETE' },
      );

      setUpdated(result.motions);

      if (editingId === item.id) {
        resetForm();
      }

      setNotice('Mosi berhasil dihapus dari bank.');
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="adm-heading">
        <p className="adm-eyebrow">REFERENSI TIM</p>
        <h1>Bank Mosi & SDG</h1>
        <p className="adm-muted">
          Kelola pilihan mosi dan hubungkan dengan tujuan SDG.
        </p>
      </div>

      <p className="adm-inline-note">
        Bank ini digunakan untuk identitas tim. Perubahan mosi di sini
        tidak mengubah profil tim atau riwayat yang sudah tersimpan.
        Pilihan isu pada aktivitas siswa masih dikelola terpisah.
      </p>

      {loading && (
        <p role="status" className="adm-empty">
          Memuat Bank Mosi dan SDG…
        </p>
      )}

      {bank.error && (
        <div className="adm-error" role="alert">
          <p>{bank.error}</p>
          <button type="button" onClick={bank.reload}>
            Muat ulang mosi
          </button>
        </div>
      )}

      {sdgs.error && (
        <div className="adm-error" role="alert">
          <p>{sdgs.error}</p>
          <button type="button" onClick={sdgs.reload}>
            Muat ulang SDG
          </button>
        </div>
      )}

      {ready && (
        <>
          <div className="adm-bank-stats">
            <section className="adm-card">
              <span>Mosi tersedia</span>
              <strong>{motions.length}</strong>
            </section>

            <section className="adm-card">
              <span>SDG memiliki mosi</span>
              <strong>
                {sdgsWithMotions}
                <small> / {options.length}</small>
              </strong>
            </section>

            <section className="adm-card">
              <span>Mosi tanpa SDG</span>
              <strong>{motionsWithoutSdg}</strong>
            </section>
          </div>

          <details className="adm-card adm-bank-sdgs">
            <summary>Lihat daftar SDG dan jumlah mosi</summary>

            <div className="adm-sdg-grid">
              {options.map(sdg => {
                const count = motions.filter(
                  item => item.sdgNumber === sdg.number,
                ).length;

                return (
                  <button
                    key={sdg.number}
                    type="button"
                    aria-pressed={filter === String(sdg.number)}
                    onClick={() => chooseFilter(String(sdg.number))}
                  >
                    <strong>SDG {sdg.number}</strong>
                    <span>{sdg.title}</span>
                    <small>{count} mosi</small>
                  </button>
                );
              })}
            </div>
          </details>

          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <p className="adm-success" role="status">
              {notice}
            </p>
          )}

          <div className="adm-bank-layout">
            <form
              className="adm-card adm-bank-form"
              onSubmit={saveMotion}
            >
              <p className="adm-eyebrow">
                {editingId !== null
                  ? 'PERBARUI REFERENSI'
                  : 'TAMBAH REFERENSI'}
              </p>

              <h2>
                {editingId !== null
                  ? `Edit mosi #${editingId}`
                  : 'Mosi baru'}
              </h2>

              <fieldset disabled={busy}>
                <label htmlFor="motion-text">Teks mosi</label>
                <textarea
                  ref={textInput}
                  id="motion-text"
                  required
                  maxLength={500}
                  rows={5}
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  placeholder="Tuliskan pernyataan yang dapat diperdebatkan."
                />

                <p
                  className="adm-bank-counter"
                  style={{ marginTop: 8 }}
                >
                  {draft.length}/500 karakter
                </p>

                <label htmlFor="motion-sdg">SDG terkait</label>
                <select
                  id="motion-sdg"
                  value={selectedSdg}
                  onChange={event => setSelectedSdg(event.target.value)}
                >
                  <option value="">Tanpa SDG</option>

                  {options.map(sdg => (
                    <option key={sdg.number} value={sdg.number}>
                      SDG {sdg.number} — {sdg.title}
                    </option>
                  ))}
                </select>

                <div className="adm-bank-form-actions">
                  <button
                    type="submit"
                    className="adm-primary"
                    disabled={busy || !draft.trim()}
                  >
                    {busy
                      ? 'Memproses…'
                      : editingId !== null
                        ? 'Simpan perubahan'
                        : '+ Tambahkan mosi'}
                  </button>

                  {editingId !== null && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={resetForm}
                    >
                      Batal edit
                    </button>
                  )}
                </div>
              </fieldset>
            </form>

            <section className="adm-card">
              <div className="adm-section-head">
                <h2>Daftar mosi</h2>
                <span className="adm-tag">
                  {filtered.length} hasil
                </span>
              </div>

              <div className="adm-bank-filters">
                <label>
                  Cari mosi
                  <input
                    type="search"
                    value={query}
                    onChange={event => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari berdasarkan teks…"
                  />
                </label>

                <label>
                  Filter SDG
                  <select
                    value={filter}
                    onChange={event => chooseFilter(event.target.value)}
                  >
                    <option value="">Semua SDG</option>
                    <option value="none">Tanpa SDG</option>

                    {options.map(sdg => (
                      <option key={sdg.number} value={sdg.number}>
                        SDG {sdg.number} — {sdg.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {(query || filter) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    chooseFilter('');
                  }}
                >
                  Reset filter
                </button>
              )}

              {visible.length === 0 ? (
                <p className="adm-empty">
                  {motions.length
                    ? 'Tidak ada mosi yang sesuai dengan pencarian.'
                    : 'Belum ada mosi. Tambahkan melalui form di atas.'}
                </p>
              ) : (
                <div className="adm-table-wrap adm-motion-table-wrap" role="region"
                  aria-label="Daftar mosi yang dapat digulir"
                  tabIndex={0}>
                  <table className="adm-motion-table">
                    <caption className="adm-sr-only">
                      Daftar mosi, SDG terkait, dan tindakan pengelolaan
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col" className="adm-motion-number">
                          No
                        </th>
                        <th scope="col">Mosi</th>
                        <th scope="col" className="adm-motion-sdg">
                          SDG
                        </th>
                        <th scope="col" className="adm-motion-action-col">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visible.map((item, index) => (
                        <tr
                          key={item.id}
                          className={
                            editingId === item.id ? 'is-editing' : ''
                          }
                        >
                          <td>
                            {(currentPage - 1) * limit + index + 1}
                          </td>

                          <td>
                            <p className="adm-motion-text">
                              {item.text}
                            </p>
                            <small>
                              ID #{item.id}
                              {editingId === item.id
                                ? ' · Sedang diedit'
                                : ''}
                            </small>
                          </td>

                          <td>
                            <span className="adm-tag">
                              {sdgLabel(item.sdgNumber)}
                            </span>
                          </td>

                          <td>
                            <div className="adm-motion-table-actions">
                              <button
                                type="button"
                                disabled={busy}
                                aria-label={`Edit mosi nomor ${item.id}`}
                                onClick={() => startEdit(item)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="adm-danger"
                                disabled={busy}
                                aria-label={`Hapus mosi nomor ${item.id}`}
                                onClick={() => deleteMotion(item)}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filtered.length > 0 && (
                <div className="adm-pager">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    ← Sebelumnya
                  </button>

                  <span>
                    Halaman {currentPage} / {totalPages}
                    {' · '}
                    {filtered.length} mosi
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Berikutnya →
                  </button>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}