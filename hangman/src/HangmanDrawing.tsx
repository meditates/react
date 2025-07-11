const HEAD = (
  <div className="w-10 h-10 rounded-full border-[4px] border-black absolute top-[2.8rem] -right-[1rem]" />
);

const BODY = <div className="w-1 h-15 bg-black absolute top-[5rem] right-0" />;

const RIGHT_ARM = (
  <div className="w-12 h-1 bg-black absolute top-[6rem] -right-12 rotate-[-30deg] origin-left-bottom" />
);

const LEFT_ARM = (
  <div className="w-12 h-1 bg-black absolute top-[6rem] right-0.5 rotate-[30deg] origin-right-bottom" />
);

const RIGHT_LEG = (
  <div className="w-12 h-1 bg-black absolute top-[9.8rem] -right-[2.2rem] rotate-[60deg] origin-left-bottom" />
);

const LEFT_LEG = (
  <div className="w-12 h-1 bg-black absolute top-[9.8rem] -right-[0.7rem] rotate-[-60deg] origin-right-bottom" />
);

const BODY_PARTS = [HEAD, BODY, RIGHT_ARM, LEFT_ARM, RIGHT_LEG, LEFT_LEG];

type HangmanDrawingProps = {
  incorrectLetters: number;
};

export default function HangmanDrawing({
  incorrectLetters,
}: HangmanDrawingProps) {
  return (
    <div className="relative">
      {BODY_PARTS.slice(0, incorrectLetters)}

      <div className="h-12 w-1 bg-black absolute top-0 right-0" />

      {/* top horizontal bar */}
      <div className="h-1 w-[10rem] bg-black ml-[5rem]" />

      {/* middle vertical post */}
      <div className="h-[15rem] w-1 bg-black ml-[5rem]" />

      {/* base horizontal platform */}
      <div className="h-1 w-[10rem] bg-black" />
    </div>
  );
}
