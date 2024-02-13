import { ReactNode, useMemo } from "react";
import { createTheme, ThemeProvider } from "@mui/material";

import s from "./_exports.module.scss";

type MuiThemeProps = {
  children: ReactNode;
};

export function MuiTheme({ children }: MuiThemeProps): JSX.Element {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: {
            main: s.colorBtnPrimary,
          },
          secondary: {
            main: s.colorBtnSecondary,
          },
        },
        typography: {
          fontFamily: ["Proxima Nova", "sans-serif"].join(","),
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: "bold",
                fontSize: "15px",
              },
              containedSecondary: {
                color: s.colorBtnTextSecondary,
              },
            },
          },
        },
      }),
    [],
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
