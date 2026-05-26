// Game logic utilities for Number Guessing Duel
// Generate a random room code (6 uppercase letters)
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for(let i = 0; i < 6; i++){
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
// Validate a secret number based on difficulty
export function isValidSecret(secret, difficulty) {
  if (secret.length !== difficulty) return false;
  if (!/^\d+$/.test(secret)) return false; // Only digits
  const digits = secret.split('');
  const uniqueDigits = new Set(digits);
  return uniqueDigits.size === digits.length; // No repeating digits
}
// Calculate clues for a guess
export function calculateClues(guess, secret) {
  let correctPositions = 0;
  let correctNumbers = 0;
  const secretDigits = secret.split('');
  const guessDigits = guess.split('');
  // Count correct positions
  for(let i = 0; i < guessDigits.length; i++){
    if (guessDigits[i] === secretDigits[i]) {
      correctPositions++;
    }
  }
  // Count correct numbers (including correct positions)
  for (const digit of guessDigits){
    if (secretDigits.includes(digit)) {
      correctNumbers++;
    }
  }
  return {
    correctNumbers,
    correctPositions
  };
}
// Check if a player has won
export function isWinningGuess(correctPositions, difficulty) {
  return correctPositions === difficulty;
}
// Generate a random guest name
export function generateGuestName() {
  const adjectives = [
    'Quick',
    'Smart',
    'Clever',
    'Swift',
    'Bright',
    'Sharp',
    'Keen',
    'Wise',
    'Bold',
    'Cool'
  ];
  const nouns = [
    'Fox',
    'Eagle',
    'Wolf',
    'Hawk',
    'Lion',
    'Tiger',
    'Bear',
    'Owl',
    'Shark',
    'Panda'
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}
// Check if game should timeout
export function shouldTimeout(game) {
  if (!game.turnStartTime || !game.currentTurn) return false;
  const elapsed = Date.now() - game.turnStartTime;
  return elapsed > 30000; // 30 seconds
}
// Check if player should be disconnected
export function shouldDisconnect(player) {
  const elapsed = Date.now() - player.lastSeen;
  return elapsed > 60000; // 60 seconds
}
