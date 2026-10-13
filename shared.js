const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABEL = {
  Mon: "MON",
  Tue: "TUES",
  Wed: "WED",
  Thu: "THURS",
  Fri: "FRI",
  Sat: "SAT",
  Sun: "SUN",
};
const DAY_COMBOS = { "Tue,Thu": "TTH", "Mon,Wed,Fri": "MWF", "Mon,Wed": "MW" };

function daysLabel(days) {
  const sorted = [...days].sort(
    (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b),
  );
  return (
    DAY_COMBOS[sorted.join(",")] || sorted.map((d) => DAY_LABEL[d]).join("/")
  );
}

function fmtTime(t) {
  if (!t) return "";
  let [h, m] = t.split(":").map(Number);
  if (h === 12 && m === 0) return "12NN";
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + (m ? ":" + String(m).padStart(2, "0") : "") + ap;
}

function timeRange(c) {
  return fmtTime(c.start) + "-" + fmtTime(c.end);
}

function classTitle(c) {
  return c.lab ? (c.desc ? c.desc + " (lab)" : "-- lab schedule --") : c.desc;
}

// ---- class status (icon + label, never color alone) ----
function toMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function classStatus(c) {
  const n = new Date();
  const now = n.getHours() * 60 + n.getMinutes();
  if (now >= toMin(c.end)) return "done";
  if (now >= toMin(c.start)) return "live";
  return "upcoming";
}

const STATUS = {
  done: { icon: "checkCircle", label: "Finished" },
  live: { icon: "live", label: "In progress" },
  upcoming: { icon: "clock", label: "Upcoming" },
};

// ---- icons ----
const ICONS = {
  circle: '<circle cx="12" cy="12" r="9"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash:
    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  live: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

function icon(name, size = 16) {
  return (
    '<svg width="' +
    size +
    '" height="' +
    size +
    '" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true">' +
    ICONS[name] +
    "</svg>"
  );
}

// ---- people (edit names here) ----
const PEOPLE = [
  { id: "cj", name: "cj" },
  { id: "janz", name: "janz" },
];
function possessive(name) {
  return name + (/[sz]$/i.test(name) ? "'" : "'s");
}
function scheduleTitle(p) {
  return possessive(p.name) + " schedule";
}
function ownerOf(c) {
  return c.owner || "cj";
}
