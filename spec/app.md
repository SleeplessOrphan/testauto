---
# Change this to `ready` when the spec is filled in. The planner ignores the spec while it says `draft`.
status: ready
---

# Maths Snake

Maths Snake is a competitive, two-player educational game based on the traditional Snake game. Players use the same keyboard and compete within a shared playing area, collecting correct answers to maths questions to grow their snakes and increase their scores.

## Goals

- Allow two players to compete simultaneously using a single keyboard.
- Develop mathematical fluency and mental arithmetic through competitive gameplay.
- Allow players with different levels of mathematical ability to compete against each other.
- Provide dynamically generated maths questions across a range of mathematical topics.
- Provide immediate feedback on mathematical accuracy and game performance.
- Allow players to customise the game length, mathematical difficulty and gameplay difficulty.

## Non-goals

- Online multiplayer or remote competition.
- User accounts or authentication.
- Teacher dashboards or centralised reporting.
- Integration with learning management systems.
- AI-generated maths questions.
- Mobile or touchscreen gameplay.
- Global leaderboards.
- Computer-controlled opponents.

## User stories

### Story 1: Main menu

As a player, I want to access a main menu so that I can start a game, review the instructions or change the settings.

Acceptance criteria:

- Given the application has loaded, when the main menu appears, then the player sees the game title and options to play, view instructions and access settings.
- Given the main menu is displayed, when the player selects Play, then the game setup screen opens.
- Given the main menu is displayed, when the player selects Instructions, then the game rules and keyboard controls are displayed.

### Story 2: Player setup

As a player, I want to enter my name and configure my mathematical difficulty so that I can compete at an appropriate level.

Acceptance criteria:

- Given the game setup screen is displayed, when the players enter their names, then both names are displayed during gameplay.
- Given the game setup screen is displayed, when a player selects a mathematical difficulty, then they can choose Easy, Medium or Hard independently of the other player.
- Given neither player has entered a name, when the game starts, then the default names Player 1 and Player 2 are used.
- Given the players have completed the setup, when Start Game is selected, then a three-second countdown appears before gameplay begins.

### Story 3: Shared playing area

As a player, I want to compete against another player within the same playing area so that we can interact during gameplay.

Acceptance criteria:

- Given a new game has started, when the playing area appears, then two snakes are displayed at separate starting positions.
- Given the snakes have spawned, when gameplay begins, then each snake consists of three segments.
- Given both snakes are displayed, then each snake has a distinct colour and player identifier.
- Given the browser window is resized, when the playing area adjusts, then the entire game grid remains visible without changing the game state.

### Story 4: Simultaneous keyboard controls

As a player, I want to control my snake independently so that both players can play simultaneously using the same keyboard.

Acceptance criteria:

- Given a game is running, when Player 1 presses W, A, S or D, then their snake changes direction accordingly.
- Given a game is running, when Player 2 presses an arrow key, then their snake changes direction accordingly.
- Given both players press valid movement keys simultaneously, when the next movement cycle occurs, then both snakes respond independently.
- Given a snake is moving in one direction, when the player attempts to immediately reverse direction, then the input is ignored.
- Given neither player presses a key, when the game continues, then both snakes continue moving in their current directions.
- Given a game is running, when an arrow key is pressed, then the browser does not scroll.

### Story 5: Mathematical topic selection

As a player, I want to select mathematical topics so that I can practise specific mathematical skills.

Acceptance criteria:

- Given the game setup screen is displayed, when a player selects mathematical topics, then they can select one or more of the following:
  - Addition
  - Subtraction
  - Multiplication
  - Division
  - Square numbers
  - Square roots
  - Percentages
  - Mixed operations
- Given a player has selected specific topics, when gameplay begins, then only questions from those topics are generated for that player.
- Given a player has selected multiple topics, when new questions are generated, then the questions are drawn from those topics.
- Given no topics are selected, when the player attempts to start the game, then a validation message is displayed.

### Story 6: Maths question generation

As a player, I want to receive dynamically generated maths questions so that each game provides a different mathematical challenge.

Acceptance criteria:

- Given a game starts, when the first question is generated, then each player sees their own question above the playing area.
- Given a question is generated, then it has exactly one correct answer and two distinct incorrect answers.
- Given a division question is generated, then the correct answer is a whole number and the divisor is not zero.
- Given a square root question is generated, then the correct answer is a whole number.
- Given a mixed operations question is generated, then the correct answer follows the standard order of operations.
- Given a player collects an answer, when the next movement cycle occurs, then a new question is displayed for that player.
- Given a player receives a new question, then the other player's question remains unchanged.

### Story 7: Mathematical difficulty

As a player, I want to control the difficulty of my maths questions so that the game is appropriately challenging.

Acceptance criteria:

- Given Easy difficulty is selected, when questions are generated, then they use small numbers and basic mathematical calculations.
- Given Medium difficulty is selected, when questions are generated, then they use larger numbers and more challenging calculations.
- Given Hard difficulty is selected, when questions are generated, then they use larger numbers or more complex calculations.
- Given two players select different difficulty levels, when gameplay begins, then each player receives questions appropriate to their selected difficulty.

The mathematical difficulty settings must use the following parameters:

| Topic            | Easy                           | Medium                          | Hard                                   |
| ---------------- | ------------------------------ | ------------------------------- | -------------------------------------- |
| Addition         | Operands up to 20              | Operands up to 100              | Operands up to 1,000                   |
| Subtraction      | Operands up to 20              | Operands up to 100              | Operands up to 1,000                   |
| Multiplication   | Factors up to 5                | Factors up to 12                | Factors up to 20                       |
| Division         | Divisors and quotients up to 5 | Divisors and quotients up to 12 | Divisors and quotients up to 20        |
| Squares          | Bases up to 5                  | Bases up to 12                  | Bases up to 25                         |
| Square roots     | Perfect squares up to 25       | Perfect squares up to 144       | Perfect squares up to 625              |
| Percentages      | 10% and 50%                    | Common multiples of 5%          | Any whole-number percentage            |
| Mixed operations | Two operations                 | Three operations                | Three or four operations with brackets |

### Story 8: Answer placement

As a player, I want potential answers to appear within the playing area so that I can navigate my snake towards the correct answer.

Acceptance criteria:

- Given a question is displayed, then three corresponding answer tiles appear within the playing area.
- Given both players have active questions, then six answer tiles are displayed.
- Given an answer tile is displayed, then it includes the numerical answer, the player's colour and their player identifier.
- Given new answer tiles are generated, then they do not overlap snakes, obstacles or existing answer tiles.
- Given new answer tiles are generated, then each answer occupies an accessible position.
- Given a player moves over an answer belonging to the other player, then the answer remains available and neither player's score changes.
- Given the playing area has insufficient space for new answer tiles, then the round ends and the results screen is displayed.

### Story 9: Collecting correct answers

As a player, I want to collect correct answers so that I can increase my score and grow my snake.

Acceptance criteria:

- Given a player moves their snake onto their correct answer, then their score increases by 10 points.
- Given a correct answer has been collected, then the snake grows by one segment.
- Given a correct answer has been collected, then all three answer tiles belonging to that player disappear.
- Given a correct answer has been collected, then a new question and three corresponding answers appear.
- Given a correct answer has been collected, then positive visual feedback is displayed.

### Story 10: Collecting incorrect answers

As a player, I want to receive feedback when I collect an incorrect answer so that I can identify mathematical mistakes.

Acceptance criteria:

- Given a player collects an incorrect answer, then their score decreases by five points.
- Given a player's score is below five points, when they collect an incorrect answer, then their score becomes zero.
- Given a player collects an incorrect answer, then their snake shrinks by one segment unless it is already three segments long.
- Given an incorrect answer is collected, then the correct answer to the question is displayed temporarily in the player's feedback area.
- Given feedback is displayed, then gameplay continues without interrupting either player.
- Given an incorrect answer has been collected, then a new question and three corresponding answers appear.

### Story 11: Answer streaks

As a player, I want to receive a bonus for consecutive correct answers so that mathematical accuracy is rewarded.

Acceptance criteria:

- Given a player collects a correct answer, then their consecutive correct answer count increases by one.
- Given a player collects five consecutive correct answers, then they receive an additional 20 points.
- Given a player receives a streak bonus, then a visual notification is displayed.
- Given a player collects an incorrect answer, then their streak resets to zero.
- Given a player collects ten consecutive correct answers, then they receive a second 20-point bonus.

### Story 12: Collision detection

As a player, I want collisions to have consequences so that navigating the playing area remains challenging.

Acceptance criteria:

- Given a snake moves into a wall, then the player loses one life.
- Given a snake collides with its own body, then the player loses one life.
- Given a snake collides with an obstacle, then the player loses one life.
- Given a snake collides with the body of the other player's snake, then the player responsible for the collision loses one life.
- Given both snake heads collide during the same movement cycle, then both players lose one life.
- Given both snake heads attempt to exchange positions during the same movement cycle, then both players lose one life.
- Given a snake moves into a tail position that is vacated during the same movement cycle, then a collision does not occur.

### Story 13: Lives and respawning

As a player, I want multiple lives so that a single mistake does not immediately end my game.

Acceptance criteria:

- Given a new competitive game starts, then each player has three lives.
- Given a player loses a life and has remaining lives, then their snake respawns at a safe location with three segments.
- Given a player respawns, then their existing score is retained.
- Given a player respawns, then they retain their current maths question.
- Given a player loses their final life, then their snake and answer tiles are removed from the playing area.
- Given a player has been eliminated, then their keyboard controls no longer affect the game.
- Given one player loses a life, then the other player can continue playing without interruption.

### Story 14: Gameplay difficulty

As a player, I want to configure the speed and complexity of the playing area independently of mathematical difficulty.

Acceptance criteria:

- Given Easy gameplay difficulty is selected, then snakes move at three grid cells per second and no obstacles are displayed.
- Given Medium gameplay difficulty is selected, then snakes move at five grid cells per second and four obstacles are displayed.
- Given Hard gameplay difficulty is selected, then snakes move at eight grid cells per second and eight obstacles are displayed.
- Given obstacles are generated, then they do not overlap starting positions or other game objects.
- Given a gameplay difficulty is selected, then it applies equally to both players.
- Given gameplay difficulty changes, then the players' mathematical difficulty settings remain unchanged.

### Story 15: Timed game mode

As a player, I want to compete within a fixed time limit so that the game has a predictable duration.

Acceptance criteria:

- Given Timed mode is selected, when the game is configured, then players can select one, three or five minutes.
- Given a timed game starts, then a countdown timer is displayed.
- Given one player is eliminated, then the remaining player can continue until the timer expires.
- Given the timer reaches zero or both players are eliminated, then gameplay stops.
- Given the game ends, then the player with the highest score is declared the winner.
- Given both players have identical scores, then the result is declared a draw.

### Story 16: Survival game mode

As a player, I want to compete until one player loses all their lives so that survival determines the winner.

Acceptance criteria:

- Given Survival mode is selected, then no countdown timer is displayed.
- Given one player loses their final life, then gameplay stops.
- Given one player has remaining lives and the other has none, then the surviving player is declared the winner.
- Given both players lose their final life during the same movement cycle, then the player with the highest score wins.
- Given both players are eliminated simultaneously and have equal scores, then the result is declared a draw.

### Story 17: Target score game mode

As a player, I want to compete towards a target score so that mathematical performance determines the winner.

Acceptance criteria:

- Given Target Score mode is selected, then players can select a target of 100, 200 or 500 points.
- Given the game starts, then the target score is displayed.
- Given a player reaches or exceeds the target score, then gameplay stops and that player is declared the winner.
- Given both players reach the target score during the same movement cycle, then the player with the highest score wins.
- Given both players reach the target simultaneously with identical scores, then the result is declared a draw.
- Given both players are eliminated before reaching the target score, then the player with the highest score wins or a draw is declared if their scores are equal.

### Story 18: Practice game mode

As a player, I want to practise without a time limit or limited lives so that I can develop my mathematical skills.

Acceptance criteria:

- Given Practice mode is selected, then no countdown timer is displayed.
- Given Practice mode is active, then players have unlimited lives.
- Given a player experiences a collision, then their snake respawns without being eliminated.
- Given players collect correct or incorrect answers, then scores and mathematical accuracy are still recorded.
- Given a player selects End Game from the pause menu, then the results screen is displayed without declaring a winner.

### Story 19: Live game statistics

As a player, I want to see my performance during gameplay so that I can monitor my progress.

Acceptance criteria:

- Given a game is running, then each player can see their name, current question, score, remaining lives and answer streak.
- Given a player collects an answer, then their displayed score updates immediately.
- Given a player loses a life, then their remaining lives update immediately.
- Given a timed game is running, then the remaining time is displayed.
- Given a player is eliminated, then their status changes to Eliminated.

### Story 20: Pause and resume

As a player, I want to pause the game so that gameplay can be temporarily interrupted.

Acceptance criteria:

- Given a game is running, when either player presses Escape, then the game pauses and a pause menu appears.
- Given the game is paused, then snake movement, answer collection and the game timer stop.
- Given the pause menu is displayed, when Resume is selected, then the game resumes following a three-second countdown.
- Given the pause menu is displayed, when Restart is selected and confirmed, then scores, lives and questions reset.
- Given the pause menu is displayed, when Exit is selected and confirmed, then the main menu is displayed.
- Given the browser tab loses focus during gameplay, then the game automatically pauses.

### Story 21: Results screen

As a player, I want to review my performance at the end of a game so that I can compare my mathematical accuracy and gameplay performance.

Acceptance criteria:

- Given a competitive game ends, then the results screen displays the winner or declares a draw.
- Given a game ends, then the following statistics are displayed for each player:
  - Final score
  - Correct answers
  - Incorrect answers
  - Total questions answered
  - Percentage accuracy
  - Longest correct answer streak
  - Longest snake length
  - Number of collisions
- Given a player has not answered any questions, then their accuracy is displayed as Not Available.
- Given the results screen is displayed, when Play Again is selected, then a new game begins using the previous settings.
- Given the results screen is displayed, when Change Settings is selected, then the game setup screen opens.
- Given the results screen is displayed, when Main Menu is selected, then the main menu opens.

### Story 22: Visual design and feedback

As a player, I want a clear and visually engaging interface so that I can quickly distinguish questions, answers and game objects.

Acceptance criteria:

- Given the application loads, then it uses a consistent, modern arcade-style interface.
- Given both snakes are displayed, then they can be distinguished using colour and visual identifiers.
- Given answer tiles are displayed, then the numerical values and player identifiers are clearly readable.
- Given a player collects a correct answer, then positive visual feedback is displayed.
- Given a player collects an incorrect answer, then negative visual feedback is displayed.
- Given a collision occurs, then the affected player receives visual feedback.
- Given animations are displayed, then they do not obscure questions, answer tiles or other game objects.
- Given reduced motion is enabled in the operating system, then non-essential animations are disabled.

### Story 23: Sound settings

As a player, I want to control game sounds so that I can play without disturbing other people.

Acceptance criteria:

- Given the settings screen is displayed, then the player can enable or disable sound effects.
- Given sound effects are enabled, then distinct sounds are played for correct answers, incorrect answers, collisions and streak bonuses.
- Given sound effects are disabled, then no game sounds are played.
- Given the sound setting changes, then it takes effect immediately.
- Given the game is played without sound, then all essential feedback remains available visually.

### Story 24: Persistent preferences

As a returning player, I want the application to retain my preferences so that I do not need to configure the game every time.

Acceptance criteria:

- Given players complete the game setup, then their names, selected topics, difficulty settings and game mode are saved locally.
- Given a player changes the sound settings, then the preference is saved locally.
- Given the application is closed and reopened using the same browser, then the previously saved settings are restored.
- Given a player selects Reset Settings, then stored preferences are removed and default settings are restored.
- Given local storage is unavailable, then the application remains playable using default settings.

## Constraints

- **Technology:** Next.js using the App Router and TypeScript, deployed on Vercel.
- **Rendering:** HTML5 Canvas should be used to render the game grid, snakes, obstacles and answer tiles. Standard HTML and CSS should be used for menus, questions, statistics and settings.
- **Architecture:** Game logic, mathematical question generation, collision detection, rendering and user interface components must be separated.
- **Database:** No database is required. Preferences must be stored using browser local storage.
- **Game grid:** The playing area must use a fixed logical grid of 40 columns and 25 rows, scaled to fit the browser window.
- **Game engine:** Both snakes must update within the same movement cycle. Collision detection must resolve both players' proposed movements before applying the results.
- **Keyboard:** The application must support simultaneous keyboard inputs without requiring players to take turns.
- **Mathematical accuracy:** All generated questions must be mathematically valid, with exactly one correct answer and two unique incorrect answers.
- **Accessibility:** Menus, settings, questions, statistics and feedback must conform to WCAG 2.2 AA. Information must not be communicated through colour or sound alone. The spatial, real-time gameplay is not expected to be fully screen-reader accessible in this version.
- **Browsers:** Support current desktop versions of Chrome, Edge, Firefox and Safari.
- **Responsive design:** Support desktop and laptop displays, including resolutions of 1280 × 720 and above.
- **Performance:** Gameplay must run smoothly on standard educational laptops without requiring dedicated graphics hardware.
- **Privacy:** No personal information, game statistics or player preferences should be transmitted to an external service.
- **Dependencies:** Avoid external APIs, unnecessary third-party libraries and externally hosted game assets.
- **Testing:** Mathematical question generation, scoring, game state transitions and collision detection must be covered by automated unit tests. User stories must also be covered by browser-based acceptance tests.
- **Language:** All interface text must use British English.

I have specified 24 independently implementable user stories, with observable acceptance criteria suitable for automated browser testing.

The additional implementation decisions are a 40 × 25 grid, defined snake movement speeds, local storage for preferences and explicit rules for simultaneous collisions and tied results. These remove ambiguities that would otherwise be left to the development agent.
