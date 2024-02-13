import { MuiTheme } from "./MuiTheme";
import MainPage from "./views/MainPage";

import "./App.scss";

function App(): JSX.Element {
  return (
    <MuiTheme>
      <MainPage />
    </MuiTheme>
  );
}

export default App;
