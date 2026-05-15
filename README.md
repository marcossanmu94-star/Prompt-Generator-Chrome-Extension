# Prompt Generator Chrome Extension

A robust, beautifully designed Chrome extension for managing, reusing, and building text prompts for LLMs. 

## Features
- **Project Workspaces**: Organize your templates and variables into distinct projects.
- **Dynamic Variables**: Define variables (like `[product]` or `[company]`) and easily insert them into your templates. 
- **Quick Copying**: Instantly swap variables into your prompt templates and copy them to your clipboard in one click.
- **Compact & Collapsible Layout**: Clean, glassmorphic UI where everything is collapsible to keep your workspace tidy.
- **Side Panel Integration**: Works perfectly as a narrow Chrome Side Panel, allowing you to use the tool alongside your ChatGPT or Claude tabs without switching windows.
- **Portable**: Export and import your projects as JSON files to share with colleagues or move between devices.

## Installation

### For Users (Unpacked Extension)
Since this extension is not yet published on the Chrome Web Store, you can load it manually:
1. Download or clone this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button.
5. Select the folder containing these extension files.
6. The extension is now installed! Pin it to your toolbar for easy access.

## Usage
1. Click the extension icon to open the full-screen view, or right-click and select "Open Side Panel".
2. Create a **New Project** and name it.
3. Click **+ Var** to create variables. You can edit their names and quick-insert values.
4. Click **+ Template** to write your prompts. Use the blue variable buttons to insert placeholders.
5. Hit **Copy** to generate your final prompt with your current variable values injected!

## Data Privacy
All data (your projects, variables, and templates) is stored purely locally in your browser using `chrome.storage.local`. Nothing is ever sent to external servers.
