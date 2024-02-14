import { useCallback, useRef, useState } from "react";

import "./MainPage.scss";
import { TerrainPage } from "./TerrainPage";

function MainPage(): JSX.Element {
  return (
    <div>
      <TerrainPage />
    </div>
  );
}

export default MainPage;
