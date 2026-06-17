import { describe, expect, it } from "vitest";
import {
  ErrorCode,
  SEATS_PER_ROW,
  THEATER_ROWS,
  type TheaterMatrix,
} from "../src/seat-reservation.contract";
import { seatReservation } from "../src/seat-reservation";

const createFreshTheater = (): TheaterMatrix => {
  const created = seatReservation.createTheater();
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  return created.payload;
};

const createFullTheater = (): TheaterMatrix =>
  Array.from({ length: THEATER_ROWS }, () => Array.from({ length: SEATS_PER_ROW }, () => true));

describe("Cinema Seat Reservation Contract", () => {
  it("createTheater: returns 8x10 matrix with all seats available", () => {
    const result = seatReservation.createTheater();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload).toHaveLength(THEATER_ROWS);
    result.payload.forEach((row) => {
      expect(row).toHaveLength(SEATS_PER_ROW);
      row.forEach((seat) => expect(seat).toBe(false));
    });
  });

  it("isValidSeat: validates 1-based coordinates and maps to 0-based indexes", () => {
    const theater = createFreshTheater();

    const valid = seatReservation.isValidSeat(1, 1, theater);
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;

    expect(valid.payload.coordinate).toEqual({ rowNumber: 1, seatNumber: 1 });
    expect(valid.payload.internal).toEqual({ rowIndex: 0, seatIndex: 0 });

    const invalid = seatReservation.isValidSeat(9, 1, theater);
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;

    expect(invalid.error.code).toBe(ErrorCode.INVALID_ROW);
  });

  it("displayTheater: renders screen-first layout with O/X and summary", () => {
    const theater = createFreshTheater();
    theater[0][0] = true;

    const shown = seatReservation.displayTheater(theater);
    expect(shown.ok).toBe(true);
    if (!shown.ok) return;

    expect(shown.payload.layout).toContain("SCREEN");
    expect(shown.payload.layout).toContain("Row 1 [X O O O O O O O O O]");
    expect(shown.payload.layout).toContain("Available Seats: 79 / 80");
  });

  it("isSeatAvailable: reports true for free seats and false for reserved seats", () => {
    const theater = createFreshTheater();

    const initiallyFree = seatReservation.isSeatAvailable(theater, 1, 1);
    expect(initiallyFree.ok).toBe(true);
    if (!initiallyFree.ok) return;
    expect(initiallyFree.payload.available).toBe(true);

    theater[0][0] = true;
    const nowReserved = seatReservation.isSeatAvailable(theater, 1, 1);
    expect(nowReserved.ok).toBe(true);
    if (!nowReserved.ok) return;
    expect(nowReserved.payload.available).toBe(false);
  });

  it("reserveSeat: reserves once and blocks duplicate reservation", () => {
    const theater = createFreshTheater();

    const first = seatReservation.reserveSeat(theater, 1, 1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.payload.remainingSeats).toBe(79);

    const duplicate = seatReservation.reserveSeat(theater, 1, 1);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;

    expect(duplicate.error.code).toBe(ErrorCode.SEAT_ALREADY_RESERVED);
  });

  it("countAvailable: returns accurate count across empty/full/mixed states", () => {
    const empty = createFreshTheater();
    const full = createFullTheater();
    const mixed = createFreshTheater();
    mixed[0][0] = true;
    mixed[7][9] = true;

    const emptyCount = seatReservation.countAvailable(empty);
    const fullCount = seatReservation.countAvailable(full);
    const mixedCount = seatReservation.countAvailable(mixed);

    expect(emptyCount.ok && emptyCount.payload).toBe(80);
    expect(fullCount.ok && fullCount.payload).toBe(0);
    expect(mixedCount.ok && mixedCount.payload).toBe(78);
  });

  it("findAdjacentSeats: returns first deterministic contiguous block", () => {
    const theater = createFreshTheater();
    theater[0][0] = true;
    theater[0][1] = true;

    const result = seatReservation.findAdjacentSeats(theater, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload.seats).toEqual([
      { rowNumber: 1, seatNumber: 3 },
      { rowNumber: 1, seatNumber: 4 },
      { rowNumber: 1, seatNumber: 5 },
    ]);
  });

  it("getRowLabel: maps rows to front/back/standard labels", () => {
    const front = seatReservation.getRowLabel(1);
    const middle = seatReservation.getRowLabel(4);
    const back = seatReservation.getRowLabel(8);

    expect(front.ok && front.payload.kind).toBe("front");
    expect(middle.ok && middle.payload.kind).toBe("standard");
    expect(back.ok && back.payload.kind).toBe("back");
  });

  it("getBestAvailableRow: returns row with highest availability with tie policy", () => {
    const tie = createFreshTheater();
    const tieResult = seatReservation.getBestAvailableRow(tie);
    expect(tieResult.ok).toBe(true);
    if (!tieResult.ok) return;

    expect(tieResult.payload.rowNumber).toBe(1);
    expect(tieResult.payload.availableSeats).toBe(10);

    const weighted = createFreshTheater();
    weighted[0][0] = true;
    weighted[0][1] = true;

    const weightedResult = seatReservation.getBestAvailableRow(weighted);
    expect(weightedResult.ok).toBe(true);
    if (!weightedResult.ok) return;

    expect(weightedResult.payload.rowNumber).toBe(2);

    const full = createFullTheater();
    const fullResult = seatReservation.getBestAvailableRow(full);
    expect(fullResult.ok).toBe(false);
    if (fullResult.ok) return;

    expect(fullResult.error.code).toBe(ErrorCode.NO_BEST_ROW);
  });

  it("findAdjacentSeats: rejects invalid group sizes", () => {
    const theater = createFreshTheater();

    const zero = seatReservation.findAdjacentSeats(theater, 0);
    const tooLarge = seatReservation.findAdjacentSeats(theater, 11);

    expect(zero.ok).toBe(false);
    expect(tooLarge.ok).toBe(false);

    if (!zero.ok) expect(zero.error.code).toBe(ErrorCode.INVALID_GROUP_SIZE);
    if (!tooLarge.ok) expect(tooLarge.error.code).toBe(ErrorCode.INVALID_GROUP_SIZE);
  });
});
