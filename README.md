## Project Overview

This repository contains a complete, production-ready Sudoku game built using vanilla HTML, CSS, and JavaScript. The game is designed for deployment on Poki Games and similar HTML5 gaming platforms, with monetization through an ad-supported hint system.

## Status: Ready for deployment

## What This Project Contains

Game Files

index.html
Main HTML file that defines the game structure and loads the Poki SDK.

styles.css
All styling for the game, including layout, responsive design, and dark mode support.

sudoku.js
Core game logic, puzzle generation, validation, timer, hint system, and Poki SDK integration.


## Game Features
## Core Gameplay

Classic 9x9 Sudoku board

Puzzle generation using a backtracking algorithm

Three difficulty levels: Easy, Medium, Hard

Real-time conflict detection with visual highlighting

Automatic detection of puzzle completion

Game timer displayed in MM:SS format

User Interface

Fully responsive layout for mobile, tablet, and desktop

Dark mode and light mode with saved preference

Pause and resume functionality with number hiding

On-screen number pad (1–9 and clear)

Cell highlighting and selection states

Keyboard input support

Monetization and Ads

Hint system 

Hints unlocked by watching rewarded video ads

Integrated with the Poki JavaScript SDK

Hint counter displayed to the user

Fallback behavior for local testing without ads

## User Safety and Experience

Confirmation dialogs before resetting the game

Confirmation when changing difficulty during a game

Game state preserved when paused

Theme preference saved using localStorage

## Getting Started
## Local Testing

Open index.html in any modern web browser

Play the game normally

Click “Get Hint” to test the hint system (ads are skipped in local mode)

Open browser DevTools to verify there are no console errors


## Monetization Model

Hints are monetized using rewarded video ads.

## Flow:

Player clicks “Get Hint”

Poki SDK shows a rewarded video ad

If the ad is completed, a correct value is revealed in one empty cell

If the ad is skipped, no hint is granted


## Dark Mode

Dark mode is implemented using CSS variables and persisted using localStorage. High-contrast borders are used to maintain clarity in low-light conditions.

## Customization

Colors and styles can be adjusted in styles.css.
Game logic and difficulty tuning can be modified in sudoku.js.


## License

This project is licensed under the MIT License.

You are free to modify, use, and deploy the game, including for commercial purposes.

## Support

If issues occur:

Check the browser console for errors

Ensure all files are in the same directory

Clear browser cache

Test in a different browser
