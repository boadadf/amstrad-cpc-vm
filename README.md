# CPC BASIC VM / Animal Vegetable Mineral

A browser-playable **Locomotive BASIC–style VM project** built with Node.js and Express, featuring a CPC-inspired UI and a runnable `.bas` program for **Animal Vegetable Mineral**. The current system supports a visible BASIC source listing, a BASIC VM runtime, weighted guessing, teaching/learning inside the BASIC program, session-based multiplayer runtime separation, and shared learned knowledge across sessions.

## What this project is now

This project has evolved from a simple CPC AI remake into a **BASIC VM-driven game runtime** where the browser shows the BASIC program that is actually being executed. The server runs a Locomotive BASIC–style virtual machine, the client shows the active program line, and the game logic lives in the `.bas` source rather than in a separate high-level AI flow.

The current browser experience includes:

- A **RUNTIME** panel that displays the BASIC source and highlights the currently executing line.
- A **SCORE** panel showing current object scores from the VM state.
- A **TRAINED-MODEL** panel showing learned objects, questions, and weights extracted from the runtime knowledge.
- A **CONSOLE** panel for the actual game interaction.
- CPC-style visual presentation in the browser.

## Major changes made so far

### 1. BASIC VM runtime structure

The application now runs a BASIC-style VM with a parser and command set rather than only simulating game logic in JavaScript. The server loads a `.bas` file, parses it, hydrates runtime knowledge, executes until `INPUT` or program end, and exposes state to the browser.

Implemented/used command support now includes:

- `PRINT`
- `INPUT`
- `LET`
- `DIM`
- `FOR`
- `NEXT`
- `GOTO`
- `GOSUB`
- `RETURN`
- `CLS`
- `MODE`
- `END`
- `IF ... THEN ...` through parser/runtime support
- `SKIP` / `IFSKIP` internal control-flow support in the VM
- `SOUND`
- `REM`

### 2. Visible BASIC execution in the GUI

The GUI was changed so the BASIC source code is visible in a dedicated runtime pane. A regression temporarily removed auto-follow of the executing BASIC line when the runtime view was simplified to plain text output.

The correct behavior is to render one DOM row per BASIC line, apply an `.active-line` class to the current line, and call `scrollIntoView()` on that active row so the runtime panel follows BASIC execution automatically.

### 3. Reworked game logic inside BASIC

The `animal-vegetable-mineral.bas` program was expanded into a fuller game loop with:

- runtime-state initialization
- per-round reset logic
- question selection
- score updating
- impossible-object elimination
- confidence/guess readiness logic
- guess/confirmation loop
- wrong-guess teaching
- adding new objects
- propagating new question weights across existing objects

The game now behaves as a weighted question/guess system driven directly by BASIC data arrays and scoring logic.

### 4. Fixes to question loop behavior

Several runtime/control-flow bugs were found and corrected during debugging:

- The game originally guessed too early.
- A guard was added so the guess routine is only entered when `READY=1`.
- The question loop was rewritten into more explicit control flow to avoid fragile VM/parser behavior around inline `IF ... THEN ...` forms.
- The readiness logic was debugged using runtime score traces and explicit `DEBUG` output.

### 5. Duplicate-question prevention in BASIC teaching

The original teaching routine always appended a new question with `NQ=NQ+1`, even when the same text had already been learned. That caused identical questions such as `DOES IT FLY?` to be stored multiple times.

The BASIC teaching logic was updated to:

- search existing `QQ$()` entries for exact text matches,
- reuse an existing question index when found,
- only create a new question slot when no exact match exists,
- apply new weights using a `QI` question index variable.

This prevents exact duplicate learned questions from being stored multiple times.

### 6. Multiplayer/session separation

The app was identified as **not multiplayer** because it originally used a single global `runtime` object on the server. Refreshing or opening another browser reused the same VM state.

The server design was then updated conceptually to use:

- one runtime per browser session,
- a session id stored in a cookie,
- a `Map` of session id -> runtime,
- shared knowledge across sessions.

This means:

- each browser session gets its own live BASIC runtime,
- pressing F5 in the same browser keeps that user’s own session,
- different users do not overwrite each other’s active play state,
- learned knowledge can still be shared globally if desired.

### 7. Shared knowledge model

The runtime uses a shared knowledge structure that can be hydrated into newly created VMs and extracted back from the VM after learning. This allows a newly taught object/question set to become available to later sessions without sharing the active in-progress game state.

## Current architecture

### Server

The Node.js + Express server is responsible for:

- serving the GUI,
- loading and parsing the BASIC program,
- creating VM runtimes,
- hydrating VM memory from shared knowledge,
- running the VM until it waits for input,
- accepting browser input and feeding it into the VM,
- extracting scores, answers, and learned knowledge from VM state,
- returning JSON state for the GUI.

### Client

The browser client is responsible for:

- rendering the BASIC source listing,
- highlighting the currently executing BASIC line,
- auto-scrolling the runtime panel to the active line,
- showing output in the console,
- showing score ranking,
- showing learned object/question weight tables,
- posting user input back to the server.

### BASIC program

The main game logic lives in the BASIC program, including:

- asking questions,
- recording yes/no answers,
- updating score vectors,
- deciding when to guess,
- teaching new objects,
- adding or reusing distinguishing questions.

## Files in the project

| File / folder | Purpose |
|---|---|
| `server.js` | Express server and runtime orchestration |
| `vm/VM.js` | BASIC-style virtual machine |
| `vm/Parser.js` | BASIC parser |
| `commands/` | BASIC command implementations |
| `knowledge.js` | Knowledge hydration/extraction helpers |
| `client/index.html` | Browser UI shell |
| `client/style.css` | CPC-inspired styling |
| `client/app.js` or `client/app-2.js` | Browser-side rendering and input handling |
| `examples/animal-vegetable-mineral.bas` | Main BASIC game program |

## Programs that can be run

### Main included program

The main runnable program is:

- `examples/animal-vegetable-mineral.bas`

This is the current primary game program used by the GUI and server runtime.

### Other BASIC programs

The VM architecture is not limited to one program. Any compatible BASIC source file using the supported subset of commands can be loaded and run, provided the server points `basPath` to that file and the code stays within the implemented command/parser subset.

That means the project can also run:

- small BASIC demos,
- questionnaire-style games,
- simple score-driven guessing systems,
- teaching/learning experiments built on the same array/state model.

## How to run locally

1. Open a terminal in the project directory.
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Open the browser at:

```text
http://localhost:3000
```

## Deployment direction

The project is suitable for deployment as a long-running Node/Express app. A free Render web service was selected as the most practical zero-cost deployment target for public play.

Important deployment notes:

- Render’s free `onrender.com` subdomain can be used with no domain cost.
- A custom domain is optional and would be bought separately.
- The in-memory runtime/session map works for a single app instance but is not durable across process restarts.
- If persistence becomes important later, shared knowledge and/or sessions should move to a real datastore.

## Current limitations

- This is still a **Locomotive BASIC–style subset VM**, not a full emulator.
- Exact duplicate question prevention only matches identical text, not semantic equivalents.
- Session state is in memory.
- Session state disappears on process restart.
- Shared knowledge persistence may need a proper backing store depending on the final deployment target.
- Parser/runtime behavior still benefits from explicit BASIC control flow rather than highly compressed inline statements.

## Suggested next steps

- Persist shared knowledge explicitly to disk or a database.
- Add session expiry/cleanup for idle runtimes.
- Support loading different `.bas` programs from a menu.
- Expand the supported BASIC command subset.
- Add save/load snapshots for VM state.
- Add a better deployment-ready storage model for multiplayer public use.

## Summary

This project is now a browser-playable CPC-inspired BASIC VM application where the **visible BASIC code is the game**. The server runs the BASIC program, the GUI follows execution, the game learns new objects/questions through BASIC teaching logic, duplicate learned question text is prevented, and multiplayer behavior is being moved toward per-session runtimes with shared knowledge.
