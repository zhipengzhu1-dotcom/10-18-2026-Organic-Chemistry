// Explain, file shape (Node only). Nothing to check beyond the Lesson's shape rules.
import { z } from "zod";
import { molecule, phase, sceneUse, stepId, text, visuals } from "../fields.ts";

export const step = z.strictObject({
  id: stepId,
  phase,
  type: z.literal("explain"),
  molecule,
  text,
  scene: sceneUse.optional(),
  ...visuals,
});

export const check = (): string[] => [];
