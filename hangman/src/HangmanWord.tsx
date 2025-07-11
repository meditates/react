type HangmanWordProps = {
  guessedLetters: string[];
  wordToGuess: string;
  reveal?: boolean;
};

const HangmanWord = ({
  guessedLetters,
  wordToGuess,
  reveal = false,
}: HangmanWordProps) => {
  return (
    <div className="flex gap-2 font-bold text-4xl uppercase font-mono">
      {wordToGuess.split("").map((letter, index) => {
        const isGuessed = guessedLetters.includes(letter);
        const isVisible = isGuessed || reveal;

        let textColor = "text-black";
        if (reveal && !isGuessed) {
          textColor = "text-red-500";
        } else if (isGuessed) {
          textColor = "text-black";
        }

        return (
          <span className="border-b-4 border-black" key={index}>
            <span
              className={`${isVisible ? `visible ${textColor}` : "invisible"}`}
            >
              {letter}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default HangmanWord;
