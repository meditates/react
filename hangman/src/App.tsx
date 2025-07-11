import { useState, useEffect, useCallback } from "react";
import wordList from "./wordList.json";
import HangmanDrawing from "./HangmanDrawing";
import HangmanWord from "./HangmanWord";
import Keyboard from "./Keyboard";

const getWord = () => {
  return wordList[Math.floor(Math.random() * wordList.length)];
};

export default function App() {
  const [wordToGuess, setWordToGuess] = useState(() => {
    return getWord();
  });

  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);

  const incorrectLetters = guessedLetters.filter(
    (letter) => !wordToGuess.includes(letter)
  );

  const addGuessedLetter = useCallback(
    (letter: string) => {
      if (guessedLetters.includes(letter) || incorrectLetters.includes(letter))
        return;
      setGuessedLetters((currentLetters) => [...currentLetters, letter]);
    },
    [guessedLetters, incorrectLetters]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key >= "a" && key <= "z") {
        addGuessedLetter(key);
      }
    };
    document.addEventListener("keypress", handler);
    return () => {
      document.removeEventListener("keypress", handler);
    };
  }, [guessedLetters]);

  const isLoser = incorrectLetters.length >= 6;
  const isWinner = wordToGuess
    .split("")
    .every((letter) => guessedLetters.includes(letter));

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 mt-10">
      <h1
        className={`text-4xl font-bold text-center ${
          isLoser ? "text-red-500" : isWinner ? "text-green-500 text-6xl" : ""
        }`}
      >
        {isLoser ? "You Lose" : isWinner ? "You Win!" : "Hangman Game"}
      </h1>
      <button
        className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-all duration-300 cursor-pointer"
        onClick={() => {
          setWordToGuess(getWord());
          setGuessedLetters([]);
        }}
      >
        Play Again
      </button>

      <div className="flex flex-col items-center justify-center">
        <HangmanDrawing incorrectLetters={incorrectLetters.length} />
        <HangmanWord
          guessedLetters={guessedLetters}
          wordToGuess={wordToGuess}
          reveal={isLoser}
        />
        <div className="flex flex-col items-center justify-center stretch">
          <Keyboard
            activeLetters={guessedLetters.filter((letter) =>
              wordToGuess.includes(letter)
            )}
            inactiveLetters={incorrectLetters}
            disabled={isLoser || isWinner}
            addGuessedLetter={addGuessedLetter}
          />
        </div>
      </div>
    </div>
  );
}
