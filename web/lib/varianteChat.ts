import type { ChatVariant, ResolverResult } from "@/lib/types";

export function varianteResultado(data: ResolverResult): Extract<ChatVariant, "success" | "error"> {
  const clasificacion = data.diagnostico?.clasificacion;
  const escasez =
    data.semantica?.factible === false && (data.semantica.negativos?.length ?? 0) > 0;
  if (
    clasificacion === "incompatible" ||
    clasificacion === "indeterminado" ||
    escasez ||
    !data.x ||
    data.abortado ||
    data.diagnostico?.numericamente_inestable === true
  ) {
    return "error";
  }
  return "success";
}
