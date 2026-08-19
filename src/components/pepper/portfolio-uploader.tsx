"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  registrarPecaPortfolio,
  removerPecaPortfolio,
} from "@/app/pepper/estudio/actions";
import { createClient } from "@/utils/supabase/client";

/**
 * Fluxo de envio do estúdio do creator.
 *
 * O arquivo sobe daqui direto pro Supabase Storage (bucket `media`) — o
 * mesmo caminho do /dashboard/upload do Doca, que existe justamente pra
 * não passar arquivo pesado por Server Action. Só depois a URL pública
 * vai pra ação, que decide onde a peça é registrada.
 */

export type EstudioEvento = { id: string; title: string; date: string };

type Modo = "portfolio" | "doca";
type ItemStatus = "fila" | "convertendo" | "enviando" | "pronto" | "erro";

type ItemFila = {
  key: string;
  file: File;
  preview: string;
  status: ItemStatus;
  erro?: string;
};

const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/**
 * iOS entrega HEIC como image/heic na maioria dos casos, mas navegadores
 * embutidos (Instagram, WhatsApp) às vezes mandam o type vazio — aí só a
 * extensão denuncia o formato.
 */
function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true;
  if (file.type) return false;
  return /\.hei[cf]$/i.test(file.name);
}

const STATUS_ROTULO: Record<ItemStatus, string> = {
  fila: "na fila",
  convertendo: "heic → jpg",
  enviando: "enviando",
  pronto: "pronto",
  erro: "erro",
};

/**
 * O `upload()` do storage-js não expõe progresso de bytes, então a barra
 * marca a etapa do item (fila → conversão → envio → pronto) em vez de
 * inventar uma porcentagem que não existe.
 */
const STATUS_ETAPA: Record<ItemStatus, number> = {
  fila: 6,
  convertendo: 38,
  enviando: 72,
  pronto: 100,
  erro: 100,
};

function dataCurta(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Carta de modo                                                       */
/* ------------------------------------------------------------------ */

function CartaModo({
  valor,
  ativo,
  glifo,
  titulo,
  resumo,
  destinos,
  desabilitado = false,
  nota,
  onSelect,
}: {
  valor: Modo;
  ativo: boolean;
  glifo: string;
  titulo: string;
  resumo: string;
  destinos: string[];
  desabilitado?: boolean;
  nota?: string;
  onSelect: (valor: Modo) => void;
}) {
  return (
    <label
      className={`block h-full ${
        desabilitado ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {/* Radio nativo escondido: o cartão é a pintura, mas a semântica
          (grupo, teclado, leitor de tela) continua sendo a do browser. */}
      <input
        type="radio"
        name="pepper-modo-envio"
        value={valor}
        checked={ativo}
        disabled={desabilitado}
        onChange={() => onSelect(valor)}
        className="peer sr-only"
      />
      <span
        className={`pp-glass-lit relative flex h-full flex-col gap-3 rounded-2xl p-5 transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--pp-ember)] ${
          ativo
            ? "border-[var(--pp-pepper)] shadow-[0_22px_50px_-28px_var(--pp-pepper)]"
            : "hover:border-[var(--pp-glass-hi)]"
        } ${desabilitado ? "opacity-45" : "hover:-translate-y-0.5"}`}
      >
        <span className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-[family-name:var(--pp-font-display)] text-lg font-black leading-none transition-colors duration-200 ${
              ativo
                ? "bg-gradient-to-br from-[var(--pp-flame)] to-[var(--pp-crimson)] text-white"
                : "bg-[var(--pp-steel)] text-[var(--pp-mute)]"
            }`}
          >
            {glifo}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-[family-name:var(--pp-font-display)] text-xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-[var(--pp-chalk)]">
              {titulo}
            </span>
            <span className="mt-1.5 block text-sm leading-snug text-[var(--pp-mute)]">
              {resumo}
            </span>
          </span>

          <span
            aria-hidden="true"
            className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-200 ${
              ativo
                ? "border-[var(--pp-pepper)]"
                : "border-[var(--pp-fog)]"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full transition-transform duration-200 ${
                ativo
                  ? "scale-100 bg-[var(--pp-pepper)]"
                  : "scale-0 bg-transparent"
              }`}
            />
          </span>
        </span>

        <span className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-[var(--pp-glass-brd)] pt-3">
          <span className="pp-label text-[0.55rem]">aparece em</span>
          {destinos.map((destino) => (
            <span
              key={destino}
              className={`pp-chip ${ativo ? "pp-chip-hot" : ""}`}
            >
              {destino}
            </span>
          ))}
        </span>

        {nota && (
          <span className="block text-xs leading-snug text-[var(--pp-amber)]">
            {nota}
          </span>
        )}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Uploader                                                            */
/* ------------------------------------------------------------------ */

export function PortfolioUploader({
  creatorId,
  eventos,
  credencialLiberada,
}: {
  creatorId: string;
  eventos: EstudioEvento[];
  /**
   * `users.is_approved` do login. A policy do bucket `media` exige
   * credencial aprovada, então sem isso nem o arquivo sobe — melhor
   * avisar antes do que devolver erro de RLS depois.
   */
  credencialLiberada: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [modo, setModo] = useState<Modo>("portfolio");
  const [eventId, setEventId] = useState("");
  const [legenda, setLegenda] = useState("");
  const [credito, setCredito] = useState("");
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);

  // Espelho síncrono da fila: o laço de envio não pode ler o `fila`
  // capturado no render, senão sobe arquivo que o creator já removeu.
  // Toda mutação escreve no ref e no state juntos.
  const filaRef = useRef<ItemFila[]>([]);

  // Object URL não é coletado sozinho: sem revogar, cada foto arrastada
  // fica presa na memória da aba até o reload.
  useEffect(() => {
    return () => {
      for (const item of filaRef.current) URL.revokeObjectURL(item.preview);
    };
  }, []);

  const patch = useCallback((key: string, next: Partial<ItemFila>) => {
    filaRef.current = filaRef.current.map((i) =>
      i.key === key ? { ...i, ...next } : i,
    );
    setFila(filaRef.current);
  }, []);

  const removerItem = useCallback((key: string) => {
    const alvo = filaRef.current.find((i) => i.key === key);
    if (alvo) URL.revokeObjectURL(alvo.preview);
    filaRef.current = filaRef.current.filter((i) => i.key !== key);
    setFila(filaRef.current);
  }, []);

  const limparFila = useCallback(() => {
    for (const item of filaRef.current) URL.revokeObjectURL(item.preview);
    filaRef.current = [];
    setFila([]);
    setResumo(null);
  }, []);

  /**
   * iPhone entrega foto em HEIC, que só o Safari sabe exibir e que o
   * Storage não converte. A conversão acontece no próprio aparelho antes
   * de subir — restringir o `accept` não resolve, porque o iOS mostra a
   * galeria inteira independente do MIME pedido.
   */
  const converterHeic = useCallback(
    async (alvos: ItemFila[]) => {
      if (alvos.length === 0) return;

      const { default: heic2any } = await import("heic2any");

      for (const alvo of alvos) {
        try {
          const resultado = await heic2any({
            blob: alvo.file,
            toType: "image/jpeg",
            quality: 0.85,
          });
          const blob = Array.isArray(resultado) ? resultado[0] : resultado;
          const nomeJpg = `${alvo.file.name.replace(/\.hei[cf]$/i, "")}.jpg`;
          const arquivoJpg = new File([blob], nomeJpg, { type: "image/jpeg" });
          const previewJpg = URL.createObjectURL(arquivoJpg);

          URL.revokeObjectURL(alvo.preview);
          patch(alvo.key, {
            file: arquivoJpg,
            preview: previewJpg,
            status: "fila",
          });
        } catch {
          patch(alvo.key, {
            status: "erro",
            erro: "Não deu pra converter esse HEIC. Exporta como JPG e tenta de novo.",
          });
        }
      }
    },
    [patch],
  );

  const adicionarArquivos = useCallback(
    (arquivos: FileList | File[]) => {
      const aceitos = Array.from(arquivos).filter(
        (f) =>
          f.type.startsWith("image/") ||
          f.type.startsWith("video/") ||
          isHeicFile(f),
      );
      if (aceitos.length === 0) return;

      // createObjectURL e Math.random têm efeito colateral — ficam fora do
      // updater do setState, que o React pode reexecutar.
      const novos: ItemFila[] = aceitos.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        status: isHeicFile(file) ? "convertendo" : "fila",
      }));

      filaRef.current = [...filaRef.current, ...novos];
      setFila(filaRef.current);
      setResumo(null);

      const heic = novos.filter((item) => item.status === "convertendo");
      if (heic.length > 0) void converterHeic(heic);
    },
    [converterHeic],
  );

  async function enviarItem(item: ItemFila) {
    const supabase = createClient();
    const ext = item.file.name.split(".").pop()?.toLowerCase() || "bin";
    // Material vinculado fica na pasta da noite, junto com o resto da
    // cobertura; material solto fica numa pasta da Pepper.
    const pasta = modo === "doca" ? eventId : `pepper/${creatorId}`;
    const caminho = `${pasta}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error: erroUpload } = await supabase.storage
      .from("media")
      .upload(caminho, item.file, {
        cacheControl: "31536000",
        contentType: item.file.type || undefined,
      });

    if (erroUpload) throw new Error(erroUpload.message);

    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(caminho);

    const dados = new FormData();
    dados.set("creator_id", creatorId);
    dados.set("origin", modo);
    dados.set("event_id", modo === "doca" ? eventId : "");
    dados.set("url", publicUrl);
    dados.set("thumbnail_url", publicUrl);
    dados.set("type", item.file.type.startsWith("video/") ? "video" : "photo");
    dados.set("caption", legenda);
    dados.set("credit", modo === "doca" ? credito : "");

    const resultado = await registrarPecaPortfolio(dados);

    if (resultado.error) {
      // O arquivo subiu mas nenhuma linha aponta pra ele. Sem essa
      // limpeza, cada tentativa falha deixa lixo permanente no bucket.
      await supabase.storage.from("media").remove([caminho]);
      throw new Error(resultado.error);
    }
  }

  const convertendo = fila.some((item) => item.status === "convertendo");
  const pendentes = fila.filter(
    (item) => item.status !== "pronto" && item.status !== "convertendo",
  ).length;
  const prontos = fila.filter((item) => item.status === "pronto").length;
  const faltaEvento = modo === "doca" && !eventId;
  const podeEnviar =
    credencialLiberada &&
    !enviando &&
    !convertendo &&
    !faltaEvento &&
    pendentes > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;

    setEnviando(true);
    setResumo(null);

    let ok = 0;
    let falhas = 0;
    let tentativas = 0;

    // Percorre por chave e reconsulta a fila viva a cada volta: se o
    // creator remover um item durante o lote, ele não é enviado.
    const chaves = filaRef.current.map((i) => i.key);

    for (const chave of chaves) {
      const item = filaRef.current.find((i) => i.key === chave);
      if (!item || item.status === "pronto" || item.status === "convertendo") {
        continue;
      }

      tentativas += 1;
      patch(chave, { status: "enviando", erro: undefined });

      try {
        await enviarItem(item);
        patch(chave, { status: "pronto" });
        ok += 1;
      } catch (causa) {
        const mensagem =
          causa instanceof Error ? causa.message : "Erro inesperado.";
        patch(chave, { status: "erro", erro: mensagem });
        falhas += 1;
      }
    }

    setEnviando(false);
    setResumo(
      `${ok} de ${tentativas} ${tentativas === 1 ? "peça enviada" : "peças enviadas"}${
        falhas > 0 ? ` · ${falhas} ${falhas === 1 ? "falhou" : "falharam"}` : ""
      }`,
    );

    if (ok > 0) router.refresh();
  }

  const semEventos = eventos.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!credencialLiberada && (
        <div
          role="status"
          className="pp-glass-lit flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3"
        >
          <span className="pp-chip pp-chip-hot">credencial na fila</span>
          <p className="text-sm text-[var(--pp-mute)]">
            A casa ainda não liberou seu acesso de envio. Assim que um admin
            aprovar, o estúdio destrava sozinho.
          </p>
        </div>
      )}

      {/* ---------- 01 · destino ---------- */}
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="pp-label mb-4 flex items-center gap-3">
          <span className="pp-label-hot font-bold">01</span>
          onde essa peça vai parar
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <CartaModo
            valor="portfolio"
            ativo={modo === "portfolio"}
            glifo="*"
            titulo="Material solto"
            resumo="Foto ou vídeo seu, sem vínculo com nenhuma noite. Entra só no seu portfólio da Pepper."
            destinos={["portfólio pepper"]}
            onSelect={setModo}
          />
          <CartaModo
            valor="doca"
            ativo={modo === "doca"}
            glifo="@"
            titulo="Vinculado a uma noite do Doca"
            resumo="Material feito numa noite da casa. A peça entra no seu portfólio e também na galeria oficial do evento."
            destinos={["portfólio pepper", "galeria do doca"]}
            desabilitado={semEventos}
            nota={
              semEventos
                ? "Nenhuma noite publicada no momento."
                : undefined
            }
            onSelect={setModo}
          />
        </div>
      </fieldset>

      {/* Painel da noite: grid-rows 0fr→1fr anima a altura sem medir nada. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          modo === "doca" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={modo !== "doca"}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pp-panel rounded-2xl p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pepper-evento" className="pp-label mb-2 block">
                  Noite *
                </label>
                <select
                  id="pepper-evento"
                  className="pp-field"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  disabled={modo !== "doca"}
                  required={modo === "doca"}
                >
                  <option value="" className="bg-[var(--pp-ink)]">
                    Escolhe a noite…
                  </option>
                  {eventos.map((evento) => (
                    <option
                      key={evento.id}
                      value={evento.id}
                      className="bg-[var(--pp-ink)]"
                    >
                      {evento.title} — {dataCurta(evento.date)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pepper-credito" className="pp-label mb-2 block">
                  Crédito (opcional)
                </label>
                <input
                  id="pepper-credito"
                  className="pp-field"
                  value={credito}
                  onChange={(e) => setCredito(e.target.value)}
                  placeholder="quem clicou: @fulano"
                  maxLength={80}
                  disabled={modo !== "doca"}
                  aria-describedby="pepper-credito-ajuda"
                />
                <p
                  id="pepper-credito-ajuda"
                  className="mt-2 text-xs text-[var(--pp-faint)]"
                >
                  Vai junto da legenda na galeria da casa.
                </p>
              </div>
            </div>

            <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-[color-mix(in_oklab,var(--pp-amber)_38%,transparent)] bg-[var(--pp-amber)]/10 px-3.5 py-2.5 text-sm text-[var(--pp-amber)]">
              <span aria-hidden="true" className="pp-live-dot mt-2 shrink-0" />
              <span>
                Atenção: no modo vinculado a peça também aparece na galeria
                oficial da noite, assinada com seu nome de fotógrafo do Doca.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ---------- 02 · legenda ---------- */}
      <div>
        <label
          htmlFor="pepper-legenda"
          className="pp-label mb-3 flex items-center gap-3"
        >
          <span className="pp-label-hot font-bold">02</span>
          legenda do lote (opcional)
        </label>
        <input
          id="pepper-legenda"
          className="pp-field"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          placeholder="Ex.: backstage antes do set das 2h"
          maxLength={280}
          aria-describedby="pepper-legenda-ajuda"
        />
        <p
          id="pepper-legenda-ajuda"
          className="mt-2 text-xs text-[var(--pp-faint)]"
        >
          A mesma legenda vale pra todos os arquivos deste envio.
        </p>
      </div>

      {/* ---------- 03 · arquivos ---------- */}
      <div>
        <p className="pp-label mb-3 flex items-center gap-3">
          <span className="pp-label-hot font-bold">03</span>
          arquivos
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!credencialLiberada}
          onDragOver={(e) => {
            e.preventDefault();
            if (credencialLiberada) setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (credencialLiberada) adicionarArquivos(e.dataTransfer.files);
          }}
          className={`pp-glass-lit relative block w-full overflow-hidden rounded-2xl border-dashed px-6 py-14 text-center transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            arrastando
              ? "scale-[1.005] border-[var(--pp-pepper)] bg-[var(--pp-pepper)]/8"
              : "border-[var(--pp-fog)] hover:border-[var(--pp-pepper-soft)]"
          } ${!credencialLiberada ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
        >
          <span
            aria-hidden="true"
            className="pp-heat -top-24 left-1/2 h-56 w-56 -translate-x-1/2 opacity-40"
          />
          <span className="relative block font-[family-name:var(--pp-font-display)] text-3xl font-black uppercase leading-none tracking-[-0.04em] text-[var(--pp-chalk)] sm:text-4xl">
            {arrastando ? "solta aí" : "arrasta o material"}
          </span>
          <span className="pp-label relative mt-3 block">
            ou clique pra escolher · jpg, png, webp, heic, mp4, mov
          </span>
          <span className="relative mt-1.5 block text-xs text-[var(--pp-faint)]">
            foto de iPhone (HEIC) vira JPG aqui mesmo, antes de subir
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          // image/* e video/* em vez de lista fechada de MIME: o Safari
          // mostra HEIC no seletor de qualquer jeito, e a lista fechada
          // ainda escondia .mov das câmeras de iPhone.
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* ---------- fila ---------- */}
      {fila.length > 0 && (
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--pp-glass-brd)] pb-3">
            <h3 className="text-2xl text-[var(--pp-chalk)]">
              Fila{" "}
              <span className="pp-hot-text">
                {String(fila.length).padStart(2, "0")}
              </span>
            </h3>
            <button
              type="button"
              onClick={limparFila}
              disabled={enviando}
              className="pp-label transition-colors duration-150 hover:text-[var(--pp-pepper-soft)] disabled:opacity-40"
            >
              limpar fila
            </button>
          </div>

          {/* Progresso do lote: esse número é real (itens concluídos). */}
          {enviando && (
            <div
              className="mb-4 h-1 w-full overflow-hidden rounded-full bg-[var(--pp-steel)]"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--pp-amber)] via-[var(--pp-ember)] to-[var(--pp-pepper)] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${(prontos / fila.length) * 100}%` }}
              />
            </div>
          )}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {fila.map((item) => (
              <li
                key={item.key}
                className="pp-card relative overflow-hidden !rounded-2xl"
              >
                <div className="relative aspect-square overflow-hidden bg-[var(--pp-ink)]">
                  {item.status === "convertendo" ? (
                    <div className="pp-asphalt grid h-full w-full place-items-center">
                      <span className="pp-label pp-label-hot animate-pulse">
                        heic → jpg
                      </span>
                    </div>
                  ) : item.file.type.startsWith("video/") ? (
                    <video
                      src={item.preview}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover opacity-70"
                    />
                  ) : (
                    // Preview local em blob: — nunca passa pelo otimizador
                    // do next/image, então aqui é <img> mesmo.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="h-full w-full object-cover opacity-70"
                    />
                  )}

                  <span
                    className={`pp-chip absolute left-2 top-2 z-[4] !bg-[color-mix(in_oklab,var(--pp-ink)_82%,transparent)] backdrop-blur-md ${
                      item.status === "pronto"
                        ? "border-[var(--pp-ember)] text-[var(--pp-ember)]"
                        : item.status === "erro"
                          ? "border-[var(--pp-pepper)] text-[var(--pp-pepper-soft)]"
                          : item.status === "enviando"
                            ? "animate-pulse border-[var(--pp-amber)] text-[var(--pp-amber)]"
                            : ""
                    }`}
                  >
                    {STATUS_ROTULO[item.status]}
                  </span>

                  {item.status !== "enviando" && (
                    <button
                      type="button"
                      onClick={() => removerItem(item.key)}
                      aria-label={`Remover ${item.file.name} da fila`}
                      className="absolute right-2 top-2 z-[4] grid h-7 w-7 place-items-center rounded-full border border-[var(--pp-glass-brd)] bg-[color-mix(in_oklab,var(--pp-ink)_82%,transparent)] text-lg leading-none text-[var(--pp-chalk)] backdrop-blur-md transition-colors duration-150 hover:border-[var(--pp-pepper)] hover:text-[var(--pp-pepper-soft)]"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="h-1 w-full bg-[var(--pp-steel)]">
                  <div
                    className={`h-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      item.status === "erro"
                        ? "bg-[var(--pp-crimson)]"
                        : item.status === "pronto"
                          ? "bg-[var(--pp-ember)]"
                          : "animate-pulse bg-gradient-to-r from-[var(--pp-amber)] to-[var(--pp-pepper)]"
                    }`}
                    style={{ width: `${STATUS_ETAPA[item.status]}%` }}
                  />
                </div>

                <p
                  className={`px-3 py-2 font-[family-name:var(--pp-font-mono)] text-[0.62rem] leading-snug break-all ${
                    item.erro
                      ? "text-[var(--pp-pepper-soft)]"
                      : "text-[var(--pp-faint)]"
                  }`}
                >
                  {item.erro ?? item.file.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- envio ---------- */}
      <div className="pp-glass-lit flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <p role="status" className="min-w-0 text-sm text-[var(--pp-mute)]">
          {resumo ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="pp-live-dot"
                style={{ animation: "none" }}
              />
              <span className="text-[var(--pp-chalk)]">{resumo}</span>
            </span>
          ) : faltaEvento ? (
            "Escolhe a noite pra liberar o envio."
          ) : pendentes > 0 ? (
            `${pendentes} ${pendentes === 1 ? "arquivo pronto" : "arquivos prontos"} pra subir${
              prontos > 0 ? ` · ${prontos} já ${prontos === 1 ? "enviado" : "enviados"}` : ""
            }`
          ) : (
            "Nada na fila ainda."
          )}
        </p>

        <button type="submit" disabled={!podeEnviar} className="pp-btn">
          {enviando
            ? "subindo…"
            : convertendo
              ? "convertendo heic…"
              : `mandar ${pendentes || ""} pro portfólio`}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Remoção de peça já publicada                                        */
/* ------------------------------------------------------------------ */

/**
 * Botão da grade de peças enviadas. Vive aqui porque a grade é renderizada
 * no servidor e só este pedaço precisa de estado.
 */
export function RemoverPecaButton({
  id,
  rotulo,
}: {
  id: string;
  rotulo: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pendente}
        aria-label={`Remover ${rotulo} do portfólio`}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const resultado = await removerPecaPortfolio(id);
            if (resultado.error) setErro(resultado.error);
            else router.refresh();
          })
        }
        className="absolute right-2 top-2 z-[5] grid h-8 w-8 place-items-center rounded-full border border-[var(--pp-glass-brd)] bg-[color-mix(in_oklab,var(--pp-ink)_82%,transparent)] text-lg leading-none text-[var(--pp-chalk)] opacity-0 backdrop-blur-md transition-[opacity,border-color,color] duration-200 group-hover:opacity-100 focus-visible:opacity-100 hover:border-[var(--pp-pepper)] hover:text-[var(--pp-pepper-soft)] disabled:opacity-40"
      >
        {pendente ? "…" : "×"}
      </button>

      {erro && (
        <p
          role="alert"
          className="absolute inset-x-2 bottom-2 z-[5] rounded-lg border border-[var(--pp-pepper)] bg-[color-mix(in_oklab,var(--pp-ink)_88%,transparent)] px-2.5 py-1.5 text-[0.68rem] leading-snug text-[var(--pp-pepper-soft)] backdrop-blur-md"
        >
          {erro}
        </p>
      )}
    </>
  );
}
