import type { Session, SessionStore } from "./types.js";

export interface IdentityApi { logout(refreshToken: string): Promise<void>; }
export class SessionManager {
  public constructor(private readonly store: SessionStore, private readonly identity: IdentityApi) {}
  get(): Promise<Session | null> { return this.store.getSession(); }
  async establish(session: Session): Promise<void> { await this.store.setSession(session); }
  async logout(): Promise<void> {
    const refreshToken = await this.store.getRefreshToken();
    try { if (refreshToken) await this.identity.logout(refreshToken); }
    finally { await this.store.clear(); }
  }
}
