import {
  type AdjacentSeatsPayload,
  type BestRowPayload,
  type CountAvailable,
  type CreateTheater,
  type DisplayTheater,
  type DisplayTheaterOptions,
  type GetBestAvailableRow,
  type GetRowLabel,
  type IsSeatAvailable,
  type IsValidSeat,
  type OperationFailure,
  type OperationResult,
  type ReservationPayload,
  type RowKind,
  type SeatAvailabilityPayload,
  type SeatReservationContract,
  type SeatValidationPayload,
  type TheaterMatrix,
  ErrorCode,
  SEATS_PER_ROW,
  THEATER_ROWS,
  TOTAL_SEATS,
} from "./seat-reservation.contract";

const success = <TPayload>(message: string, payload: TPayload): OperationResult<TPayload> => ({
  ok: true,
  message,
  payload,
});

const failure = <TPayload>(
  code: ErrorCode,
  message: string,
  field?: "rowNumber" | "seatNumber" | "groupSize" | "theater"
): OperationResult<TPayload> => {
  const base: OperationFailure = {
    ok: false,
    message,
    error: {
      code,
      message,
    },
  };

  if (field) {
    base.error.details = [{ code, field, message }];
  }

  return base;
};

const failureOnly = (
  code: ErrorCode,
  message: string,
  field?: "rowNumber" | "seatNumber" | "groupSize" | "theater"
): OperationFailure => {
  const result = failure<never>(code, message, field);
  return result as OperationFailure;
};

const isIntegerNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);

const validateTheater = (theater: TheaterMatrix | undefined): OperationFailure | null => {
  if (!theater) {
    return failureOnly(ErrorCode.MISSING_THEATER, "The theater matrix is required.", "theater");
  }

  if (!Array.isArray(theater) || theater.length !== THEATER_ROWS) {
    return failureOnly(
      ErrorCode.INVALID_MATRIX,
      `The theater must contain exactly ${THEATER_ROWS} rows.`,
      "theater"
    );
  }

  for (const row of theater) {
    if (!Array.isArray(row) || row.length !== SEATS_PER_ROW) {
      return failureOnly(
        ErrorCode.INVALID_MATRIX,
        `Each theater row must contain exactly ${SEATS_PER_ROW} seats.`,
        "theater"
      );
    }

    for (const seat of row) {
      if (typeof seat !== "boolean") {
        return failureOnly(
          ErrorCode.INVALID_MATRIX,
          "All seats in the theater matrix must be boolean values.",
          "theater"
        );
      }
    }
  }

  return null;
};

export const createTheater: CreateTheater = (rows = THEATER_ROWS, seatsPerRow = SEATS_PER_ROW) => {
  if (!isIntegerNumber(rows) || !isIntegerNumber(seatsPerRow) || rows <= 0 || seatsPerRow <= 0) {
    return failure(
      ErrorCode.INVALID_INPUT,
      "Rows and seats per row must be positive integers."
    );
  }

  if (rows !== THEATER_ROWS || seatsPerRow !== SEATS_PER_ROW) {
    return failure(
      ErrorCode.INVALID_INPUT,
      `This prototype supports exactly ${THEATER_ROWS} rows and ${SEATS_PER_ROW} seats per row.`
    );
  }

  const theater: TheaterMatrix = Array.from({ length: rows }, () =>
    Array.from({ length: seatsPerRow }, () => false)
  );

  return success("The theater was created with all seats available.", theater);
};

export const isValidSeat: IsValidSeat = (rowNumber, seatNumber, theater) => {
  if (theater) {
    const theaterError = validateTheater(theater);
    if (theaterError) return theaterError;
  }

  if (!isIntegerNumber(rowNumber)) {
    return failure(ErrorCode.INVALID_INPUT, "Row number must be an integer.", "rowNumber");
  }

  if (!isIntegerNumber(seatNumber)) {
    return failure(ErrorCode.INVALID_INPUT, "Seat number must be an integer.", "seatNumber");
  }

  if (rowNumber < 1 || rowNumber > THEATER_ROWS) {
    return failure(
      ErrorCode.INVALID_ROW,
      `Row number must be between 1 and ${THEATER_ROWS}.`,
      "rowNumber"
    );
  }

  if (seatNumber < 1 || seatNumber > SEATS_PER_ROW) {
    return failure(
      ErrorCode.INVALID_SEAT,
      `Seat number must be between 1 and ${SEATS_PER_ROW}.`,
      "seatNumber"
    );
  }

  const rowIndex = rowNumber - 1;
  const seatIndex = seatNumber - 1;

  if (rowIndex < 0 || rowIndex >= THEATER_ROWS || seatIndex < 0 || seatIndex >= SEATS_PER_ROW) {
    return failure(
      ErrorCode.INVALID_COORDINATE_INTERNAL,
      "Converted internal seat coordinate is out of range."
    );
  }

  const payload: SeatValidationPayload = {
    coordinate: { rowNumber, seatNumber },
    internal: { rowIndex, seatIndex },
  };

  return success("Seat coordinates are valid.", payload);
};

export const countAvailable: CountAvailable = (theater) => {
  const theaterError = validateTheater(theater);
  if (theaterError) return theaterError;

  const available = theater.reduce(
    (total, row) => total + row.reduce((rowTotal, seat) => rowTotal + (seat ? 0 : 1), 0),
    0
  );

  return success("Available seats counted successfully.", available);
};

export const displayTheater: DisplayTheater = (theater, options: DisplayTheaterOptions = {}) => {
  const theaterError = validateTheater(theater);
  if (theaterError) return theaterError;

  const {
    showLegend = true,
    showSummary = true,
    screenLabel = "SCREEN",
    availableSymbol = "O",
    reservedSymbol = "X",
  } = options;

  const availableCountResult = countAvailable(theater);
  if (!availableCountResult.ok) return availableCountResult;

  const lines: string[] = [];
  lines.push(screenLabel);
  lines.push("=========================");
  lines.push("");

  if (showLegend) {
    const legend = Array.from({ length: SEATS_PER_ROW }, (_, i) => String(i + 1)).join(" ");
    lines.push(`      ${legend}`);
    lines.push("");
  }

  theater.forEach((row, rowIndex) => {
    const displayRow = row
      .map((seat) => (seat ? reservedSymbol : availableSymbol))
      .join(" ");
    lines.push(`Row ${rowIndex + 1} [${displayRow}]`);
  });

  if (showSummary) {
    lines.push("");
    lines.push(`Available Seats: ${availableCountResult.payload} / ${TOTAL_SEATS}`);
  }

  return success("Theater layout generated successfully.", {
    layout: lines.join("\n"),
    availableSeats: availableCountResult.payload,
    totalSeats: TOTAL_SEATS,
  });
};

export const isSeatAvailable: IsSeatAvailable = (theater, rowNumber, seatNumber) => {
  const theaterError = validateTheater(theater);
  if (theaterError) return theaterError;

  const validation = isValidSeat(rowNumber, seatNumber, theater);
  if (!validation.ok) return validation;

  const { rowIndex, seatIndex } = validation.payload.internal;
  const available = !theater[rowIndex][seatIndex];

  const payload: SeatAvailabilityPayload = {
    coordinate: validation.payload.coordinate,
    available,
  };

  return success("Seat availability checked successfully.", payload);
};

export const reserveSeat = (
  theater: TheaterMatrix,
  rowNumber: unknown,
  seatNumber: unknown
): OperationResult<ReservationPayload> => {
  const theaterError = validateTheater(theater);
  if (theaterError) return theaterError;

  const availableCountResult = countAvailable(theater);
  if (!availableCountResult.ok) return availableCountResult;

  if (availableCountResult.payload === 0) {
    return failure(ErrorCode.THEATER_FULL, "The theater is full.");
  }

  const validation = isValidSeat(rowNumber, seatNumber, theater);
  if (!validation.ok) return validation;

  const availability = isSeatAvailable(theater, rowNumber, seatNumber);
  if (!availability.ok) return availability;
  if (!availability.payload.available) {
    return failure(ErrorCode.SEAT_ALREADY_RESERVED, "The selected seat is already reserved.");
  }

  const { rowIndex, seatIndex } = validation.payload.internal;
  theater[rowIndex][seatIndex] = true;

  const remaining = countAvailable(theater);
  if (!remaining.ok) return remaining;

  return success("Seat reserved successfully.", {
    coordinate: validation.payload.coordinate,
    reserved: true,
    remainingSeats: remaining.payload,
  });
};

export const findAdjacentSeats = (
  theater: TheaterMatrix,
  groupSize: unknown
): OperationResult<AdjacentSeatsPayload> => {
  const theaterError = validateTheater(theater);
  if (theaterError) return theaterError;

  if (!isIntegerNumber(groupSize) || groupSize <= 0 || groupSize > SEATS_PER_ROW) {
    return failure(
      ErrorCode.INVALID_GROUP_SIZE,
      `Group size must be an integer between 1 and ${SEATS_PER_ROW}.`,
      "groupSize"
    );
  }

  for (let rowIndex = 0; rowIndex < theater.length; rowIndex += 1) {
    for (let startSeat = 0; startSeat <= SEATS_PER_ROW - groupSize; startSeat += 1) {
      let contiguous = true;
      for (let offset = 0; offset < groupSize; offset += 1) {
        if (theater[rowIndex][startSeat + offset]) {
          contiguous = false;
          break;
        }
      }

      if (contiguous) {
        const seats = Array.from({ length: groupSize }, (_, offset) => ({
          rowNumber: rowIndex + 1,
          seatNumber: startSeat + offset + 1,
        }));

        return success("Adjacent seats found.", {
          groupSize,
          seats,
        });
      }
    }
  }

  return failure(
    ErrorCode.NO_ADJACENT_BLOCK,
    `No adjacent seat block of size ${groupSize} is currently available.`
  );
};

export const getRowLabel: GetRowLabel = (rowNumber) => {
  if (!isIntegerNumber(rowNumber)) {
    return failure(ErrorCode.INVALID_INPUT, "Row number must be an integer.", "rowNumber");
  }

  if (rowNumber < 1 || rowNumber > THEATER_ROWS) {
    return failure(
      ErrorCode.INVALID_ROW,
      `Row number must be between 1 and ${THEATER_ROWS}.`,
      "rowNumber"
    );
  }

  let kind: RowKind = "standard";
  let label = `Row ${rowNumber} (Standard Row)`;

  if (rowNumber === 1) {
    kind = "front";
    label = "Row 1 (Front Row)";
  } else if (rowNumber === THEATER_ROWS) {
    kind = "back";
    label = `Row ${THEATER_ROWS} (Back Row)`;
  }

  return success("Row label generated successfully.", {
    rowNumber,
    kind,
    label,
  });
};

export const getBestAvailableRow: GetBestAvailableRow = (theater) => {
  const theaterError = validateTheater(theater);
  if (theaterError) return theaterError;

  let bestRow = -1;
  let bestAvailableCount = -1;

  for (let rowIndex = 0; rowIndex < theater.length; rowIndex += 1) {
    const rowAvailable = theater[rowIndex].reduce((total, seat) => total + (seat ? 0 : 1), 0);
    if (rowAvailable > bestAvailableCount) {
      bestAvailableCount = rowAvailable;
      bestRow = rowIndex + 1;
    }
  }

  if (bestAvailableCount <= 0 || bestRow === -1) {
    return failure(ErrorCode.NO_BEST_ROW, "No recommended row is available because the theater is full.");
  }

  const labelResult = getRowLabel(bestRow);
  if (!labelResult.ok) return labelResult;

  const payload: BestRowPayload = {
    rowNumber: bestRow,
    availableSeats: bestAvailableCount,
    rowLabel: labelResult.payload,
  };

  return success("Best available row identified successfully.", payload);
};

export const seatReservation: SeatReservationContract = {
  createTheater,
  isValidSeat,
  displayTheater,
  isSeatAvailable,
  reserveSeat,
  countAvailable,
  findAdjacentSeats,
  getRowLabel,
  getBestAvailableRow,
};
