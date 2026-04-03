/**
 * SigningEngine
 * Provides RSA-PKCS1v1.5 signing and verification with SHA-256.
 * Includes key generation, persistence helpers, and safer lifecycle.
 */
export class SigningEngine {
  private keyPair: CryptoKeyPair | null = null

  /**
   * Initialize by generating a fresh RSA key pair.
   */
  async init(): Promise<void> {
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    )
  }

  private ensureReady(): asserts this is { keyPair: CryptoKeyPair } {
    if (!this.keyPair) {
      throw new Error("SigningEngine not initialized. Call init() first.")
    }
  }

  /**
   * Sign a UTF-8 string and return base64 signature.
   */
  async sign(data: string): Promise<string> {
    this.ensureReady()
    const enc = new TextEncoder().encode(data)
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", this.keyPair.privateKey, enc)
    return Buffer.from(sig).toString("base64")
  }

  /**
   * Verify a base64 signature against given data.
   */
  async verify(data: string, signature: string): Promise<boolean> {
    this.ensureReady()
    const enc = new TextEncoder().encode(data)
    const sig = Buffer.from(signature, "base64")
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", this.keyPair.publicKey, sig, enc)
  }

  /**
   * Export public key as base64-encoded SPKI for distribution.
   */
  async exportPublicKey(): Promise<string> {
    this.ensureReady()
    const raw = await crypto.subtle.exportKey("spki", this.keyPair.publicKey)
    return Buffer.from(raw).toString("base64")
  }

  /**
   * Export private key as base64-encoded PKCS8 (use with caution).
   */
  async exportPrivateKey(): Promise<string> {
    this.ensureReady()
    const raw = await crypto.subtle.exportKey("pkcs8", this.keyPair.privateKey)
    return Buffer.from(raw).toString("base64")
  }

  /**
   * Import an existing key pair (SPKI public, PKCS8 private).
   */
  async importKeys(publicKeyB64: string, privateKeyB64: string): Promise<void> {
    const algo = {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    }
    const pub = Buffer.from(publicKeyB64, "base64")
    const priv = Buffer.from(privateKeyB64, "base64")

    const publicKey = await crypto.subtle.importKey("spki", pub, algo, true, ["verify"])
    const privateKey = await crypto.subtle.importKey("pkcs8", priv, algo, true, ["sign"])
    this.keyPair = { publicKey, privateKey }
  }
}
