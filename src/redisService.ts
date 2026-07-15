import { clientRedis } from "./server";

class RedisLockService {
    /**
     * Adquire um lock atômico
     * @returns {Promise<string | null>} Retorna o valor do token do lock se adquirido, ou null se falhar.
     */
    async acquire(key: any, ttlMs: number): Promise<string | null> {

        const lockToken = globalThis.crypto.randomUUID();
        // CORREÇÃO: No Redis v4+, passamos NX e PX diretamente como propriedades booleanas/numéricas
        const result = await clientRedis.set(`lock:${key}`, lockToken, {
            NX: true,       // Only set the key if it does not already exist
            PX: ttlMs       // Set the specified expire time, in milliseconds
        });

        // O Redis retorna a string "OK" quando o set com NX tem sucesso
        return result === 'OK' ? lockToken : null;
    }

    /**
     * Libera o lock de forma segura usando Script Lua (Atomic)
     */
    async release(key: any, lockToken: any) {
        if (!key || !lockToken) return;

        const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;

        await clientRedis.eval(luaScript, {
            keys: [`lock:${key}`],
            arguments: [lockToken.toString()], // Garante que o argumento seja uma string
        });
    }
}

const redisService = new RedisLockService();

export { redisService };