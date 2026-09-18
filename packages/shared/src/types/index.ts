/**
 * Axiom Notebook — shared type definitions.
 *
 * Source of truth for the document model. The web client and the FastAPI
 * math service must agree on these shapes via the matching zod schemas in
 * ../schemas.
 */

// -------------------------------------------------------------------------
// MathJSON — minimal structural type. We do not redeclare the full grammar
// here; we treat it as opaque JSON at the type boundary and validate at
// runtime via zod. See https://cortexjs.io/math-json/ for the full spec.
// -------------------------------------------------------------------------
export type MathJson =
  | number
  | string
  | { num: string }
  | { sym: string }
  | { str: string }
  | { fn: [string, ...MathJson[]] }
  | (string | number | MathJson)[];

// -------------------------------------------------------------------------
// Domain tagging — used to route to the right visualization adapter.
// -------------------------------------------------------------------------
export type DomainTag =
  | "unknown"
  | "algebra"
  | "calculus"
  | "linear_algebra"
  | "ode"
  | "vector_calc"
  | "probability"
  | "physics";

export type DisplayMode = "inline" | "block" | "derivation";
export type ParseStatus = "pending" | "ok" | "partial" | "error";

// -------------------------------------------------------------------------
// Math block — the math-native document node.
// -------------------------------------------------------------------------
export interface MathBlock {
  id: string;
  documentId: string;
  displayMode: DisplayMode;
  rawLatex: string;
  canonicalMathJson: MathJson | null;
  serverCanonicalForm: ServerCanonicalForm | null;
  domainTag: DomainTag;
  derivationGroupId: string | null;
  visualizationHint: VisualizationHint | null;
  assumptions: Assumption[];
  parseStatus: ParseStatus;
  parseError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerCanonicalForm {
  /** SymPy `srepr` string — exact, reconstructable representation. */
  srepr: string;
  /** Top-level operator class (e.g. "Eq", "Add", "Mul", "Function"). */
  head: string;
  /** Free symbols detected by SymPy. */
  freeSymbols: string[];
  /** Whether the expression is a relational equation/inequality. */
  isRelational: boolean;
  /** Whether the expression is graphable in v1 (explicit y=f(x), parametric, etc). */
  graphable: boolean;
}

export interface Assumption {
  symbol: string;
  /** e.g. "real", "positive", "integer". */
  predicate: string;
}

export interface VisualizationHint {
  adapterType?: "graph" | "structure" | "linear_algebra" | "ode";
  variables?: string[];
  domain?: { min: number; max: number };
}

// -------------------------------------------------------------------------
// Derivations
// -------------------------------------------------------------------------
export interface DerivationGroup {
  id: string;
  documentId: string;
  title: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ChangeSet {
  addedSubtrees: SubtreeRef[];
  removedSubtrees: SubtreeRef[];
  transformedSubtrees: TransformRef[];
  unchangedContext: SubtreeRef[];
}

export interface SubtreeRef {
  /** Path of arg indices from the root, e.g. [0, 1, 2]. */
  path: number[];
  srepr: string;
}

export interface TransformRef {
  path: number[];
  before: string;
  after: string;
}

export type OperationKind =
  | "simplify"
  | "expand"
  | "factor"
  | "substitute"
  | "differentiate"
  | "integrate"
  | "solve"
  | "rearrange"
  | "isolate_variable"
  | "apply_identity"
  | "unknown";

export interface OperationCandidate {
  kind: OperationKind;
  confidence: number;
  detail?: string;
}

export interface DerivationStep {
  id: string;
  derivationGroupId: string;
  orderIndex: number;
  mathBlockId: string;
  previousStepId: string | null;
  changeSet: ChangeSet;
  operationCandidates: OperationCandidate[];
  selectedOperation: OperationKind | null;
  confidence: number;
  visualizationState: VisualizationState | null;
  explanationShort: string | null;
  createdAt: string;
}

// -------------------------------------------------------------------------
// Visualization
// -------------------------------------------------------------------------
export type AdapterType =
  | "graph"
  | "structure"
  | "linear_algebra"
  | "ode"
  | "vector_field"
  | "tensor"
  | "quantum";

export interface VisualizationState {
  adapterType: AdapterType;
  adapterPayload: Record<string, unknown>;
  viewport?: Viewport;
  annotations: Annotation[];
  highlights: Highlight[];
  fallbackMode?: boolean;
  confidence: number;
}

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Annotation {
  kind: string;
  payload: Record<string, unknown>;
}

export interface Highlight {
  /** Path into the canonical expression tree. */
  path: number[];
  color?: string;
  label?: string;
}

// -------------------------------------------------------------------------
// API contracts
// -------------------------------------------------------------------------
export interface MathParseRequest {
  rawLatex: string;
  assumptions?: Assumption[];
}

export interface MathParseResponse {
  canonicalMathJson: MathJson;
  normalizedLatex: string;
  parseStatus: ParseStatus;
  parseError: string | null;
  domainTag: DomainTag;
  graphability: boolean;
  serverCanonicalForm: ServerCanonicalForm;
}

export interface MathDiffRequest {
  prevCanonical: ServerCanonicalForm;
  nextCanonical: ServerCanonicalForm;
}

export interface MathDiffResponse {
  changeSet: ChangeSet;
  operationCandidates: OperationCandidate[];
  confidence: number;
}

export interface MathVisualizeRequest {
  canonical: ServerCanonicalForm;
  domainTag: DomainTag;
  visualizationHint?: VisualizationHint;
}

export interface MathVisualizeResponse {
  state: VisualizationState;
}

