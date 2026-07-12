# CPC AI Remake

A runnable weighted remake of **Animal Vegetable Mineral** with a full teaching loop.

## Features

- Node.js + Express server
- BASIC-style VM
- CPC-inspired browser UI
- Weighted AI engine (not a decision tree)
- Persistent knowledge store in JSON
- Complete `.bas` source file for the visible game flow
- Full teaching loop: wrong guess -> teach object -> store weights -> replay smarter

## Requirements

- Node.js 18+ recommended
- npm

## Installation

1. Extract the archive.
2. Open a terminal inside the `cpc-ai-remake` directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser at:
   ```
   http://localhost:3000
   ```

## How to use

1. Press **START**.
2. Think of an object.
3. Press Enter for the ready prompt.
4. Answer the feature questions with `YES` or `NO`.
5. The system makes its best weighted guess.
6. Answer whether the guess is correct.
7. If the guess is wrong, a teaching panel appears.
8. Enter the correct object name.
9. Mark the four features for that new object.
10. Save it.
11. The knowledge base persists in `data/knowledge.json`.
12. Start again and the ranking will include the taught object.

## Implemented BASIC instructions

- `PRINT`
- `INPUT`
- `LET`
- `IF ... THEN GOTO`
- `GOTO`
- `END`
- `CLS`
- `MODE`

## Files

- `server.js` — application server and runtime orchestration
- `vm/VM.js` — BASIC-style virtual machine
- `vm/Parser.js` — parser for the supported BASIC subset
- `commands/` — instruction implementations
- `ai/AI.js` — weighted ranking + teaching logic
- `client/` — HTML/CSS/JS interface with teaching panel
- `data/knowledge.json` — persistent weighted knowledge base
- `examples/animal-vegetable-mineral.bas` — complete BASIC source for the game

## Notes

- This is a functional vertical slice, not a full Locomotive BASIC emulator.
- JSON persistence is used for simplicity; later it can be replaced with LevelDB.
