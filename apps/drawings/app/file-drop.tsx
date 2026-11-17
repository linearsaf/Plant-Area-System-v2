'use client';
import { useState, type Ref } from 'react';
import { Icon } from '@plant/ui';

/**
 * Pemilih file berbahasa produk. Input asli tetap menutupi seluruh area, sehingga klik, keyboard,
 * pembaca layar dan drop berkas memakai perilaku browser; komponen ini hanya mengatur tampilannya.
 */
export function FileDrop({
  label,
  hint,
  accept,
  multiple,
  disabled,
  inputRef,
  onFiles,
}: {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onFiles: (files: FileList | null) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      className={`file-drop${over ? ' is-over' : ''}${disabled ? ' is-disabled' : ''}`}
      onDragEnter={() => !disabled && setOver(true)}
      onDragLeave={() => setOver(false)}
      onDrop={() => setOver(false)}
    >
      <Icon name="upload" />
      <strong>{label}</strong>
      <small>{hint}</small>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          // Kosongkan agar memilih file yang sama lagi (mis. setelah gagal) tetap memicu unggah.
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </label>
  );
}
