"use client";

// Lets a tool know it's running inside the Workspace, so its result can become the
// next version of the user's file instead of a separate download page.
import { createContext, useContext } from "react";
import type { Output } from "./files";
import type { ToolSlug } from "./tools";

export interface Embed {
  /** Called once when the tool has results. Returns true if the workspace took them. */
  onResult: (tool: ToolSlug, outputs: Output[]) => boolean;
  /** Close the tool and go back to the file. */
  onBack: () => void;
}

export const EmbedContext = createContext<Embed | null>(null);
export const useEmbed = () => useContext(EmbedContext);
