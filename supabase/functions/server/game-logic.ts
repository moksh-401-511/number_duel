// Game logic utilities for Number Guessing Duel

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/I/1
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export function isValidSecret(secret: string, difficulty: number): boolean {
  if (secret.length !== difficulty) return false;
  if (!/^\d+$/.test(secret)) return false;
  return new Set(secret.split('')).size === difficulty;
}

export function calculateClues(guess: string, secret: string) {
  let correctPositions = 0;
  let correctNumbers = 0;
  const secretDigits = secret.split('');
  const guessDigits  = guess.split('');
  for (let i = 0; i < guessDigits.length; i++) {
    if (guessDigits[i] === secretDigits[i]) correctPositions++;
  }
  for (const digit of guessDigits) {
    if (secretDigits.includes(digit)) correctNumbers++;
  }
  return { correctNumbers, correctPositions };
}

export function isWinningGuess(correctPositions: number, difficulty: number): boolean {
  return correctPositions === difficulty;
}

export function generateGuestName(): string {
  const adj  = ['Quick','Smart','Clever','Swift','Bright','Sharp','Keen','Wise','Bold','Cool'];
  const noun = ['Fox','Eagle','Wolf','Hawk','Lion','Tiger','Bear','Owl','Shark','Panda'];
  return `${adj[Math.floor(Math.random()*adj.length)]}${noun[Math.floor(Math.random()*noun.length)]}${Math.floor(Math.random()*1000)}`;
}

export function shouldTimeout(game: any): boolean {
  if (!game.turnStartTime || !game.currentTurn) return false;
  return Date.now() - game.turnStartTime > 30_000;
}

export function shouldDisconnect(player: any): boolean {
  return Date.now() - player.lastSeen > 60_000;
}
