# kittygifs

A tool to optimize your gifkittyposting, and of course posting of other gifs.

## Installation(Tauri app)

The Tauri app is the recommended way to use kittygifs,
because you can open it with a keyboard shortcut and send a gif with utmost haste.

### Linux

If you are on Arch Linux or a derivative,
you can install `kittygifs-bin` or `kittygifs-git` from the AUR.

You can download the AppImage and `.deb` from [the releases page](https://github.com/Jan0660/kittygifs/releases).

You have to have `xdotool`(for X11) or
[`ydotool`](https://github.com/ReimuNotMoe/ydotool)(for all) set up.
For xdotool, you can simply install it.

For ydotool you have to install it (just `ydotool` in Arch's Extra repo),
add your user to the `input` group(`sudo usermod -aG input $USER`),
restart your system,
and start the ydotool service with `systemctl --user enable --now ydotool`,
and include `--ydotool` in the command for the kittygifs shortcut.

Then follow instructions in Usage below.

### Other

You can get it from the [Microsoft Store](https://apps.microsoft.com/store/detail/9NP2F5MF41J1).

<!-- Get the newest version from [the releases page](https://github.com/Jan0660/kittygifs/releases). -->

## Usage

### Windows

Press `Ctrl+Shift+G` to open the popup. Simply put in your query and send a gif. Done.

The keyboard shortcut can be changed in the settings.

### Linux

On Linux you have to manually set the keyboard shortcut.
For KDE Plasma, you can do that in the System Settings under Shortcuts.

The command should be like so:

```bash
kittygifs --popup --popup-delay 40 --enigo-delay 500
```

If you are using ydotool, you have to add `--ydotool` to the command.

If you have trouble with sending the gifs try with the arguments at their default values `70` and `12000`.
