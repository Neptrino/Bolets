import { z } from "zod";
import { conditionSnapshotSchema } from "@/src/lib/schema";

export const predictionCellHistoryRequestSchema = z.object({
  speciesId: z.string().regex(/^[a-z0-9-]+$/),
  cellId: z.string().min(1).max(160),
  regionId: z.enum(["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors", "altres"]),
  values: z.string().max(16_384).transform((value, context) => {
    try {
      return conditionSnapshotSchema.shape.values.parse(JSON.parse(value));
    } catch {
      context.addIssue({ code: "custom", message: "Invalid condition values" });
      return z.NEVER;
    }
  }),
});
