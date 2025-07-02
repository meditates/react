import { useState } from "react";
import { MultiSelect } from "@/components/ui/multiselect";
import SingleSelect from "@/components/ui/singleselect";

const OPTIONS = [
  { label: "First", value: "1" },
  { label: "Second", value: "2" },
  { label: "Third", value: "3" },
  { label: "Fourth", value: "4" },
  { label: "Fifth", value: "5" },
];

function App() {
  const [selected, setSelected] = useState<typeof OPTIONS>([]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col gap-4">
        <SingleSelect />
        <MultiSelect
          options={OPTIONS}
          selected={selected}
          onChange={setSelected}
        />
      </div>
    </div>
  );
}

export default App;
