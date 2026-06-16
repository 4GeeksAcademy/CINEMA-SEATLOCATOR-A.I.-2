import { SEATS_PER_ROW, THEATER_ROWS, type SeatCoordinate, type TheaterMatrix } from "./seat-reservation.contract";
import { seatReservation } from "./seat-reservation";

type SelectedSeat = SeatCoordinate | null;

interface DashboardState {
  theater: TheaterMatrix;
  selectedSeat: SelectedSeat;
  highlighted: Set<string>;
  activity: string[];
}

const seatKey = (rowNumber: number, seatNumber: number): string => `${rowNumber}:${seatNumber}`;

const createInitialState = (): DashboardState => {
  const created = seatReservation.createTheater();
  if (!created.ok) {
    throw new Error(created.error.message);
  }

  return {
    theater: created.payload,
    selectedSeat: null,
    highlighted: new Set<string>(),
    activity: ["System ready. Theater created with 80 available seats."],
  };
};

const pushActivity = (state: DashboardState, message: string): void => {
  state.activity.unshift(`${new Date().toLocaleTimeString()} - ${message}`);
  if (state.activity.length > 8) {
    state.activity.length = 8;
  }
};

const toInt = (value: string): number => Number.parseInt(value, 10);

const RESULT_BASE_CLASSES = "mt-3 rounded-xl border px-3 py-2 text-sm";
const RESULT_SUCCESS_CLASSES = "border-emerald-200 bg-emerald-50 text-emerald-900";
const RESULT_ERROR_CLASSES = "border-rose-200 bg-rose-50 text-rose-900";

const AVAILABLE_SEAT_CLASSES = "border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow";
const RESERVED_SEAT_CLASSES = "border-slate-800 bg-slate-800 text-slate-100";
const SELECTED_SEAT_CLASSES = "ring-2 ring-orange-500 ring-offset-1";
const HIGHLIGHT_SEAT_CLASSES = "border-orange-400 bg-orange-100";

export const mountDashboard = (): void => {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) {
    return;
  }

  const state = createInitialState();

  app.innerHTML = `
    <div class="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#f8e7cb_0_18%,transparent_19%),radial-gradient(circle_at_90%_80%,#d9efe7_0_22%,transparent_23%),linear-gradient(160deg,#f5f1e8_0%,#e8dccd_100%)] py-4 sm:py-6">
      <div class="mx-auto grid w-[min(1200px,calc(100%-1rem))] gap-4 sm:w-[min(1200px,calc(100%-2rem))]">
      <header class="rounded-2xl bg-gradient-to-br from-teal-950 via-teal-700 to-teal-900 p-4 text-teal-50 shadow-xl sm:p-5">
        <p class="m-0 text-[0.72rem] uppercase tracking-[0.08em] opacity-90">Cinema Operations Dashboard</p>
        <h1 class="mt-1 font-[\"Space_Grotesk\",sans-serif] text-2xl font-bold sm:text-4xl">Seat Reservation Command Center</h1>
        <p class="mt-2 text-teal-100">Select seats, validate availability, find adjacent blocks, and keep front-desk flow fast.</p>
      </header>

      <section class="grid gap-3 md:grid-cols-3" id="stats-panel"></section>

      <section class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div class="mx-auto mb-3 w-full max-w-md rounded-full border border-teal-900 bg-teal-100 px-3 py-1 text-center font-[\"Space_Grotesk\",sans-serif] text-xs tracking-[0.2em] text-teal-900">SCREEN</div>
        <p class="mb-2 text-xs text-slate-500 md:hidden">On smaller screens, swipe horizontally to view all seats.</p>
        <div class="overflow-x-auto pb-1" aria-label="Seat layout scroll area">
          <div id="seat-legend" class="mb-2 grid min-w-[640px] grid-cols-[66px_repeat(10,minmax(0,1fr))] items-center gap-1.5 text-xs text-slate-500 sm:text-sm"></div>
          <div id="seat-grid" class="grid min-w-[640px] gap-1.5"></div>
        </div>
      </section>

      <section class="grid gap-3 lg:grid-cols-2">
        <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 class="mb-3 font-[\"Space_Grotesk\",sans-serif] text-xl font-semibold text-slate-900">Seat Actions</h2>
          <div class="mb-2 grid gap-1">
            <label for="row-input" class="text-sm text-slate-600">Row</label>
            <input id="row-input" type="number" min="1" max="8" placeholder="1-8" class="rounded-xl border border-amber-200 bg-white px-3 py-2 outline-none ring-orange-400 focus:ring-2" />
          </div>
          <div class="mb-3 grid gap-1">
            <label for="seat-input" class="text-sm text-slate-600">Seat</label>
            <input id="seat-input" type="number" min="1" max="10" placeholder="1-10" class="rounded-xl border border-amber-200 bg-white px-3 py-2 outline-none ring-orange-400 focus:ring-2" />
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            <button id="check-seat" class="rounded-xl border border-slate-500 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Check Availability</button>
            <button id="select-seat" class="rounded-xl border border-slate-500 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Select Seat</button>
            <button id="reserve-selected" class="rounded-xl border border-orange-700 bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500">Confirm Reservation</button>
          </div>
        </article>

        <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <h2 class="mb-3 font-[\"Space_Grotesk\",sans-serif] text-xl font-semibold text-slate-900">Recommendations</h2>
          <div class="mb-3 grid gap-1">
            <label for="group-size" class="text-sm text-slate-600">Adjacent Group Size</label>
            <input id="group-size" type="number" min="1" max="10" placeholder="2" class="rounded-xl border border-amber-200 bg-white px-3 py-2 outline-none ring-orange-400 focus:ring-2" />
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            <button id="find-adjacent" class="rounded-xl border border-slate-500 bg-teal-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-100">Find Adjacent</button>
            <button id="best-row" class="rounded-xl border border-slate-500 bg-teal-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-100">Best Row</button>
            <button id="reset-theater" class="rounded-xl border border-rose-400 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-200">Reset Theater</button>
          </div>
          <p id="result-message" class="${RESULT_BASE_CLASSES} ${RESULT_SUCCESS_CLASSES}">No operation executed yet.</p>
        </article>
      </section>

      <section class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <h2 class="mb-3 font-[\"Space_Grotesk\",sans-serif] text-xl font-semibold text-slate-900">Recent Activity</h2>
        <ul id="activity-log" class="grid list-disc gap-1 pl-5 text-sm text-slate-700"></ul>
      </section>
      </div>
    </div>
  `;

  const statsPanel = app.querySelector<HTMLElement>("#stats-panel");
  const seatLegend = app.querySelector<HTMLElement>("#seat-legend");
  const seatGrid = app.querySelector<HTMLElement>("#seat-grid");
  const activityLog = app.querySelector<HTMLElement>("#activity-log");
  const resultMessage = app.querySelector<HTMLElement>("#result-message");
  const rowInput = app.querySelector<HTMLInputElement>("#row-input");
  const seatInput = app.querySelector<HTMLInputElement>("#seat-input");
  const groupSizeInput = app.querySelector<HTMLInputElement>("#group-size");

  if (!statsPanel || !seatLegend || !seatGrid || !activityLog || !resultMessage || !rowInput || !seatInput || !groupSizeInput) {
    return;
  }

  const setMessage = (text: string, isError = false): void => {
    resultMessage.textContent = text;
    resultMessage.className = `${RESULT_BASE_CLASSES} ${isError ? RESULT_ERROR_CLASSES : RESULT_SUCCESS_CLASSES}`;
  };

  const readSeatInputs = (): SeatCoordinate | null => {
    const rowNumber = toInt(rowInput.value);
    const seatNumber = toInt(seatInput.value);

    if (!Number.isInteger(rowNumber) || !Number.isInteger(seatNumber)) {
      setMessage("Enter both row and seat as integers.", true);
      return null;
    }

    return { rowNumber, seatNumber };
  };

  const renderStats = (): void => {
    const availableResult = seatReservation.countAvailable(state.theater);
    const bestRowResult = seatReservation.getBestAvailableRow(state.theater);

    const availableText = availableResult.ok ? String(availableResult.payload) : "-";
    const bestRowText = bestRowResult.ok
      ? `${bestRowResult.payload.rowNumber} (${bestRowResult.payload.availableSeats} seats)`
      : "No recommendation";

    statsPanel.innerHTML = `
      <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-xs uppercase tracking-[0.06em] text-slate-500">Available Seats</p>
        <p class="mt-1 font-[\"Space_Grotesk\",sans-serif] text-xl font-semibold text-slate-900">${availableText} / ${THEATER_ROWS * SEATS_PER_ROW}</p>
      </article>
      <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-xs uppercase tracking-[0.06em] text-slate-500">Selected Seat</p>
        <p class="mt-1 font-[\"Space_Grotesk\",sans-serif] text-xl font-semibold text-slate-900">${state.selectedSeat ? `Row ${state.selectedSeat.rowNumber}, Seat ${state.selectedSeat.seatNumber}` : "None"}</p>
      </article>
      <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p class="text-xs uppercase tracking-[0.06em] text-slate-500">Best Suggested Row</p>
        <p class="mt-1 font-[\"Space_Grotesk\",sans-serif] text-xl font-semibold text-slate-900">${bestRowText}</p>
      </article>
    `;
  };

  const renderLegend = (): void => {
    const seats = Array.from(
      { length: SEATS_PER_ROW },
      (_, i) => `<span class="text-center font-medium text-slate-500">${i + 1}</span>`
    ).join("");
    seatLegend.innerHTML = `<span class="sticky left-0 z-10 rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-slate-600 shadow-[2px_0_0_#fde68a] sm:text-sm">Seats</span>${seats}`;
  };

  const renderGrid = (): void => {
    seatGrid.innerHTML = "";

    state.theater.forEach((row, rowIndex) => {
      const rowWrap = document.createElement("div");
      rowWrap.className = "grid grid-cols-[66px_repeat(10,minmax(0,1fr))] items-center gap-1.5";

      const label = document.createElement("div");
      label.className = "sticky left-0 z-10 rounded-md bg-amber-50 px-1.5 py-1 text-xs font-semibold text-slate-700 shadow-[2px_0_0_#fde68a] sm:text-sm";
      label.textContent = `Row ${rowIndex + 1}`;
      rowWrap.appendChild(label);

      row.forEach((reserved, seatIndex) => {
        const rowNumber = rowIndex + 1;
        const seatNumber = seatIndex + 1;
        const key = seatKey(rowNumber, seatNumber);
        const isSelected = state.selectedSeat?.rowNumber === rowNumber && state.selectedSeat?.seatNumber === seatNumber;
        const isHighlighted = state.highlighted.has(key);

        const button = document.createElement("button");
        button.type = "button";
        const stateClasses = reserved ? RESERVED_SEAT_CLASSES : AVAILABLE_SEAT_CLASSES;
        const selectedClasses = isSelected ? SELECTED_SEAT_CLASSES : "";
        const highlightClasses = isHighlighted ? HIGHLIGHT_SEAT_CLASSES : "";
        button.className = [
          "rounded-md border px-0 py-1.5 text-xs font-semibold transition sm:text-sm",
          "min-h-9",
          stateClasses,
          selectedClasses,
          highlightClasses,
        ]
          .join(" ")
          .trim();
        button.textContent = String(seatNumber);
        button.title = `Row ${rowNumber} Seat ${seatNumber}`;

        button.addEventListener("click", () => {
          rowInput.value = String(rowNumber);
          seatInput.value = String(seatNumber);
          state.selectedSeat = { rowNumber, seatNumber };
          state.highlighted.clear();
          pushActivity(state, `Selected Row ${rowNumber} Seat ${seatNumber}.`);
          setMessage(`Selected Row ${rowNumber} Seat ${seatNumber}. Click Confirm Reservation to reserve.`, false);
          renderAll();
        });

        rowWrap.appendChild(button);
      });

      seatGrid.appendChild(rowWrap);
    });
  };

  const renderLog = (): void => {
    activityLog.innerHTML = state.activity.map((item) => `<li>${item}</li>`).join("");
  };

  const renderAll = (): void => {
    renderStats();
    renderLegend();
    renderGrid();
    renderLog();
  };

  app.querySelector("#check-seat")?.addEventListener("click", () => {
    const seat = readSeatInputs();
    if (!seat) return;

    const result = seatReservation.isSeatAvailable(state.theater, seat.rowNumber, seat.seatNumber);
    if (!result.ok) {
      setMessage(result.error.message, true);
      pushActivity(state, `Availability check failed (${result.error.code}).`);
      renderLog();
      return;
    }

    const text = result.payload.available
      ? `Row ${seat.rowNumber} Seat ${seat.seatNumber} is available.`
      : `Row ${seat.rowNumber} Seat ${seat.seatNumber} is reserved.`;
    setMessage(text, false);
    pushActivity(state, text);
    renderLog();
  });

  app.querySelector("#select-seat")?.addEventListener("click", () => {
    const seat = readSeatInputs();
    if (!seat) return;
    state.selectedSeat = seat;
    state.highlighted.clear();
    setMessage(`Selected Row ${seat.rowNumber} Seat ${seat.seatNumber}.`, false);
    pushActivity(state, `Selected seat from form: Row ${seat.rowNumber} Seat ${seat.seatNumber}.`);
    renderAll();
  });

  app.querySelector("#reserve-selected")?.addEventListener("click", () => {
    const seat = state.selectedSeat ?? readSeatInputs();
    if (!seat) return;

    const result = seatReservation.reserveSeat(state.theater, seat.rowNumber, seat.seatNumber);
    if (!result.ok) {
      setMessage(result.error.message, true);
      pushActivity(state, `Reservation failed for Row ${seat.rowNumber} Seat ${seat.seatNumber} (${result.error.code}).`);
      renderLog();
      return;
    }

    state.selectedSeat = null;
    state.highlighted.clear();
    const msg = `Reserved Row ${seat.rowNumber} Seat ${seat.seatNumber}. Remaining: ${result.payload.remainingSeats}.`;
    setMessage(msg, false);
    pushActivity(state, msg);
    renderAll();
  });

  app.querySelector("#find-adjacent")?.addEventListener("click", () => {
    const groupSize = toInt(groupSizeInput.value || "2");
    const result = seatReservation.findAdjacentSeats(state.theater, groupSize);

    state.highlighted.clear();
    if (!result.ok) {
      setMessage(result.error.message, true);
      pushActivity(state, `Adjacent search failed (${result.error.code}).`);
      renderAll();
      return;
    }

    result.payload.seats.forEach((seat) => state.highlighted.add(seatKey(seat.rowNumber, seat.seatNumber)));
    const coords = result.payload.seats.map((seat) => `R${seat.rowNumber}S${seat.seatNumber}`).join(", ");
    const msg = `Adjacent block found for ${groupSize}: ${coords}.`;
    setMessage(msg, false);
    pushActivity(state, msg);
    renderAll();
  });

  app.querySelector("#best-row")?.addEventListener("click", () => {
    const result = seatReservation.getBestAvailableRow(state.theater);

    state.highlighted.clear();
    if (!result.ok) {
      setMessage(result.error.message, true);
      pushActivity(state, `Best row lookup failed (${result.error.code}).`);
      renderAll();
      return;
    }

    const rowIndex = result.payload.rowNumber - 1;
    state.theater[rowIndex].forEach((reserved, seatIndex) => {
      if (!reserved) {
        state.highlighted.add(seatKey(result.payload.rowNumber, seatIndex + 1));
      }
    });

    const msg = `Best row is ${result.payload.rowLabel.label} with ${result.payload.availableSeats} open seats.`;
    setMessage(msg, false);
    pushActivity(state, msg);
    renderAll();
  });

  app.querySelector("#reset-theater")?.addEventListener("click", () => {
    const created = seatReservation.createTheater();
    if (!created.ok) {
      setMessage(created.error.message, true);
      pushActivity(state, `Reset failed (${created.error.code}).`);
      renderLog();
      return;
    }

    state.theater = created.payload;
    state.selectedSeat = null;
    state.highlighted.clear();
    const msg = "Theater reset. All seats are available again.";
    setMessage(msg, false);
    pushActivity(state, msg);
    renderAll();
  });

  renderAll();
};
