"use client";

import { useEffect, useRef, useState } from "react";

export function MenuPhotoField({
  image,
  disabled,
}: {
  image: string;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const source = preview || (removed ? "" : image);
  return (
    <div className="field menu-photo-field">
      <label htmlFor="menu-photo">Menu photo</label>
      <small id="menu-photo-help">
        Choose a photo from your phone or computer. JPG, PNG or WebP, up to 10
        MB. Your photo uploads when you save the item.
      </small>
      <input type="hidden" name="image" value={removed ? "" : image} />
      <input
        ref={inputRef}
        id="menu-photo"
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        aria-describedby="menu-photo-help menu-photo-error"
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0] || null;
          const message =
            selected && selected.size > 10 * 1024 * 1024
              ? "Choose a photo smaller than 10 MB."
              : selected &&
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    selected.type,
                  )
                ? "Choose a JPG, PNG or WebP photo."
                : "";
          event.currentTarget.setCustomValidity(message);
          setError(message);
          setFile(message ? null : selected);
        }}
      />
      <span id="menu-photo-error" role={error ? "alert" : undefined}>
        {error}
      </span>
      {source && (
        <img
          className="menu-photo-preview"
          src={source}
          alt="Menu photo preview"
          width={240}
          height={180}
        />
      )}
      {(source || error) && (
        <button
          className="text-button"
          type="button"
          disabled={disabled}
          onClick={() => {
            setFile(null);
            setRemoved(true);
            setError("");
            if (inputRef.current) {
              inputRef.current.value = "";
              inputRef.current.setCustomValidity("");
            }
          }}
        >
          Remove photo
        </button>
      )}
    </div>
  );
}
