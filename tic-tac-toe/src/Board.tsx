import { useState } from "react";

interface SquareProps {
  value: string;
  onSquareClick: () => void;
}

function Square({ value, onSquareClick }: SquareProps) {
  return (
    <button
      className="square w-10 h-10 text-2xl m-0 border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none active:transform-none"
      onClick={onSquareClick}
    >
      {value}
    </button>
  );
}

function calculateWinner(squares: string[]) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
}

export default function Board() {
  const [xIsNext, setXIsNext] = useState(true);
  const [squares, setSquares] = useState<string[]>(Array(9).fill(null));
  const [history, setHistory] = useState<string[][]>([Array(9).fill(null)]);
  const winner = calculateWinner(squares);

  function handleClick(i: number) {
    if (squares[i] || winner) {
      return;
    }
    const nextSquares = squares.slice();
    nextSquares[i] = xIsNext ? "X" : "O";
    setXIsNext(!xIsNext);
    setSquares(nextSquares);
    setHistory((prevHistory) => [...prevHistory, nextSquares]);
  }

  let status;
  if (winner) {
    status = "Winner: " + winner + "!";
  } else if (squares.every((square) => square !== null)) {
    status = "Game is a draw!";
  } else {
    status = "Next player: " + (xIsNext ? "X" : "O");
  }
  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-bold mb-4 text-center">{status}</div>
      <div className="flex gap-4 mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4"
          onClick={() => {
            setSquares(Array(9).fill(null));
            setXIsNext(true);
            setHistory([Array(9).fill(null)]);
          }}
        >
          Reset
        </button>
        <button
          className={`px-4 py-2 rounded-md mb-4 ${
            history.length <= 1
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
          onClick={() => {
            if (history.length > 1) {
              const newHistory = history.slice(0, -1);
              const previousSquares = newHistory[newHistory.length - 1];
              setHistory(newHistory);
              setSquares(previousSquares);
              setXIsNext(!xIsNext);
            }
          }}
          disabled={history.length <= 1}
        >
          Undo
        </button>
      </div>
      <div className="inline-block">
        <div className="flex">
          <Square value={squares[0]} onSquareClick={() => handleClick(0)} />
          <Square value={squares[1]} onSquareClick={() => handleClick(1)} />
          <Square value={squares[2]} onSquareClick={() => handleClick(2)} />
        </div>
        <div className="flex">
          <Square value={squares[3]} onSquareClick={() => handleClick(3)} />
          <Square value={squares[4]} onSquareClick={() => handleClick(4)} />
          <Square value={squares[5]} onSquareClick={() => handleClick(5)} />
        </div>
        <div className="flex">
          <Square value={squares[6]} onSquareClick={() => handleClick(6)} />
          <Square value={squares[7]} onSquareClick={() => handleClick(7)} />
          <Square value={squares[8]} onSquareClick={() => handleClick(8)} />
        </div>
      </div>
    </div>
  );
}
