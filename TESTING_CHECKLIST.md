# Cinema Seat Reservation - Test Contract Checklist

This checklist maps test expectations to the type contracts defined in src/seat-reservation.contract.ts.

## Scope and assumptions

- Theater dimensions are fixed at 8 rows x 10 seats unless configuration is explicitly enabled.
- External coordinates are 1-based: Row 1-8, Seat 1-10.
- Internal coordinates are 0-based: rowIndex 0-7, seatIndex 0-9.
- `false` means available, `true` means reserved.
- Contract result model: `OperationResult<T>` with `ok: true` or `ok: false`.

## Global validation checklist

Use these checks across all relevant functions.

- Reject invalid row numbers (`< 1`, `> 8`).
- Reject invalid seat numbers (`< 1`, `> 10`).
- Reject negative values.
- Reject decimal values.
- Reject null and undefined values.
- Reject missing theater matrix.
- Reject invalid theater matrix shape.
- Reject non-boolean seat values in matrix.
- Prevent duplicate reservations.
- Return deterministic error codes and messages.

## Function-by-function checklist

## 1) createTheater

Contract: `CreateTheater -> OperationResult<TheaterMatrix>`

Happy path tests:
- Returns `ok: true` with matrix of 8 rows and 10 seats each.
- Every seat is `false`.

Boundary tests:
- Confirms exact first and last coordinates exist: [1,1], [8,10].

Invalid input tests (if optional params are exposed):
- Reject rows <= 0.
- Reject seatsPerRow <= 0.
- Reject non-integer dimension values.

Edge case tests:
- If dimensions are fixed-only, ignores or rejects custom dimensions consistently.

Expected outcomes:
- Success returns valid matrix.
- Failure returns `ok: false` with `INVALID_INPUT` or `INVALID_MATRIX`.

## 2) isValidSeat

Contract: `IsValidSeat -> OperationResult<SeatValidationPayload>`

Happy path tests:
- `(1,1)` returns internal `(0,0)`.
- `(8,10)` returns internal `(7,9)`.

Boundary tests:
- Minimum and maximum valid coordinates pass.

Invalid input tests:
- row 0, row 9 fail with `INVALID_ROW`.
- seat 0, seat 11 fail with `INVALID_SEAT`.
- decimals fail with `INVALID_INPUT`.
- null/undefined fail with `INVALID_INPUT`.

Edge case tests:
- Missing theater argument still validates coordinates if theater is optional.
- If theater provided and invalid, returns `INVALID_MATRIX`.

Expected outcomes:
- Success includes both external and internal coordinates.
- Failure includes deterministic error code.

## 3) displayTheater

Contract: `DisplayTheater -> OperationResult<DisplayTheaterPayload>`

Happy path tests:
- Output contains `SCREEN` at top.
- Uses `O` for available and `X` for reserved.
- Includes available seat summary `x / 80`.

Boundary tests:
- Empty theater displays all `O` and `80 / 80`.
- Full theater displays all `X` and `0 / 80`.

Invalid input tests:
- Missing theater returns `MISSING_THEATER`.
- Invalid matrix shape returns `INVALID_MATRIX`.

Edge case tests:
- Custom display options applied correctly if provided.
- Orientation remains row 1 to row 8 consistently.

Expected outcomes:
- Success returns render string plus counts.
- Failure returns non-throwing error result.

## 4) isSeatAvailable

Contract: `IsSeatAvailable -> OperationResult<SeatAvailabilityPayload>`

Happy path tests:
- Available seat returns `available: true`.
- Reserved seat returns `available: false`.

Boundary tests:
- Works on `(1,1)` and `(8,10)`.

Invalid input tests:
- Invalid row/seat values return corresponding validation errors.
- Invalid matrix returns `INVALID_MATRIX`.

Edge case tests:
- Full theater always returns `available: false` for valid seats.

Expected outcomes:
- Never performs out-of-range matrix access.

## 5) reserveSeat

Contract: `ReserveSeat -> OperationResult<ReservationPayload>`

Happy path tests:
- Reserving a free valid seat returns success and updates state.
- Remaining seat count decrements by 1.

Boundary tests:
- Can reserve `(1,1)` and `(8,10)`.

Invalid input tests:
- Invalid row/seat rejected.
- Missing or malformed matrix rejected.

Edge case tests:
- Seat already reserved returns `SEAT_ALREADY_RESERVED`.
- Full theater returns `THEATER_FULL` or `SEAT_ALREADY_RESERVED` per policy.

Expected outcomes:
- No mutation on failure.
- Deterministic success payload includes coordinate and remaining seats.

## 6) countAvailable

Contract: `CountAvailable -> OperationResult<number>`

Happy path tests:
- Fresh theater returns 80.
- After one reservation returns 79.

Boundary tests:
- Fully reserved returns 0.
- Fully empty returns 80.

Invalid input tests:
- Missing/malformed matrix rejected.

Edge case tests:
- Mixed pattern count matches exact expected value.

Expected outcomes:
- Count always in [0, 80].

## 7) findAdjacentSeats

Contract: `FindAdjacentSeats -> OperationResult<AdjacentSeatsPayload>`

Happy path tests:
- For groupSize 2, returns first contiguous pair.
- For groupSize 3, returns first contiguous triplet.

Boundary tests:
- groupSize 1 works.
- groupSize 10 only succeeds when full row is available.

Invalid input tests:
- groupSize 0, negative, decimal fail with `INVALID_GROUP_SIZE`.
- groupSize > 10 fails with `INVALID_GROUP_SIZE`.

Edge case tests:
- No contiguous block returns `NO_ADJACENT_BLOCK`.
- Full theater returns `NO_ADJACENT_BLOCK`.

Expected outcomes:
- Returned seats are contiguous and in a single row.
- Selection order is deterministic (first valid block by scan order).

## 8) getRowLabel

Contract: `GetRowLabel -> OperationResult<RowLabel>`

Happy path tests:
- Row 1 -> `front`.
- Row 8 -> `back`.
- Row 2-7 -> `standard`.

Boundary tests:
- Exactly 1 and 8 map correctly.

Invalid input tests:
- Out-of-range, decimal, null, undefined rejected.

Edge case tests:
- Label text remains stable if used in recommendation output.

Expected outcomes:
- Consistent classification and message for each valid row.

## 9) getBestAvailableRow

Contract: `GetBestAvailableRow -> OperationResult<BestRowPayload>`

Happy path tests:
- Returns row with highest available seat count.
- Payload includes row label and available count.

Boundary tests:
- Single-row best case detected correctly.
- Tie handled with documented tie-break policy.

Invalid input tests:
- Invalid matrix rejected.

Edge case tests:
- Full theater returns `NO_BEST_ROW`.
- Empty theater returns policy-consistent row (based on tie-break).

Expected outcomes:
- Deterministic recommendation behavior under ties.

## Integration checklist

Core workflows:
- createTheater -> reserveSeat -> isSeatAvailable -> countAvailable.
- reserveSeat repeated until full theater, then ensure failure behavior.
- reserve pattern then verify display summary and symbols.
- reserve pattern then findAdjacentSeats and getBestAvailableRow consistency.

State safety:
- On any failed operation, matrix remains unchanged.
- Successful operations only mutate intended seat.

Error contract consistency:
- Every failure returns `ok: false` and a valid `ErrorCode`.
- Messages are staff-readable and actionable.

## Suggested execution order for tests

1. Validation unit tests (`isValidSeat`, matrix guards).
2. Read-only logic (`countAvailable`, `isSeatAvailable`, `getRowLabel`).
3. Mutation logic (`reserveSeat`).
4. Search/recommendation (`findAdjacentSeats`, `getBestAvailableRow`).
5. Rendering (`displayTheater`).
6. Integration workflows and regression suite.
