import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 2567),
  discordClientId: process.env.VITE_DISCORD_CLIENT_ID || '',
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development'
};
