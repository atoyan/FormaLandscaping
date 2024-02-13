import { StyledEngineProvider } from "@mui/material/styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "./index.scss";

const app = document.getElementById("root");
const root = createRoot(app!); // eslint-disable-line @typescript-eslint/no-non-null-assertion

root.render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <App />
    </StyledEngineProvider>
  </StrictMode>,
);
