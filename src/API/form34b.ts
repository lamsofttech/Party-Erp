import { postJson } from "./client";
import type { SaveForm34BRequest, SaveForm34BResponse } from "../types/form34b";

export function saveForm34B(payload: SaveForm34BRequest, token?: string) {
  return postJson<SaveForm34BResponse>("/president/save_pres_34b.php", payload, token);
}
