import { z } from "zod";

/**
 * Zod's JIT compiles object parsers with `new Function` and probes for it on first use. The
 * site's Content-Security-Policy forbids eval (and so does the Workers runtime), so the probe
 * only produces a blocked-eval console error. Import this module first in every file that
 * builds schemas which can end up in a browser bundle.
 */
z.config({ jitless: true });
