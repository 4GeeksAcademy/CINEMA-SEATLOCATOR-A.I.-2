/**
 * Cinema Seat Reservation System
 * Contract definitions only (no implementation).
 */

export const THEATER_ROWS = 8;
export const SEATS_PER_ROW = 10;
export const TOTAL_SEATS = THEATER_ROWS * SEATS_PER_ROW;

/**
 * false = available, true = reserved
 */
export type Seat = boolean;

export type TheaterMatrix = Seat[][];

export type RowNumber = number;
export type SeatNumber = number;
export type GroupSize = number;

export interface SeatCoordinate {
  rowNumber: RowNumber;
  seatNumber: SeatNumber;
}

export interface InternalSeatCoordinate {
  rowIndex: number;
  seatIndex: number;
}

export type RowKind = "front" | "back" | "standard";

export interface RowLabel {
  rowNumber: RowNumber;
  kind: RowKind;
  label: string;
}

export enum ErrorCode {
  INVALID_ROW = "INVALID_ROW",
  INVALID_SEAT = "INVALID_SEAT",
  INVALID_GROUP_SIZE = "INVALID_GROUP_SIZE",
  INVALID_COORDINATE_INTERNAL = "INVALID_COORDINATE_INTERNAL",
  SEAT_ALREADY_RESERVED = "SEAT_ALREADY_RESERVED",
  THEATER_FULL = "THEATER_FULL",
  NO_ADJACENT_BLOCK = "NO_ADJACENT_BLOCK",
  NO_BEST_ROW = "NO_BEST_ROW",
  MISSING_THEATER = "MISSING_THEATER",
  INVALID_MATRIX = "INVALID_MATRIX",
  INVALID_INPUT = "INVALID_INPUT",
}

export interface ValidationIssue {
  code: ErrorCode;
  field?: "rowNumber" | "seatNumber" | "groupSize" | "theater";
  message: string;
}

export interface OperationError {
  code: ErrorCode;
  message: string;
  details?: ValidationIssue[];
}

export interface OperationSuccess<TPayload> {
  ok: true;
  message: string;
  payload: TPayload;
}

export interface OperationFailure {
  ok: false;
  message: string;
  error: OperationError;
}

export type OperationResult<TPayload> = OperationSuccess<TPayload> | OperationFailure;

export interface SeatValidationPayload {
  coordinate: SeatCoordinate;
  internal: InternalSeatCoordinate;
}

export interface SeatAvailabilityPayload {
  coordinate: SeatCoordinate;
  available: boolean;
}

export interface ReservationPayload {
  coordinate: SeatCoordinate;
  reserved: true;
  remainingSeats: number;
}

export interface AdjacentSeatsPayload {
  groupSize: GroupSize;
  seats: SeatCoordinate[];
}

export interface BestRowPayload {
  rowNumber: RowNumber;
  availableSeats: number;
  rowLabel: RowLabel;
}

export interface DisplayTheaterOptions {
  showLegend?: boolean;
  showSummary?: boolean;
  screenLabel?: string;
  availableSymbol?: "O" | string;
  reservedSymbol?: "X" | string;
}

export interface DisplayTheaterPayload {
  layout: string;
  availableSeats: number;
  totalSeats: number;
}

/**
 * Build an empty theater with all seats available.
 */
export type CreateTheater = (
  rows?: number,
  seatsPerRow?: number
) => OperationResult<TheaterMatrix>;

/**
 * Validate external seat coordinates and convert to internal indexes.
 */
export type IsValidSeat = (
  rowNumber: unknown,
  seatNumber: unknown,
  theater?: TheaterMatrix
) => OperationResult<SeatValidationPayload>;

/**
 * Render theater for CLI output.
 */
export type DisplayTheater = (
  theater: TheaterMatrix,
  options?: DisplayTheaterOptions
) => OperationResult<DisplayTheaterPayload>;

/**
 * Determine if a seat is currently available.
 */
export type IsSeatAvailable = (
  theater: TheaterMatrix,
  rowNumber: unknown,
  seatNumber: unknown
) => OperationResult<SeatAvailabilityPayload>;

/**
 * Reserve a seat if valid and available.
 */
export type ReserveSeat = (
  theater: TheaterMatrix,
  rowNumber: unknown,
  seatNumber: unknown
) => OperationResult<ReservationPayload>;

/**
 * Count all available seats in the theater.
 */
export type CountAvailable = (theater: TheaterMatrix) => OperationResult<number>;

/**
 * Find first contiguous block of seats in one row.
 */
export type FindAdjacentSeats = (
  theater: TheaterMatrix,
  groupSize: unknown
) => OperationResult<AdjacentSeatsPayload>;

/**
 * Generate front/back/standard row labels.
 */
export type GetRowLabel = (rowNumber: unknown) => OperationResult<RowLabel>;

/**
 * Recommend row with most open seats.
 */
export type GetBestAvailableRow = (
  theater: TheaterMatrix
) => OperationResult<BestRowPayload>;

/**
 * Optional aggregate contract for dependency injection and testing.
 */
export interface SeatReservationContract {
  createTheater: CreateTheater;
  isValidSeat: IsValidSeat;
  displayTheater: DisplayTheater;
  isSeatAvailable: IsSeatAvailable;
  reserveSeat: ReserveSeat;
  countAvailable: CountAvailable;
  findAdjacentSeats: FindAdjacentSeats;
  getRowLabel: GetRowLabel;
  getBestAvailableRow: GetBestAvailableRow;
}
