import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { TheaterMatrix } from "./seat-reservation.contract";
import { seatReservation } from "./seat-reservation";

const HELP_TEXT = `
Cinema Seat Reservation CLI

Commands:
  help                          Show this help
  show                          Display theater layout
  reserve <row> <seat>          Reserve a seat
  available <row> <seat>        Check seat availability
  count                         Show remaining seats
  adjacent <groupSize>          Find first adjacent block
  best-row                      Recommend row with most open seats
  reset                         Reset theater to all available
  exit                          Exit interactive mode
`;

const parseIntSafe = (value: string | undefined): number => Number.parseInt(value ?? "", 10);

const formatError = (message: string): string => `ERROR: ${message}`;
const formatOk = (message: string): string => `OK: ${message}`;

const runCommand = (theater: TheaterMatrix, commandLine: string): { done: boolean; output: string[] } => {
  const [commandRaw, ...args] = commandLine.trim().split(/\s+/);
  const command = (commandRaw ?? "").toLowerCase();
  const lines: string[] = [];

  if (!command) {
    return { done: false, output: lines };
  }

  if (command === "help") {
    lines.push(HELP_TEXT.trim());
    return { done: false, output: lines };
  }

  if (command === "show") {
    const shown = seatReservation.displayTheater(theater);
    lines.push(shown.ok ? shown.payload.layout : formatError(shown.error.message));
    return { done: false, output: lines };
  }

  if (command === "reserve") {
    const row = parseIntSafe(args[0]);
    const seat = parseIntSafe(args[1]);
    const result = seatReservation.reserveSeat(theater, row, seat);
    lines.push(result.ok
      ? formatOk(`Reserved Row ${row} Seat ${seat}. Remaining seats: ${result.payload.remainingSeats}.`)
      : formatError(`${result.error.code} - ${result.error.message}`));
    return { done: false, output: lines };
  }

  if (command === "available") {
    const row = parseIntSafe(args[0]);
    const seat = parseIntSafe(args[1]);
    const result = seatReservation.isSeatAvailable(theater, row, seat);
    lines.push(result.ok
      ? formatOk(`Row ${row} Seat ${seat} is ${result.payload.available ? "available" : "reserved"}.`)
      : formatError(`${result.error.code} - ${result.error.message}`));
    return { done: false, output: lines };
  }

  if (command === "count") {
    const result = seatReservation.countAvailable(theater);
    lines.push(result.ok
      ? formatOk(`Available seats: ${result.payload}.`)
      : formatError(`${result.error.code} - ${result.error.message}`));
    return { done: false, output: lines };
  }

  if (command === "adjacent") {
    const groupSize = parseIntSafe(args[0]);
    const result = seatReservation.findAdjacentSeats(theater, groupSize);
    lines.push(result.ok
      ? formatOk(
          `Adjacent seats: ${result.payload.seats
            .map((seat) => `R${seat.rowNumber}S${seat.seatNumber}`)
            .join(", ")}.`
        )
      : formatError(`${result.error.code} - ${result.error.message}`));
    return { done: false, output: lines };
  }

  if (command === "best-row") {
    const result = seatReservation.getBestAvailableRow(theater);
    lines.push(result.ok
      ? formatOk(
          `${result.payload.rowLabel.label} has ${result.payload.availableSeats} open seats.`
        )
      : formatError(`${result.error.code} - ${result.error.message}`));
    return { done: false, output: lines };
  }

  if (command === "reset") {
    const created = seatReservation.createTheater();
    if (!created.ok) {
      lines.push(formatError(`${created.error.code} - ${created.error.message}`));
      return { done: false, output: lines };
    }

    theater.splice(0, theater.length, ...created.payload);
    lines.push(formatOk("Theater reset successfully."));
    return { done: false, output: lines };
  }

  if (command === "exit" || command === "quit") {
    lines.push("Exiting CLI session.");
    return { done: true, output: lines };
  }

  lines.push(formatError(`Unknown command: ${command}. Type 'help' for a list of commands.`));
  return { done: false, output: lines };
};

const runInteractive = async (theater: TheaterMatrix): Promise<void> => {
  console.log("Cinema Seat Reservation CLI");
  console.log("Type 'help' to list commands. Type 'exit' to quit.\n");

  const rl = createInterface({ input, output });
  try {
    let done = false;
    while (!done) {
      const answer = await rl.question("> ");
      const result = runCommand(theater, answer);
      result.output.forEach((line) => console.log(line));
      done = result.done;
    }
  } finally {
    rl.close();
  }
};

const main = async (): Promise<void> => {
  const created = seatReservation.createTheater();
  if (!created.ok) {
    console.error(formatError(`${created.error.code} - ${created.error.message}`));
    process.exitCode = 1;
    return;
  }

  const theater = created.payload;
  const argv = process.argv.slice(2);

  if (argv.length > 0) {
    const result = runCommand(theater, argv.join(" "));
    result.output.forEach((line) => console.log(line));
    return;
  }

  await runInteractive(theater);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected CLI failure.";
  console.error(formatError(message));
  process.exitCode = 1;
});
