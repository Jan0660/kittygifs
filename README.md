# kittygifs

A tool to optimize your gifkittyposting, and of course posting of other gifs.

## Installation(Tauri app)

The Tauri app is the recommended way to use kittygifs, because you can open it with a keyboard shortcut and send a gif with utmost haste.

Get the newest version from [the releases page](https://github.com/Jan0660/kittygifs/releases).

## Usage

### Windows

Press `Ctrl+Shift+G` to open the popup. Simply put in your query and send a gif. Done.

The keyboard shortcut can be changed in the settings.

### Linux

On Linux you have to manually set the keyboard shortcut. For KDE Plasma, you can do that in the System Settings under Custom Shortcuts.

The command should be like so:

```bash
kittygifs --popup --popup-delay 40 --enigo-delay 500
```

If you have trouble with sending the gifs try with the arguments at their default values `70` and `12000`.
