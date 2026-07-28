'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, X, Star, RefreshCw, Loader2, AlertCircle, ImageIcon, RotateCcw } from 'lucide-react';
import { imageUrl, type ProductImage } from '@/lib/images';

/* ============================================================================
   Product image uploader — select/drag-drop MULTIPLE images at once, with
   instant previews, per-file upload progress, client-side validation, and full
   gallery management (reorder by drag, remove, replace, mark featured).

   The gallery order IS the stored sequence and images[0] is the featured/cover
   image (used by cards, the detail hero, the PDF and sliders). The uploader owns
   an ordered working list of items (uploaded + in-flight) and pushes the
   uploaded images (in order) up via onChange whenever that set changes.
   ========================================================================= */

const ACCEPT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPT_ATTR = 'image/jpeg,image/jpg,image/png,image/webp';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (matches the upload API)
const PRETTY_TYPES = 'JPG, JPEG, PNG or WebP';

type Status = 'done' | 'uploading' | 'error';

interface Item {
  uid: string;
  status: Status;
  image?: ProductImage; // set when done
  preview: string; // objectURL (pending) or resolved URL (done)
  isObjectUrl: boolean;
  file?: File; // kept for pending/error (retry)
  sig?: string; // `${name}:${size}` for duplicate detection
  progress: number; // 0..100
  error?: string;
}

interface Props {
  /** Existing product images (in order). Read once on mount. */
  initialImages: ProductImage[];
  /** Called with the uploaded images (in order) whenever they change. */
  onChange: (images: ProductImage[]) => void;
  /** Notifies the parent while any upload is in flight (to block Save). */
  onUploadingChange?: (uploading: boolean) => void;
}

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);
const sigOf = (f: File) => `${f.name}:${f.size}`;

/** Upload one file with progress via XHR (fetch has no upload-progress event). */
function uploadFile(file: File, onProgress: (pct: number) => void): Promise<ProductImage> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/products/upload');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let data: { image?: ProductImage; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* noop */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.image?.url) resolve(data.image);
      else reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(fd);
  });
}

export default function ProductImageUploader({ initialImages, onChange, onUploadingChange }: Props) {
  const [items, setItems] = useState<Item[]>(() =>
    initialImages.map((img) => ({ uid: uid(), status: 'done' as const, image: img, preview: imageUrl(img.url), isObjectUrl: false, progress: 100 })),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isOver, setIsOver] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceUid = useRef<string | null>(null);

  // Live mirror of items so async callbacks / cleanup read the latest list
  // (updated in an effect — never written during render).
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const patch = useCallback((id: string, next: Partial<Item>) => {
    setItems((list) => list.map((it) => (it.uid === id ? { ...it, ...next } : it)));
  }, []);

  // Push the uploaded images (in order) up to the parent, and report upload
  // state — only when they actually change (avoid churn from progress ticks).
  const lastEmitted = useRef<string>('');
  const lastUploading = useRef<boolean | null>(null);
  useEffect(() => {
    const done = items.filter((it) => it.status === 'done' && it.image).map((it) => it.image as ProductImage);
    const json = JSON.stringify(done);
    if (json !== lastEmitted.current) { lastEmitted.current = json; onChange(done); }
    const uploading = items.some((it) => it.status === 'uploading');
    if (uploading !== lastUploading.current) { lastUploading.current = uploading; onUploadingChange?.(uploading); }
  }, [items, onChange, onUploadingChange]);

  // Revoke any object URLs on unmount.
  useEffect(() => () => { itemsRef.current.forEach((it) => { if (it.isObjectUrl) URL.revokeObjectURL(it.preview); }); }, []);

  const startUpload = useCallback((id: string, file: File) => {
    uploadFile(file, (pct) => patch(id, { progress: pct }))
      .then((image) => {
        setItems((list) => list.map((it) => {
          if (it.uid !== id) return it;
          if (it.isObjectUrl) URL.revokeObjectURL(it.preview);
          return { ...it, status: 'done', image, preview: imageUrl(image.url), isObjectUrl: false, progress: 100, file: undefined, error: undefined };
        }));
      })
      .catch((err: Error) => patch(id, { status: 'error', error: err.message }));
  }, [patch]);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const problems: string[] = [];
    // Signatures already present (pending + uploaded-this-session) — prevents
    // adding the same file twice to one product.
    const existing = new Set(itemsRef.current.map((it) => it.sig).filter(Boolean) as string[]);
    const fresh: Item[] = [];

    files.forEach((file) => {
      const sig = sigOf(file);
      if (!ACCEPT_TYPES.includes(file.type)) { problems.push(`“${file.name}” isn’t a supported format (use ${PRETTY_TYPES}).`); return; }
      if (file.size > MAX_BYTES) { problems.push(`“${file.name}” is larger than 10 MB.`); return; }
      if (existing.has(sig)) { problems.push(`“${file.name}” is already added — duplicates are skipped.`); return; }
      existing.add(sig);
      fresh.push({ uid: uid(), status: 'uploading', preview: URL.createObjectURL(file), isObjectUrl: true, file, sig, progress: 0 });
    });

    setErrors(problems);
    if (fresh.length === 0) return;
    // Preserve selection order by appending in one batch.
    setItems((list) => [...list, ...fresh]);
    fresh.forEach((it) => startUpload(it.uid, it.file as File));
  }, [startUpload]);

  const onBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = ''; // allow re-selecting the same file after removal
  };

  // Replace a single image in place (keeps its position).
  const onReplacePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = replaceUid.current;
    e.target.value = '';
    replaceUid.current = null;
    if (!file || !id) return;
    if (!ACCEPT_TYPES.includes(file.type)) { setErrors([`“${file.name}” isn’t a supported format (use ${PRETTY_TYPES}).`]); return; }
    if (file.size > MAX_BYTES) { setErrors([`“${file.name}” is larger than 10 MB.`]); return; }
    setErrors([]);
    setItems((list) => list.map((it) => {
      if (it.uid !== id) return it;
      if (it.isObjectUrl) URL.revokeObjectURL(it.preview);
      return { ...it, status: 'uploading', preview: URL.createObjectURL(file), isObjectUrl: true, file, sig: sigOf(file), progress: 0, image: undefined, error: undefined };
    }));
    startUpload(id, file);
  };

  const remove = (id: string) => {
    setItems((list) => list.filter((it) => {
      if (it.uid === id && it.isObjectUrl) URL.revokeObjectURL(it.preview);
      return it.uid !== id;
    }));
  };
  const retry = (it: Item) => { if (it.file) { patch(it.uid, { status: 'uploading', progress: 0, error: undefined }); startUpload(it.uid, it.file); } };
  const makeFeatured = (id: string) => setItems((list) => {
    const i = list.findIndex((it) => it.uid === id);
    if (i <= 0) return list;
    const copy = [...list];
    const [moved] = copy.splice(i, 1);
    copy.unshift(moved);
    return copy;
  });

  // ---- drag to reorder (internal) vs OS file drop (external) ----
  const onCellDragStart = (index: number) => (e: React.DragEvent) => { dragIndex.current = index; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/reorder', String(index)); } catch { /* noop */ } };
  const onCellDragOver = (index: number) => (e: React.DragEvent) => { if (dragIndex.current !== null) { e.preventDefault(); setOverIndex(index); } };
  const onCellDrop = (index: number) => (e: React.DragEvent) => {
    if (dragIndex.current === null) return; // let the OS-file drop handler deal with it
    e.preventDefault(); e.stopPropagation();
    const from = dragIndex.current; dragIndex.current = null; setOverIndex(null);
    if (from === index) return;
    setItems((list) => { const copy = [...list]; const [m] = copy.splice(from, 1); copy.splice(index, 0, m); return copy; });
  };
  const onCellDragEnd = () => { dragIndex.current = null; setOverIndex(null); };

  const onZoneDragOver = (e: React.DragEvent) => { if (dragIndex.current === null) { e.preventDefault(); setIsOver(true); } };
  const onZoneDragLeave = (e: React.DragEvent) => { if (e.currentTarget === e.target) setIsOver(false); };
  const onZoneDrop = (e: React.DragEvent) => {
    setIsOver(false);
    if (dragIndex.current !== null) return; // internal reorder handled per-cell
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { e.preventDefault(); addFiles(e.dataTransfer.files); }
  };

  const hasItems = items.length > 0;

  return (
    <div className="piu">
      <input ref={fileInput} type="file" accept={ACCEPT_ATTR} multiple onChange={onBrowse} style={{ display: 'none' }} />
      <input ref={replaceInput} type="file" accept={ACCEPT_ATTR} onChange={onReplacePick} style={{ display: 'none' }} />

      <div
        className={`piu-zone${isOver ? ' is-over' : ''}`}
        onDragOver={onZoneDragOver}
        onDragLeave={onZoneDragLeave}
        onDrop={onZoneDrop}
      >
        {hasItems && (
          <div className="piu-grid">
            {items.map((it, idx) => (
              <div
                key={it.uid}
                className={`piu-cell${idx === 0 ? ' is-featured' : ''}${overIndex === idx ? ' is-drop' : ''}${it.status === 'error' ? ' is-error' : ''}`}
                draggable={it.status !== 'uploading'}
                onDragStart={onCellDragStart(idx)}
                onDragOver={onCellDragOver(idx)}
                onDrop={onCellDrop(idx)}
                onDragEnd={onCellDragEnd}
                title={idx === 0 ? 'Featured image' : 'Drag to reorder'}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.preview} alt="" className="piu-img" draggable={false} />

                {idx === 0 && it.status !== 'error' && (
                  <span className="piu-badge"><Star size={10} fill="currentColor" /> Featured</span>
                )}

                {/* Remove */}
                <button type="button" className="piu-remove" onClick={() => remove(it.uid)} aria-label="Remove image"><X size={12} /></button>

                {/* Uploading overlay + progress */}
                {it.status === 'uploading' && (
                  <div className="piu-overlay">
                    <Loader2 size={18} className="piu-spin" />
                    <div className="piu-pct">{it.progress}%</div>
                    <div className="piu-bar"><span style={{ width: `${it.progress}%` }} /></div>
                  </div>
                )}

                {/* Error overlay */}
                {it.status === 'error' && (
                  <div className="piu-overlay piu-overlay--error">
                    <AlertCircle size={16} />
                    <div className="piu-errtext">Failed</div>
                    <button type="button" className="piu-retry" onClick={() => retry(it)}><RotateCcw size={11} /> Retry</button>
                  </div>
                )}

                {/* Hover actions (done images) */}
                {it.status === 'done' && (
                  <div className="piu-actions">
                    {idx !== 0 && (
                      <button type="button" onClick={() => makeFeatured(it.uid)} aria-label="Set as featured image" title="Set as featured"><Star size={13} /></button>
                    )}
                    <button type="button" onClick={() => { replaceUid.current = it.uid; replaceInput.current?.click(); }} aria-label="Replace image" title="Replace"><RefreshCw size={13} /></button>
                  </div>
                )}
              </div>
            ))}

            {/* Add tile */}
            <button type="button" className="piu-add" onClick={() => fileInput.current?.click()} aria-label="Add images">
              <UploadCloud size={20} />
              <span>Add images</span>
            </button>
          </div>
        )}

        {!hasItems && (
          <button type="button" className="piu-empty" onClick={() => fileInput.current?.click()}>
            <span className="piu-empty-icon"><ImageIcon size={22} /></span>
            <span className="piu-empty-title">Drag &amp; drop images here, or click to browse</span>
            <span className="piu-empty-sub">Select multiple at once · {PRETTY_TYPES} · up to 10 MB each</span>
          </button>
        )}
      </div>

      {hasItems && (
        <p className="piu-hint">The first image is the featured / cover image. Drag to reorder, hover an image to replace or set it as featured.</p>
      )}

      {errors.length > 0 && (
        <div className="piu-errors" role="alert">
          {errors.map((msg, i) => (
            <div key={i} className="piu-err"><AlertCircle size={13} /> <span>{msg}</span></div>
          ))}
          <button type="button" className="piu-err-dismiss" onClick={() => setErrors([])} aria-label="Dismiss">Dismiss</button>
        </div>
      )}

      <style>{`
        .piu { display: flex; flex-direction: column; gap: 10px; }
        .piu-zone { border: 1.5px dashed var(--border-strong); border-radius: var(--radius-md); padding: 14px; transition: border-color .15s, background .15s; }
        .piu-zone.is-over { border-color: var(--accent); background: var(--accent-soft); }
        .piu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
        @media (max-width: 520px) { .piu-grid { grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); } }
        .piu-cell { position: relative; aspect-ratio: 1 / 1; border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden; background: #eef1f4; cursor: grab; }
        .piu-cell:active { cursor: grabbing; }
        .piu-cell.is-featured { border: 2px solid var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
        .piu-cell.is-drop { outline: 2px dashed var(--accent); outline-offset: -2px; }
        .piu-cell.is-error { border-color: var(--hot); }
        .piu-img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; }
        .piu-badge { position: absolute; top: 5px; left: 5px; display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 9.5px; font-weight: 700; z-index: 3; }
        .piu-remove { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%; background: #fff; color: var(--hot); border: 1px solid var(--border-light); box-shadow: var(--shadow-sm); display: grid; place-items: center; cursor: pointer; padding: 0; z-index: 3; }
        .piu-actions { position: absolute; left: 0; right: 0; bottom: 0; display: flex; gap: 6px; justify-content: center; padding: 6px; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.55)); opacity: 0; transition: opacity .15s; z-index: 2; }
        .piu-cell:hover .piu-actions { opacity: 1; }
        .piu-actions button { width: 26px; height: 26px; border-radius: 6px; border: none; background: rgba(255,255,255,0.92); color: var(--text-primary); display: grid; place-items: center; cursor: pointer; }
        .piu-actions button:hover { background: #fff; color: var(--accent); }
        .piu-overlay { position: absolute; inset: 0; background: rgba(17,24,39,0.55); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; z-index: 4; }
        .piu-overlay--error { background: rgba(190,40,30,0.62); }
        .piu-pct { font-size: 12px; font-weight: 700; }
        .piu-bar { position: absolute; left: 8px; right: 8px; bottom: 8px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.35); overflow: hidden; }
        .piu-bar span { display: block; height: 100%; background: #fff; transition: width .2s; }
        .piu-errtext { font-size: 11px; font-weight: 700; }
        .piu-retry { display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; padding: 3px 8px; font-size: 10.5px; font-weight: 700; border-radius: 5px; border: none; background: #fff; color: var(--hot); cursor: pointer; }
        .piu-spin { animation: piu-spin 1s linear infinite; }
        @keyframes piu-spin { to { transform: rotate(360deg); } }
        .piu-add { aspect-ratio: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1.5px dashed var(--border-strong); border-radius: var(--radius-sm); background: var(--bg-surface-2); color: var(--text-muted); font-size: 11.5px; font-weight: 600; cursor: pointer; transition: border-color .15s, color .15s; }
        .piu-add:hover { border-color: var(--accent); color: var(--accent); }
        .piu-empty { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 30px 16px; border: none; background: none; cursor: pointer; color: var(--text-secondary); }
        .piu-empty-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); margin-bottom: 4px; }
        .piu-empty-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
        .piu-empty-sub { font-size: 12px; color: var(--text-muted); }
        .piu-hint { font-size: 11.5px; color: var(--text-muted); }
        .piu-errors { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--hot-soft); border: 1px solid rgba(236,68,51,0.3); }
        .piu-err { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: var(--hot); line-height: 1.4; }
        .piu-err-dismiss { align-self: flex-start; margin-top: 2px; background: none; border: none; color: var(--hot); font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 0; text-decoration: underline; }
      `}</style>
    </div>
  );
}
