import { tty } from "jsr:@codemonument/cliffy@1.0.0-rc.3/ansi"

export const ResetScreen = () => {
    tty.cursorSave.cursorHide.cursorTo(0, 0).eraseScreen()
}