import { GrandChildComponent } from "./GrandChildComponent";

function ChildComponent() {
  return (
    <div>
      <h2>Child Component</h2>
      <GrandChildComponent />
    </div>
  );
}

export default ChildComponent;
