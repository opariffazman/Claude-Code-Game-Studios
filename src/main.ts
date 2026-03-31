/**
 * Desk Smasher — Production Entry Point
 * A web toy where kids smash a fake desktop by mashing keyboards and clicking mice.
 */
import { DeskSmasherApp } from './app';

async function main(): Promise<void> {
  const app = new DeskSmasherApp();
  await app.start();
}

main().catch(console.error);
