import type { Environment, KVCooldownEntry } from "./types";

export default {
  async fetch(request: Request, env: Environment, context: ExecutionContext): Promise<Response> {
    if (!env.API_KEY || request.headers.get("API-KEY") !== env.API_KEY) return unathorized();

    const { searchParams } = new URL(request.url);

    const environment = searchParams.get("env") as "dev" | "live";
    const userId = searchParams.get("user");
    const command = searchParams.get("command") as "recruitment_post" | "portal_post" | "when";

    if (!["dev", "live"].includes(environment) || !userId || !["recruitment_post", "portal_post", "when"].includes(command)) return notOk(`3 params needed: env (dev or live), user (discord id), command (recruitment_post or portal_post or when).)`);

    const currentDate = new Date().getTime();
    const key = `${environment}-${userId}-${command}`;

    // Get cooldown
    if (request.method === "GET") {
      const user: KVCooldownEntry = await env.COOLDOWNS.get(key, { type: "json" });
      // If exists, but cooldown has expired, delete KV
      if (user?.cooldownExpiresTimestamp < currentDate) context.waitUntil(env.COOLDOWNS.delete(key));
      return Response.json({ cooldown: currentDate < user?.cooldownExpiresTimestamp, cooldownExpiresTimestamp: user?.cooldownExpiresTimestamp });
    }

    // Set cooldown
    if (request.method === "POST") {
      const cooldownExpiresTimestamp = parseInt(searchParams.get("expireAt"));
      // If no expireAt is provided or if the expireAt is in the past, return not ok
      if (!cooldownExpiresTimestamp || cooldownExpiresTimestamp < currentDate) return notOk(`No expireAt provided or expireAt is in the past: expireAt is ${typeof cooldownExpiresTimestamp}`);
      await env.COOLDOWNS.put(key, JSON.stringify({ cooldownExpiresTimestamp }));
      return Response.json({ cooldown: true, cooldownExpiresTimestamp });
    }

    // Delete cooldown
    if (request.method === "DELETE") {
      await env.COOLDOWNS.delete(key);
      return Response.json({ cooldown: false });
    }
  }
};

const ok = (message?: string): Response => new Response(message ?? "OK.");
const notOk = (message?: string): Response => new Response(message ?? "Not OK.", { status: 500 });
const unathorized = (): Response => new Response("Unathorized.", { status: 401 });
