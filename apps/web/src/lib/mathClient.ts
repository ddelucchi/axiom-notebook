import {
  type MathParseRequest,
  type MathParseResponse,
  type MathDiffRequest,
  type MathDiffResponse,
  type MathVisualizeRequest,
  type MathVisualizeResponse,
  MathParseResponseSchema,
  MathDiffResponseSchema,
  MathVisualizeResponseSchema,
} from "@axiom/shared";

const BASE = "/api/math";

export class MathServiceUnavailable extends Error {
  public readonly reason?: unknown;
  constructor(reason?: unknown) {
    super("math-service unavailable");
    this.name = "MathServiceUnavailable";
    this.reason = reason;
  }
}

async function post<TRes>(
  path: string,
  body: unknown,
  parser: { parse: (v: unknown) => TRes },
): Promise<TRes> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new MathServiceUnavailable(e);
  }
  if (!res.ok) {
    if (res.status >= 502 && res.status <= 504) throw new MathServiceUnavailable(res.status);
    throw new Error(`math-service ${path} failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  return parser.parse(json);
}

export const mathClient = {
  parse: (req: MathParseRequest): Promise<MathParseResponse> =>
    post("/parse", req, MathParseResponseSchema as never) as Promise<MathParseResponse>,
  diff: (req: MathDiffRequest): Promise<MathDiffResponse> =>
    post("/diff", req, MathDiffResponseSchema as never) as Promise<MathDiffResponse>,
  visualize: (req: MathVisualizeRequest): Promise<MathVisualizeResponse> =>
    post("/visualize", req, MathVisualizeResponseSchema as never) as Promise<MathVisualizeResponse>,
};

