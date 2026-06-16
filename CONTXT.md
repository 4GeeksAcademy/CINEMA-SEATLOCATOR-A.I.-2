# CONTXT

## Project
Cinema Seat Reservation System with:
- Shared TypeScript domain logic
- Interactive CLI adapter
- Browser dashboard adapter

## Core Features
- 8 rows x 10 seats (80 total)
- Reserve a seat
- Check seat availability
- Count available seats
- Find adjacent seats
- Recommend best available row
- Reset theater state

## Main Files
- `src/seat-reservation.contract.ts`: domain contracts, constants, result/error types
- `src/seat-reservation.ts`: business logic implementation
- `src/cli.ts`: CLI commands and interactive loop
- `src/dashboard.ts`: dashboard state, rendering, and event handlers
- `src/main.ts`: browser bootstrap for dashboard
- `src/style.css`: dashboard visual styles
- `TESTING_CHECKLIST.md`: function-by-function test coverage checklist

## Run Commands
- `npm run start`: start dashboard (Vite)
- `npm run cli`: launch interactive CLI
- `npm run cli -- show`: run one CLI command in argument mode
- `npm run typecheck`: TypeScript validation

## CLI Commands
- `help`
- `show`
- `reserve <row> <seat>`
- `available <row> <seat>`
- `count`
- `adjacent <groupSize>`
- `best-row`
- `reset`
- `exit`

## Behavior Notes
- User-facing coordinates are 1-based (Row 1-8, Seat 1-10)
- Internal indexes are 0-based
- Best-row tie-break uses first row found by scan order
- Dashboard seat click is select-first, then confirm reservation
