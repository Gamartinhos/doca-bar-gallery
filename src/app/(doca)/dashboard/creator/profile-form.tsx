"use client";

import { useState } from "react";

import type { PepperCreator } from "@/lib/pepper/types";
import { createClient } from "@/utils/supabase/client";

/**
 * Atualiza `pepper_creators` direto do browser.
 *
 * A RLS de `pepper_creators_update_own` (migration 0006) já garante que só
 * o dono da linha (`user_id = auth.uid()`) escreve nela — não precisa de
 * Server Action nem de checagem extra aqui, o banco é quem decide.
 */
export function ProfileForm({ creator }: { creator: PepperCreator }) {
  const [name, setName] = useState(creator.name);
  const [handle, setHandle] = useState(creator.handle ?? "");
  const [tiktokHandle, setTiktokHandle] = useState(creator.tiktok_handle ?? "");
  const [city, setCity] = useState(creator.city ?? "");
  const [bio, setBio] = useState(creator.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(creator.avatar_url ?? "");
  const [coverUrl, setCoverUrl] = useState(creator.cover_url ?? "");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Seu nome precisa de pelo menos 2 letras.");
      setMessage(null);
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("pepper_creators")
      .update({
        name: name.trim(),
        handle: handle.trim().replace(/^@/, "") || null,
        tiktok_handle: tiktokHandle.trim().replace(/^@/, "") || null,
        city: city.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        cover_url: coverUrl.trim() || null,
      })
      .eq("id", creator.id);

    setPending(false);

    if (updateError) {
      setError("Não deu pra salvar agora. Tenta de novo.");
      return;
    }
    setMessage("Perfil atualizado.");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="stamp mb-2 block">
          Nome *
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="handle" className="stamp mb-2 block">
            Instagram (sem @)
          </label>
          <input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="seu.perfil"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="tiktok_handle" className="stamp mb-2 block">
            TikTok (sem @)
          </label>
          <input
            id="tiktok_handle"
            value={tiktokHandle}
            onChange={(e) => setTiktokHandle(e.target.value)}
            placeholder="seu.perfil"
            className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="city" className="stamp mb-2 block">
          Cidade
        </label>
        <input
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="São Paulo, SP"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="bio" className="stamp mb-2 block">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Quem é, o que faz, o que vibra"
          className="field resize-y"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="avatar_url" className="stamp mb-2 block">
            Foto de perfil (URL)
          </label>
          <input
            id="avatar_url"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="cover_url" className="stamp mb-2 block">
            Capa do perfil (URL)
          </label>
          <input
            id="cover_url"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://…"
            className="field"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="border border-neon-red bg-neon-red/10 px-3 py-2 font-tech text-sm text-neon-red">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="border border-neon-green bg-neon-green/10 px-3 py-2 font-tech text-sm text-neon-green">
          {message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-street neon-magenta">
        {pending ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
