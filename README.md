# Simple Sync

A simple file synchronization tool that syncs local files to a remote server using `rsync`.

## Features

* **Single File Sync**: Quickly sync the currently active file to a remote path.
* **Multi-Target Support**: Configure multiple remote targets in your settings.
* **Dynamic Switching**: Switch between remote targets on the fly; the selection is persistent for the current workspace window.
* **Path Preservation**: Automatically constructs the remote path based on the file's relative path within the workspace.

## Usage

1.  Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
2.  Type **FileSync: Choose Remote Target** to select a destination (if multiple are configured).
3.  Type **FileSync: Current File to Server** to perform the synchronization.

## Requirements

* The `rsync` command-line tool must be available in your system's `PATH`.
* Secure Shell (SSH) key-based authentication is highly recommended for a seamless experience.

## Extension Settings

This extension contributes the following settings:

* `simpleSync.remoteTargets`: A list of remote destinations (format: `user@host:/remote/path`).

## Release Notes

### 0.0.1

* Initial release.
* Support for multiple remote target configurations.
* Added dynamic remote target selection.
