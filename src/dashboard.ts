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

export const mountDashboard = (): void => {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) {
    return;
  }

  const state = createInitialState();

  app.innerHTML = `
    <div class="dashboard-shell">
      <header class="hero">
        <p class="eyebrow">Cinema Operations Dashboard</p>
        <h1>Seat Reservation Command Center</h1>
        <p class="hero-subtitle">Select seats, validate availability, find adjacent blocks, and keep front-desk flow fast.</p>
      </header>

      <section class="stats" id="stats-panel"></section>

      <section class="stage-wrap">
        <div class="screen">SCREEN</div>
        <p class="mobile-hint">On smaller screens, swipe horizontally to view all seats.</p>
        <div class="seat-scroll" aria-label="Seat layout scroll area">
          <div id="seat-legend" class="seat-legend"></div>
          <div id="seat-grid" class="seat-grid"></div>
        </div>
      </section>

      <section class="controls-grid">
        <article class="panel">
          <h2>Seat Actions</h2>
          <div class="form-row">
            <label for="row-input">Row</label>
            <input id="row-input" type="number" min="1" max="8" placeholder="1-8" />
          </div>
          <div class="form-row">
            <label for="seat-input">Seat</label>
            <input id="seat-input" type="number" min="1" max="10" placeholder="1-10" />
          </div>
          <div class="button-row">
            <button id="check-seat" class="btn ghost">Check Availability</button>
            <button id="select-seat" class="btn ghost">Select Seat</button>
            <button id="reserve-selected" class="btn accent">Confirm Reservation</button>
          </div>
        </article>

        <article class="panel">
          <h2>Recommendations</h2>
          <div class="form-row">
            <label for="group-size">Adjacent Group Size</label>
            <input id="group-size" type="number" min="1" max="10" placeholder="2" />
          </div>
          <div class="button-row">
            <button id="find-adjacent" class="btn">Find Adjacent</button>
            <button id="best-row" class="btn">Best Row</button>
            <button id="reset-theater" class="btn warn">Reset Theater</button>
          </div>
          <p id="result-message" class="result">No operation executed yet.</p>
        </article>
      </section>

      <section class="panel log-panel">
        <h2>Recent Activity</h2>
        <ul id="activity-log" class="log-list"></ul>
      </section>
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
    resultMessage.dataset.variant = isError ? "error" : "success";
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
      <article class="stat-card">
        <p class="stat-label">Available Seats</p>
        <p class="stat-value">${availableText} / ${THEATER_ROWS * SEATS_PER_ROW}</p>
      </article>
      <article class="stat-card">
        <p class="stat-label">Selected Seat</p>
        <p class="stat-value">${state.selectedSeat ? `Row ${state.selectedSeat.rowNumber}, Seat ${state.selectedSeat.seatNumber}` : "None"}</p>
      </article>
      <article class="stat-card">
        <p class="stat-label">Best Suggested Row</p>
        <p class="stat-value">${bestRowText}</p>
      </article>
    `;
  };

  const renderLegend = (): void => {
    const seats = Array.from({ length: SEATS_PER_ROW }, (_, i) => `<span>${i + 1}</span>`).join("");
    seatLegend.innerHTML = `<span class="row-label">Seats</span>${seats}`;
  };

  const renderGrid = (): void => {
    seatGrid.innerHTML = "";

    state.theater.forEach((row, rowIndex) => {
      const rowWrap = document.createElement("div");
      rowWrap.className = "seat-row";

      const label = document.createElement("div");
      label.className = "row-label";
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
        button.className = "seat";
        button.textContent = String(seatNumber);
        button.dataset.state = reserved ? "reserved" : "available";
        if (isSelected) button.dataset.selected = "true";
        if (isHighlighted) button.dataset.highlight = "true";
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
