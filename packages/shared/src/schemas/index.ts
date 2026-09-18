import { z } from "zod";

// -------------------------------------------------------------------------
// MathJSON — opaque JSON; structural validation handled by Compute Engine.
// -------------------------------------------------------------------------
export const MathJsonSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.number(),
    z.string(),
    z.array(MathJsonSchema),
    z.record(z.string(), MathJsonSchema),
  ]),
);

export const DomainTagSchema = z.enum([
  "unknown",
  "algebra",
  "calculus",
  "linear_algebra",
  "ode",
  "vector_calc",
  "probability",
  "physics",
]);

export const DisplayModeSchema = z.enum(["inline", "block", "derivation"]);
export const ParseStatusSchema = z.enum(["pending", "ok", "partial", "error"]);

export const AssumptionSchema = z.object({
  symbol: z.string().min(1),
  predicate: z.string().min(1),
});

export const ServerCanonicalFormSchema = z.object({
  srepr: z.string(),
  head: z.string(),
  freeSymbols: z.array(z.string()),
  isRelational: z.boolean(),
  graphable: z.boolean(),
});

export const VisualizationHintSchema = z.object({
  adapterType: z
    .enum(["graph", "structure", "linear_algebra", "ode"])
    .optional(),
  variables: z.array(z.string()).optional(),
  domain: z.object({ min: z.number(), max: z.number() }).optional(),
});

// -------------------------------------------------------------------------
// API request/response schemas
// -------------------------------------------------------------------------
export const MathParseRequestSchema = z.object({
  rawLatex: z.string().min(1).max(10_000),
  assumptions: z.array(AssumptionSchema).optional(),
});

export const MathParseResponseSchema = z.object({
  canonicalMathJson: MathJsonSchema,
  normalizedLatex: z.string(),
  parseStatus: ParseStatusSchema,
  parseError: z.string().nullable(),
  domainTag: DomainTagSchema,
  graphability: z.boolean(),
  serverCanonicalForm: ServerCanonicalFormSchema,
});

export const SubtreeRefSchema = z.object({
  path: z.array(z.number().int().nonnegative()),
  srepr: z.string(),
});

export const TransformRefSchema = z.object({
  path: z.array(z.number().int().nonnegative()),
  before: z.string(),
  after: z.string(),
});

export const ChangeSetSchema = z.object({
  addedSubtrees: z.array(SubtreeRefSchema),
  removedSubtrees: z.array(SubtreeRefSchema),
  transformedSubtrees: z.array(TransformRefSchema),
  unchangedContext: z.array(SubtreeRefSchema),
});

export const OperationKindSchema = z.enum([
  "simplify",
  "expand",
  "factor",
  "substitute",
  "differentiate",
  "integrate",
  "solve",
  "rearrange",
  "isolate_variable",
  "apply_identity",
  "unknown",
]);

export const OperationCandidateSchema = z.object({
  kind: OperationKindSchema,
  confidence: z.number().min(0).max(1),
  detail: z.string().optional(),
});

export const MathDiffRequestSchema = z.object({
  prevCanonical: ServerCanonicalFormSchema,
  nextCanonical: ServerCanonicalFormSchema,
});

export const MathDiffResponseSchema = z.object({
  changeSet: ChangeSetSchema,
  operationCandidates: z.array(OperationCandidateSchema),
  confidence: z.number().min(0).max(1),
});

export const AdapterTypeSchema = z.enum([
  "graph",
  "structure",
  "linear_algebra",
  "ode",
  "vector_field",
  "tensor",
  "quantum",
]);

export const VisualizationStateSchema = z.object({
  adapterType: AdapterTypeSchema,
  adapterPayload: z.record(z.string(), z.unknown()),
  viewport: z
    .object({
      xMin: z.number(),
      xMax: z.number(),
      yMin: z.number(),
      yMax: z.number(),
    })
    .optional(),
  annotations: z.array(
    z.object({ kind: z.string(), payload: z.record(z.string(), z.unknown()) }),
  ),
  highlights: z.array(
    z.object({
      path: z.array(z.number().int().nonnegative()),
      color: z.string().optional(),
      label: z.string().optional(),
    }),
  ),
  fallbackMode: z.boolean().optional(),
  confidence: z.number().min(0).max(1),
});

export const MathVisualizeRequestSchema = z.object({
  canonical: ServerCanonicalFormSchema,
  domainTag: DomainTagSchema,
  visualizationHint: VisualizationHintSchema.optional(),
});

export const MathVisualizeResponseSchema = z.object({
  state: VisualizationStateSchema,
});

