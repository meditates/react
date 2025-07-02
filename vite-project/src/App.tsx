import Button from "./components/Button";
import Alert from "./components/Alert";
import { useState } from "react";

function App() {
  const [alertVisible, setAlertVisible] = useState(false);
  return (
    <div>
      {alertVisible && (
        <Alert onClose={() => setAlertVisible(false)}>Hello World</Alert>
      )}
      <Button onClick={() => setAlertVisible(true)} color="primary">
        Click me
      </Button>
    </div>
  );
}

export default App;
