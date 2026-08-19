"use client";

import { ErrorScreen } from "@/components/error-screen";

/** Boundary das rotas do Doca — renderiza dentro da casca da casa. */
export default function DocaError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen {...props} />;
}
