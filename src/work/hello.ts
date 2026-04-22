// ★ CUSTOMIZE — Replace this with your skill's work function.
// Keep it a pure function: no Hono, no A2A, no MCP. Surface adapters call it.

export function runHello(name?: string): { message: string } {
  return { message: `Hello, ${name ?? "World"}!` };
}
