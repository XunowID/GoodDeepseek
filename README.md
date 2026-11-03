# KonteksFlow

**KonteksFlow** is a community browser extension that turns DeepSeek into a personal AI workspace with cross-chat memory, skills, voice input, local project search, and document generation.

> Unofficial community project. Not affiliated with DeepSeek.

## Features

- **Persistent memory** for preferences, projects, and context across conversations.
- **Skills and Auto Skill** for custom instructions, a browsable skill list, and automatic selection of relevant skills.
- **Skill installer** that can find and install public GitHub skills when explicitly requested.
- **Speech input** with a live transcript preview and controls to insert or stop before sending.
- **Personality and system prompt** settings for global response style and instructions.
- **Local workspace** for project search and reviewable file changes.
- **Artifact generation** for Word (`.docx`), Excel (`.xlsx`), PowerPoint (`.pptx`), and SVG illustrations.
- **Workflow Studio**, conversation export, light and dark themes, and a multilingual interface.

Memory and settings stay in the browser profile. Features that use AI send relevant context to DeepSeek so the model can use it.

## Install from source

1. Download or clone this repository.
2. Run `npm install` and then `npm run build`.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable **Developer mode**, choose **Load unpacked**, and select the `dist/` folder.
5. Open [DeepSeek Chat](https://chat.deepseek.com) and use the KonteksFlow panel.

## Development

```bash
npm install
npm run build
```

The build creates a browser-loadable extension in `dist/`. After changing source files, rebuild and reload the extension in your browser.

## Origin and attribution

KonteksFlow is developed and maintained by [XunowID](https://github.com/XunowID). It is an extensively modified derivative of [DeepSeek Memory](https://github.com/logicwahid/deepseek-memory). Upstream attribution and its MIT license are preserved. See [NOTICE.md](NOTICE.md) for details.

## License

MIT: free to use, modify, and redistribute, including for commercial purposes. Redistributed copies must retain the copyright notice and MIT license text. See [LICENSE](LICENSE) for the full terms.
