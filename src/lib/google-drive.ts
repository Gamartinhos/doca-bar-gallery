import { createSign } from "node:crypto";

/**
 * Upload para o Google Drive usando uma Service Account.
 *
 * Não usa o pacote `googleapis` de propósito: ele pesa dezenas de MB no
 * bundle serverless. Aqui assinamos o JWT na mão (RS256) e falamos com a
 * REST API do Drive via fetch.
 *
 * Variáveis de ambiente esperadas:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  conta@projeto.iam.gserviceaccount.com
 *   GOOGLE_PRIVATE_KEY            chave PEM (com \n escapados ou reais)
 *   GOOGLE_DRIVE_FOLDER_ID        id da pasta destino (compartilhada com a SA)
 *
 * Sem essas variáveis, `isDriveConfigured()` retorna false e a rota de
 * upload cai no Supabase Storage automaticamente.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink";
const SCOPE = "https://www.googleapis.com/auth/drive";

export interface DriveUploadResult {
  fileId: string;
  url: string;
  thumbnailUrl: string | null;
}

function privateKey(): string | null {
  const raw = process.env.GOOGLE_PRIVATE_KEY;
  if (!raw) return null;
  // Aceita a chave com "\n" literais (formato comum em painéis de env).
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      privateKey() &&
      process.env.GOOGLE_DRIVE_FOLDER_ID,
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Troca um JWT assinado por um access token OAuth2. */
async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = privateKey()!;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: email,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = base64url(signer.sign(key));
  const assertion = `${header}.${claim}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth falhou (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google não devolveu access_token.");

  return json.access_token;
}

/**
 * Deixa o arquivo legível por qualquer pessoa com o link.
 *
 * Se isto falhar o upload é inútil: o arquivo existe no Drive mas a
 * galeria nunca conseguirá exibi-lo. Então o erro sobe.
 */
async function makePublic(fileId: string, token: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Arquivo subiu mas não ficou público (${res.status}): ${await res.text()}`,
    );
  }
}

/**
 * Sobe um arquivo para a pasta configurada e devolve URLs públicas.
 */
export async function uploadToDrive(
  file: File,
  filename: string,
): Promise<DriveUploadResult> {
  if (!isDriveConfigured()) {
    throw new Error("Google Drive não configurado.");
  }

  const token = await getAccessToken();
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  const boundary = `doca-${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name: filename,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
  };

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    throw new Error(`Upload pro Drive falhou (${res.status}): ${await res.text()}`);
  }

  const created = (await res.json()) as { id: string };

  await makePublic(created.id, token);

  // Sempre lh3: serve a imagem direto, sem a página intermediária do Drive.
  // O `thumbnailLink` devolvido pela API NÃO serve aqui — ele expira em
  // algumas horas, e este valor vai pro banco como URL permanente.
  return {
    fileId: created.id,
    url: `https://lh3.googleusercontent.com/d/${created.id}`,
    thumbnailUrl: `https://lh3.googleusercontent.com/d/${created.id}=w600`,
  };
}
