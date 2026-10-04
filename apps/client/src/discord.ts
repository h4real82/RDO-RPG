import { DiscordSDK } from '@discord/embedded-app-sdk';

export interface UserProfile {
  id: string;
  username: string;
  avatar: string | null;
}

const CLIENT_ID = (import.meta as any).env?.VITE_DISCORD_CLIENT_ID || '123456789012345678';

class DiscordManager {
  public sdk: DiscordSDK | null = null;
  public user: UserProfile = {
    id: `guest_${Math.random().toString(36).substring(2, 8)}`,
    username: `Adventurer_${Math.floor(Math.random() * 900 + 100)}`,
    avatar: null
  };
  public isEmbedded: boolean = false;

  public async initialize(): Promise<UserProfile> {
    const isDiscordIframe = window.location !== window.parent.location;

    if (isDiscordIframe) {
      try {
        console.log('[DiscordManager] Detected Discord iframe, initializing Discord SDK...');
        this.sdk = new DiscordSDK(CLIENT_ID);
        await this.sdk.ready();
        this.isEmbedded = true;

        // Authorize with Discord Client
        const { code } = await this.sdk.commands.authorize({
          client_id: CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds']
        });

        // Exchange code with our server endpoint
        const tokenRes = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const tokenData = await tokenRes.json();

        // Authenticate with Discord SDK
        const auth = await this.sdk.commands.authenticate({
          access_token: tokenData.access_token
        });

        if (auth.user) {
          this.user = {
            id: auth.user.id,
            username: auth.user.username,
            avatar: auth.user.avatar ?? null
          };
        }

        console.log('[DiscordManager] Authenticated successfully as:', this.user.username);
        return this.user;
      } catch (err) {
        console.warn('[DiscordManager] Discord SDK initialization failed, falling back to guest profile:', err);
      }
    } else {
      console.log('[DiscordManager] Running standalone in browser, using guest mock credentials.');
    }

    return this.user;
  }
}

export const discordManager = new DiscordManager();
