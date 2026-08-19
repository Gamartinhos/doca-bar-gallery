"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { PepperCreator, PepperTier } from "@/lib/pepper/types";

import { createCreator, updateCreator, type ActionState } from "./actions";

const EMPTY: ActionState = {};

const TIERS: { value: PepperTier; label: string; hint: string }[] = [
  { value: "rising", label: "Rising", hint: "começando, tabela cheia" },
  { value: "core", label: "Core", hint: "casting principal" },
  { value: "headline", label: "Headline", hint: "topo do casting" },
];

export type UserOption = { id: string; label: string };

function Submit({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-street neon-magenta w-full">
      {pending ? "Salvando…" : isEditing ? "Salvar Alterações" : "Cadastrar Creator"}
    </button>
  );
}

export function CreatorForm({
  initialData,
  users,
}: {
  initialData?: PepperCreator;
  users: UserOption[];
}) {
  const [state, action] = useActionState(
    initialData ? updateCreator : createCreator,
    EMPTY,
  );

  return (
    <form action={action} className="space-y-4">
      {initialData && <input type="hidden" name="creator_id" value={initialData.id} />}

      <div>
        <label htmlFor="name" className="stamp mb-2 block">
          Nome *
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialData?.name}
          placeholder="Ex.: Mari Fonseca"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="slug" className="stamp mb-2 block">
          Slug (URL pública)
        </label>
        <input
          id="slug"
          name="slug"
          defaultValue={initialData?.slug}
          placeholder="gerado a partir do nome se ficar vazio"
          className="field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="handle" className="stamp mb-2 block">
            Instagram (sem @)
          </label>
          <input id="handle" name="handle" defaultValue={initialData?.handle ?? ""} placeholder="mari.fonseca" className="field" />
        </div>
        <div>
          <label htmlFor="tiktok_handle" className="stamp mb-2 block">
            TikTok (sem @)
          </label>
          <input
            id="tiktok_handle"
            name="tiktok_handle"
            defaultValue={initialData?.tiktok_handle ?? ""}
            placeholder="mari.fonseca"
            className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="city" className="stamp mb-2 block">
          Cidade
        </label>
        <input id="city" name="city" defaultValue={initialData?.city ?? ""} placeholder="São Paulo, SP" className="field" />
      </div>

      <div>
        <label htmlFor="bio" className="stamp mb-2 block">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={initialData?.bio ?? ""}
          placeholder="Quem é, o que faz, o que vibra"
          className="field resize-y"
        />
      </div>

      <div className="space-y-4 rounded-none border border-concrete p-4">
        <div>
          <label htmlFor="avatar_url_file" className="stamp mb-2 block">
            Foto de perfil (upload direto)
          </label>
          <input
            id="avatar_url_file"
            name="avatar_url_file"
            type="file"
            accept="image/*"
            className="field cursor-pointer file:mr-4 file:cursor-pointer file:border-none file:bg-concrete file:px-4 file:py-2 file:font-tech file:text-sm file:text-bone hover:file:bg-neon-magenta hover:file:text-void"
          />
          <p className="stamp mt-2 text-ash">Vai pra nossa nuvem. Tamanho máx: 4.5MB.</p>
        </div>

        <div className="border-t border-concrete pt-4">
          <label htmlFor="avatar_url" className="stamp mb-2 block">
            OU mantenha/cole a URL de uma foto (fallback)
          </label>
          <input
            id="avatar_url"
            name="avatar_url"
            type="url"
            placeholder="https://…"
            defaultValue={initialData?.avatar_url ?? ""}
            className="field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cover_url" className="stamp mb-2 block">
          Capa do perfil (URL, opcional)
        </label>
        <input
          id="cover_url"
          name="cover_url"
          type="url"
          placeholder="https://…"
          defaultValue={initialData?.cover_url ?? ""}
          className="field"
        />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="stamp mb-2 sm:col-span-2">Métricas</legend>
        <div>
          <label htmlFor="followers_instagram" className="stamp mb-2 block">
            Seguidores Instagram
          </label>
          <input
            id="followers_instagram"
            name="followers_instagram"
            type="number"
            min={0}
            defaultValue={initialData?.followers_instagram ?? 0}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="followers_tiktok" className="stamp mb-2 block">
            Seguidores TikTok
          </label>
          <input
            id="followers_tiktok"
            name="followers_tiktok"
            type="number"
            min={0}
            defaultValue={initialData?.followers_tiktok ?? 0}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="avg_views" className="stamp mb-2 block">
            Média de views
          </label>
          <input id="avg_views" name="avg_views" type="number" min={0} defaultValue={initialData?.avg_views ?? 0} className="field" />
        </div>
        <div>
          <label htmlFor="engagement_rate" className="stamp mb-2 block">
            Engajamento (%)
          </label>
          <input
            id="engagement_rate"
            name="engagement_rate"
            type="number"
            min={0}
            max={100}
            step={0.1}
            defaultValue={initialData?.engagement_rate ?? 0}
            className="field"
          />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rate_multiplier" className="stamp mb-2 block">
            Multiplicador de preço
          </label>
          <input
            id="rate_multiplier"
            name="rate_multiplier"
            type="number"
            min={0.1}
            max={9}
            step={0.1}
            defaultValue={initialData?.rate_multiplier ?? 1}
            className="field"
          />
          <p className="stamp mt-2 text-ash">1.0 = tabela cheia</p>
        </div>

        <div>
          <label htmlFor="tier" className="stamp mb-2 block">
            Tier
          </label>
          <select id="tier" name="tier" defaultValue={initialData?.tier ?? "rising"} className="field">
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.hint}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="user_id" className="stamp mb-2 block">
          Conta vinculada no Doca
        </label>
        <select id="user_id" name="user_id" defaultValue={initialData?.user_id ?? ""} className="field">
          <option value="">— nenhuma (sem acesso ao estúdio) —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
        <p className="stamp mt-2 text-ash">Dá acesso ao estúdio da Pepper pro creator logado nessa conta.</p>
      </div>

      {!initialData && (
        <p className="stamp text-ash">
          Cadastra oculto por padrão — publique na listagem quando o perfil estiver pronto.
        </p>
      )}

      {state.error && (
        <p role="alert" className="border border-neon-red bg-neon-red/10 px-3 py-2 font-tech text-sm text-neon-red">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="border border-neon-green bg-neon-green/10 px-3 py-2 font-tech text-sm text-neon-green">
          {state.message}
        </p>
      )}

      <Submit isEditing={!!initialData} />
      {initialData && (
        <div className="text-center">
          <Link href="/dashboard/admin/pepper/creators" className="font-tech text-xs text-bone hover:underline">
            Cancelar Edição
          </Link>
        </div>
      )}
    </form>
  );
}
