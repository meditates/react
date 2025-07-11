const KEYS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
];

type KeyboardProps = {
  activeLetters: string[];
  inactiveLetters: string[];
  addGuessedLetter: (letter: string) => void;
  disabled: boolean;
};

export default function Keyboard({
  activeLetters,
  inactiveLetters,
  addGuessedLetter,
  disabled = false,
}: KeyboardProps) {
  return (
    <div className="grid gap-2 grid-cols-9 max-w-2xl mx-auto p-4">
      {KEYS.map((key) => {
        const isActive = activeLetters.includes(key);
        const isInactive = inactiveLetters.includes(key);

        let buttonClass =
          "border-2 border-black rounded-md p-2 uppercase font-bold transition-colors text-sm sm:text-base";

        if (isActive) {
          buttonClass += " bg-green-500 text-white hover:bg-green-600";
        } else if (isInactive) {
          buttonClass += " bg-gray-400 text-gray-600 cursor-not-allowed";
        } else {
          buttonClass += " hover:bg-blue-500 hover:text-white cursor-pointer";
        }

        return (
          <button
            className={buttonClass}
            key={key}
            disabled={isActive || isInactive || disabled}
            onClick={() => addGuessedLetter(key)}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
