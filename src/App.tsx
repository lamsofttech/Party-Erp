import { Outlet } from "react-router";

function App() {

  return (
      <main>
        <div>
          <Outlet />
        </div>
      </main>
  );
}

export default App;