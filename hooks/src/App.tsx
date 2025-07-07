import { useState, createContext } from "react";
// import wordList from "./wordList.json";
import { Button } from "@/components/ui/button";
import ChildComponent from "./ChildComponent";

// Define the type for our context
interface ThemeContextType {
  darkTheme: boolean;
  setDarkTheme: (value: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

function App() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("blue");
  const [resourceType, setResourceType] = useState("posts");
  const [darkTheme, setDarkTheme] = useState(true);

  // useEffect(() => {
  //   fetch(`https://jsonplaceholder.typicode.com/${resourceType}`)
  //     .then((response) => response.json())
  //     .then((json) => {
  //       setItems(json);
  //     });
  // }, [resourceType]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="flex gap-4 mb-4">
        <Button
          className="bg-red-500 text-white"
          onClick={() => {
            setCount(count + 1);
            setTheme("red");
          }}
        >
          increase count
        </Button>
        <Button
          className="bg-blue-500 text-white"
          onClick={() => {
            setCount(count - 1);
            setTheme("blue");
          }}
        >
          decrease count
        </Button>
      </div>
      <p
        className={`${theme === "red" ? "text-red-500" : "text-blue-500"} mb-8`}
      >
        total clicks: {count}
      </p>

      <div className="flex gap-4 mb-4">
        <Button
          className="bg-green-500 text-white"
          onClick={() => {
            setResourceType("posts");
          }}
        >
          Posts
        </Button>
        <Button
          className="bg-green-500 text-white"
          onClick={() => {
            setResourceType("users");
          }}
        >
          Users
        </Button>
        <Button
          className="bg-green-500 text-white"
          onClick={() => {
            setResourceType("comments");
          }}
        >
          Comments
        </Button>
      </div>
      <h1>Resource type: {resourceType}</h1>
      {/* <h1>{JSON.stringify(resourceType)}</h1>
      {items.map((item, index) => {
        return <pre key={index}>{JSON.stringify(item)}</pre>;
      })} */}
      <ThemeContext.Provider value={{ darkTheme, setDarkTheme }}>
        <ChildComponent />
      </ThemeContext.Provider>
    </div>
  );
}

export default App;
