export interface Environment {
  COOLDOWNS: KVNamespace;
  API_KEY: string;
}

export interface KVCooldownEntry {
  cooldownExpiresTimestamp: number;
}
