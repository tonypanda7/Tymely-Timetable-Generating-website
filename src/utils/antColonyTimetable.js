// Ant Colony Optimization based timetable generator
// Produces the same output shape used by the app: for each class -> days x periods matrix of slot objects
// Slot object: { subjectName, className, status, teacherId }

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
const EPS = 1e-6;

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function createBaseTable(days, hours, breakSlots, electivePeriodIndices) {
  const table = Array.from({ length: days }, () => Array.from({ length: hours }, () => null));
  for (let d = 0; d < days; d++) {
    (breakSlots || []).forEach((p) => {
      if (Number.isFinite(p) && p >= 0 && p < hours) {
        table[d][p] = { subjectName: 'Break', className: '', status: 'break', teacherId: '' };
      }
    });

    // Distribute elective periods across different slots on different days by rotating their indices
    const electives = Array.isArray(electivePeriodIndices) ? electivePeriodIndices.slice() : [];
    electives.forEach((p, idx) => {
      if (!Number.isFinite(p)) return;
      // Rotate position by day index to avoid same slot each day
      const pos = ((Number(p) + d) % hours + hours) % hours;
      if (pos >= 0 && pos < hours && !table[d][pos]) {
        table[d][pos] = { subjectName: 'Elective', className: '', status: 'elective', teacherId: '' };
      } else {
        // fallback: find nearest free position
        for (let shift = 0; shift < hours; shift++) {
          const np = (pos + shift) % hours;
          if (!table[d][np]) { table[d][np] = { subjectName: 'Elective', className: '', status: 'elective', teacherId: '' }; break; }
        }
      }
    });
  }
  return table;
}

function computeMinCreditsMap(programs) {
  const map = {};
  Object.values(programs || {}).forEach(p => {
    if (p && p.program) map[p.program] = Number(p.minTotalCredits || 0) || 0;
  });
  return map;
}

function resolveMinCreditsForClass(cls, programs, courses, minCreditsMap) {
  const programName = String(cls.program || '');
  const mapped = (minCreditsMap && (minCreditsMap[programName] || minCreditsMap[String(programName)])) || 0;
  if (mapped > 0) return mapped;
  // Try derive from courses for same program and semester
  const sem = Number(cls.semester || cls.sem || 0);
  if (sem > 0) {
    const sum = Object.values(courses || {}).reduce((acc, c) => {
      if (c && String(c.program) === programName && Number(c.semester || 0) === sem) {
        return acc + Number(c.credits || 0);
      }
      return acc;
    }, 0);
    if (sum > 0) return sum;
  }
  // Fallback: sum credits of class subjects
  const subs = Array.isArray(cls.subjects) ? cls.subjects : [];
  const clsSum = subs.reduce((s, x) => s + Number(x.credits || 0), 0);
  return clsSum > 0 ? clsSum : 0;
}

function deriveCourseMetaLookup(courses) {
  const byName = {};
  Object.values(courses || {}).forEach(c => {
    if (!c || !c.name) return;
    byName[String(c.name)] = {
      isLab: !!c.isLab,
      style: c.style || '',
      rating: null,
    };
  });
  return byName;
}

function addRatingsToMeta(byName, ratings) {
  if (!ratings) return byName;
  const out = { ...byName };
  Object.keys(ratings).forEach(k => {
    if (out[k]) out[k].rating = ratings[k];
  });
  return out;
}

function buildDemandForClass(cls, days, hours, breakSlots, electivePeriodIndices, minCreditsForProgram, subjMeta) {
  const perDayBreaks = (breakSlots || []).length;
  const electivePerDay = (electivePeriodIndices || []).length;
  const usablePerDay = hours - perDayBreaks - electivePerDay;
  const totalUsable = days * Math.max(0, usablePerDay);

  const minReq = Number(minCreditsForProgram || 0);
  // Exclude elective groups from regular demand allocation; elective periods are handled separately
  const subjects = Array.isArray(cls.subjects) ? cls.subjects.filter(s => !(s && s.courseType === 'elective')) : [];
  const demand = [];
  if (!(minReq > 0 && totalUsable > 0) || subjects.length === 0) return demand;

  // Build proportional allocation using Hamilton (largest remainder),
  // accounting for labs as 3-period sessions.
  const entries = subjects.map((s) => {
    const credits = Number(s.credits || 0);
    const teachers = Array.isArray(s.teachers) ? s.teachers.slice() : [];
    const isLab = !!(subjMeta && subjMeta[s.name] && subjMeta[s.name].isLab) || String(s.delivery || s.isLab || '').toLowerCase() === 'lab';
    const desiredPeriods = (credits / minReq) * totalUsable;
    if (isLab) {
      const desiredSessions = desiredPeriods / 3;
      const baseUnits = Math.floor(desiredSessions);
      const remainder = desiredSessions - baseUnits;
      return { name: s.name, teachers, isLab: true, baseUnits, extraUnits: 0, remainder };
    } else {
      const baseUnits = Math.floor(desiredPeriods);
      const remainder = desiredPeriods - baseUnits;
      return { name: s.name, teachers, isLab: false, baseUnits, extraUnits: 0, remainder };
    }
  });

  let used = entries.reduce((acc, e) => acc + (e.isLab ? e.baseUnits * 3 : e.baseUnits), 0);
  let available = Math.max(0, totalUsable - used);

  // Distribute remaining using largest remainders while respecting lab session size
  const byRemainder = entries.slice().sort((a, b) => b.remainder - a.remainder);
  let idx = 0;
  while (available > 0) {
    // Find next candidate that fits
    let found = false;
    for (let k = 0; k < byRemainder.length; k++) {
      const i = (idx + k) % byRemainder.length;
      const e = byRemainder[i];
      const cost = e.isLab ? 3 : 1;
      if (e.remainder <= 0) continue;
      if (available >= cost) {
        e.extraUnits += 1; available -= cost; found = true; idx = (i + 1) % byRemainder.length; break;
      }
    }
    if (!found) break; // cannot fit any more units
  }

  // Build demand items: one item per theory period; one item per lab session (3 periods placed together)
  entries.forEach(e => {
    const units = e.baseUnits + e.extraUnits;
    for (let i = 0; i < units; i++) {
      demand.push({ subjectName: e.name, teachers: e.teachers, _isLab: e.isLab });
    }
  });

  return demand;
}

function feasiblePlace(table, d, p, item, classSubjectsMetaForName, teacherBusy, hours) {
  if (table[d][p]) return false; // occupied by break/elective/assigned
  const meta = classSubjectsMetaForName[item.subjectName] || {};
  const isLab = !!meta.isLab;

  if (isLab) {
    if (p + 2 >= hours) return false;
    if (table[d][p] || table[d][p+1] || table[d][p+2]) return false;
  }

  // Teacher availability
  const tid = item._chosenTeacherId;
  if (tid) {
    if (teacherBusy[d] && (teacherBusy[d][p] && teacherBusy[d][p].has(tid))) return false;
    if (isLab) {
      if ((teacherBusy[d] && ((teacherBusy[d][p+1] && teacherBusy[d][p+1].has(tid)) || (teacherBusy[d][p+2] && teacherBusy[d][p+2].has(tid))))) return false;
    }
  }
  return true;
}

function place(table, d, p, clsName, item, classSubjectsMetaForName, teacherBusy) {
  const meta = classSubjectsMetaForName[item.subjectName] || {};
  const isLab = !!meta.isLab;
  const tid = item._chosenTeacherId || '';

  if (isLab) {
    table[d][p]     = { subjectName: item.subjectName, className: clsName, status: 'confirmed', teacherId: tid };
    table[d][p + 1] = { subjectName: item.subjectName, className: clsName, status: 'confirmed', teacherId: tid };
    table[d][p + 2] = { subjectName: item.subjectName, className: clsName, status: 'confirmed', teacherId: tid };
    if (!teacherBusy[d]) teacherBusy[d] = {};
    for (let k = 0; k < 3; k++) {
      if (!teacherBusy[d][p + k]) teacherBusy[d][p + k] = new Set();
      if (tid) teacherBusy[d][p + k].add(tid);
    }
  } else {
    table[d][p] = { subjectName: item.subjectName, className: clsName, status: 'confirmed', teacherId: tid };
    if (!teacherBusy[d]) teacherBusy[d] = {};
    if (!teacherBusy[d][p]) teacherBusy[d][p] = new Set();
    if (tid) teacherBusy[d][p].add(tid);
  }
}

function dayTheoryConstraintOk(table, d, p, subjectName) {
  // Theory: not more than two in a day; if two, they must be consecutive
  let count = 0;
  let lastIdx = -10;
  for (let i = 0; i < table[d].length; i++) {
    const s = table[d][i];
    if (s && s.subjectName === subjectName && s.status === 'confirmed') {
      count++; lastIdx = i;
    }
  }
  if (count >= 2) return false;
  if (count === 1) {
    // ensure consecutive with lastIdx
    if (Math.abs(lastIdx - p) !== 1) return false;
  }
  return true;
}

function buildMetaForClassSubjects(cls, courseMetaByName) {
  const meta = {};
  (cls.subjects || []).forEach(s => {
    const cm = courseMetaByName[s.name] || {};
    meta[s.name] = { isLab: !!cm.isLab, style: cm.style || '', rating: cm.rating == null ? null : Number(cm.rating) };
  });
  return meta;
}

function evaluateSolution(timetables, classes, days, hours) {
  // Penalize: teacher conflicts, theory constraints, streaks, spread etc. Keep simple as ACO uses pheromone too.
  let penalty = 0;

  // Teacher conflict across classes at same time
  for (let d = 0; d < days; d++) {
    for (let p = 0; p < hours; p++) {
      const seen = new Set();
      for (const cls of classes) {
        const slot = timetables[cls.name]?.[d]?.[p];
        if (!slot || slot.status !== 'confirmed' || !slot.teacherId) continue;
        const t = slot.teacherId;
        if (seen.has(t)) penalty += 10; else seen.add(t);
      }
    }
  }

  // Day distribution per class - discourage >2 repeats and non-consecutive pairs
  for (const cls of classes) {
    const table = timetables[cls.name];
    for (let d = 0; d < days; d++) {
      const counts = {};
      for (let p = 0; p < hours; p++) {
        const cell = table[d][p];
        if (cell && cell.status === 'confirmed') {
          counts[cell.subjectName] = (counts[cell.subjectName] || 0) + 1;
          // streak
          if (p > 0) {
            const prev = table[d][p - 1];
            if (prev && prev.status === 'confirmed' && prev.subjectName === cell.subjectName) {
              // OK for two consecutive only; penalize longer
              if (p > 1) {
                const prev2 = table[d][p - 2];
                if (prev2 && prev2.status === 'confirmed' && prev2.subjectName === cell.subjectName) penalty += 2;
              }
            }
          }
        }
      }
      Object.values(counts).forEach(c => { if (c > 2) penalty += (c - 2) * 2; });
    }
  }

  return -penalty;
}

function collectElectiveTeachers(cls) {
  const set = new Set();
  const subs = Array.isArray(cls.subjects) ? cls.subjects : [];
  subs.filter(s => s && s.courseType === 'elective').forEach(s => {
    const options = Array.isArray(s.electiveOptionsDetailed) ? s.electiveOptionsDetailed : [];
    options.forEach(o => {
      (Array.isArray(o.teachers) ? o.teachers : []).forEach(tid => { if (tid) set.add(tid); });
    });
  });
  return set;
}

export function acGenerateTimetables({
  classes = [],
  teachers = [],
  workingDays = 5,
  hoursPerDay = 5,
  breakSlots = [],
  electivePeriodIndices = [],
  programs = {},
  courses = {},
  courseRatings = {},
  options = {}
}) {
  const days = clamp(Number(workingDays) || 5, 1, 7);
  const hours = clamp(Number(hoursPerDay) || 5, 1, 12);
  const breaks = Array.isArray(breakSlots) ? breakSlots.slice() : [];
  const electives = Array.isArray(electivePeriodIndices) ? electivePeriodIndices.slice() : [];

  const ants = clamp(options.ants || 30, 10, 200);
  const iterations = clamp(options.iterations || 60, 10, 400);
  const evaporation = options.evaporation != null ? options.evaporation : 0.5;
  const alpha = options.alpha != null ? options.alpha : 1; // pheromone influence
  const beta = options.beta != null ? options.beta : 3; // heuristic influence

  const teacherIds = new Set(teachers.map(t => t.id));

  // Build metadata/lookups
  const minCreditsMap = computeMinCreditsMap(programs);
  let courseMetaByName = deriveCourseMetaLookup(courses);
  courseMetaByName = addRatingsToMeta(courseMetaByName, courseRatings);

  // Pheromone: per-class, per-subject, per (day,period)
  const tau = {}; // tau[className][subjectName][d][p]
  classes.forEach(cls => {
    tau[cls.name] = {};
    (cls.subjects || []).forEach(s => {
      const subj = s.name;
      tau[cls.name][subj] = Array.from({ length: days }, () => Array.from({ length: hours }, () => 1));
    });
  });

  let globalBest = null;
  let globalBestScore = -Infinity;

  for (let it = 0; it < iterations; it++) {
    const iterationBest = { timetables: null, score: -Infinity };

    for (let ant = 0; ant < ants; ant++) {
      const timetables = {};
      // Track teacher occupancy globally for this ant
      const teacherBusy = Array.from({ length: days }, () => ({}));

      // Helper: determine if a class should have elective periods (from its subjects or course catalog)
        const hasElectiveForClass = (c) => {
          try {
            const subs = Array.isArray(c.subjects) ? c.subjects : [];
            if (subs.some(s => s && s.courseType === 'elective')) return true;
            const program = String(c.program || '');
            const sem = Number(c.semester || c.sem || 0);
            if (!program || !sem) return false;
            return Object.values(courses || {}).some(x => String(x.program || '') === program && Number(x.semester || 0) === sem && /elective/i.test(String(x.category || '')));
          } catch {
            return false;
          }
        };

        for (const cls of classes) {
          const classElectives = hasElectiveForClass(cls) ? electives : [];
          const base = createBaseTable(days, hours, breaks, classElectives);
          // Block elective teachers during elective periods for this class
          const electiveTeachers = collectElectiveTeachers(cls);
          if (electiveTeachers.size > 0 && classElectives.length > 0) {
            for (let d = 0; d < days; d++) {
              classElectives.forEach(p => {
                if (!teacherBusy[d]) teacherBusy[d] = {};
                if (!teacherBusy[d][p]) teacherBusy[d][p] = new Set();
                electiveTeachers.forEach(tid => teacherBusy[d][p].add(tid));
              });
            }
          }
          const classMinCred = resolveMinCreditsForClass(cls, programs, courses, minCreditsMap);
          const subjMeta = buildMetaForClassSubjects(cls, courseMetaByName);
          const demand = buildDemandForClass(cls, days, hours, breaks, classElectives, classMinCred, subjMeta);

        // Pre-select teacher for each demand item based on availability (hoursLeft ignored here; rely on conflict only)
        demand.forEach(item => {
          const candidates = Array.isArray(item.teachers) ? item.teachers.filter(t => teacherIds.has(t)) : [];
          item._chosenTeacherId = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : '';
        });

        // Heuristic eta: prefers slots that keep day theory constraints and mix ratings/styles
        const eta = (subj, d, p) => {
          const meta = subjMeta[subj] || {};
          let h = 1;
          if (!meta.isLab) {
            // prefer not violating day theory placement
            if (!dayTheoryConstraintOk(base, d, p, subj)) h *= 0.2;
          } else {
            // labs prefer starting earlier in day to fit 3-blocks
            if (p + 2 >= hours) h *= 0.01;
            else if (p > Math.floor(hours / 2)) h *= 0.7;
          }
          // rating/style balancing small nudges
          if (meta.rating != null) h *= 1 + (0.05 * (3 - Math.abs(3 - Number(meta.rating))));
          return h + EPS;
        };

        // Place demand using probabilistic choice guided by tau and eta
        const toPlace = demand.slice();
        // Randomize order, but attempt labs first to secure 3-blocks
        toPlace.sort((a, b) => (subjMeta[b.subjectName]?.isLab ? 1 : 0) - (subjMeta[a.subjectName]?.isLab ? 1 : 0));

        for (const item of toPlace) {
          let bestD = -1, bestP = -1;
          let accum = 0;
          const weights = [];

          for (let d = 0; d < days; d++) {
            for (let p = 0; p < hours; p++) {
              if (base[d][p]) continue; // skip filled/break/elective
              if (!feasiblePlace(base, d, p, item, subjMeta, teacherBusy, hours)) continue;
              if (!subjMeta[item.subjectName]?.isLab && !dayTheoryConstraintOk(base, d, p, item.subjectName)) continue;
              const pher = ((tau[cls.name][item.subjectName] || [])[d] || [])[p] || 1;
              const heur = eta(item.subjectName, d, p);
              const w = Math.pow(pher, alpha) * Math.pow(heur, beta);
              if (w <= 0) continue;
              accum += w;
              weights.push({ d, p, w });
            }
          }

          if (weights.length === 0) {
            // No feasible slot under constraints; leave as free
            continue;
          }

          // Roulette selection
          let r = Math.random() * accum;
          let chosen = weights[weights.length - 1];
          for (const w of weights) { r -= w.w; if (r <= 0) { chosen = w; break; } }
          bestD = chosen.d; bestP = chosen.p;
          place(base, bestD, bestP, cls.name, item, subjMeta, teacherBusy);
        }

        // Fill remaining empty with Free
        for (let d = 0; d < days; d++) {
          for (let p = 0; p < hours; p++) {
            if (!base[d][p]) base[d][p] = { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
            if (base[d][p].status === 'elective') base[d][p].className = cls.name;
            if (base[d][p].status === 'confirmed') base[d][p].className = cls.name;
          }
        }

        timetables[cls.name] = base;
      }

      // Score whole solution
      const score = evaluateSolution(timetables, classes, days, hours);
      if (score > iterationBest.score) {
        iterationBest.timetables = timetables;
        iterationBest.score = score;
      }
      if (score > globalBestScore) {
        globalBest = timetables;
        globalBestScore = score;
      }
    }

    // Evaporate
    classes.forEach(cls => {
      Object.keys(tau[cls.name]).forEach(subj => {
        for (let d = 0; d < days; d++) {
          for (let p = 0; p < hours; p++) {
            tau[cls.name][subj][d][p] = (1 - evaporation) * tau[cls.name][subj][d][p] + EPS;
          }
        }
      });
    });

    // Reinforce best of iteration
    const reinforce = iterationBest.timetables || globalBest;
    classes.forEach(cls => {
      const table = reinforce[cls.name];
      for (let d = 0; d < days; d++) {
        for (let p = 0; p < hours; p++) {
          const cell = table[d][p];
          if (cell && cell.status === 'confirmed') {
            if (!tau[cls.name][cell.subjectName]) continue;
            tau[cls.name][cell.subjectName][d][p] += 1.0;
          }
        }
      }
    });
  }

  // Return best timetables and compute teacher hours left
  const timetables = globalBest || {};
  const usage = {};
  Object.values(timetables).forEach(table => {
    table.forEach(day => day.forEach(slot => {
      if (slot && slot.status === 'confirmed' && slot.teacherId) {
        usage[slot.teacherId] = (usage[slot.teacherId] || 0) + 1;
      }
    }));
  });
  // Add elective hours for teachers assigned to electives in each class
  classes.forEach(cls => {
    const table = timetables[cls.name];
    if (!table) return;
    const electiveTeachers = collectElectiveTeachers(cls);
    if (electiveTeachers.size === 0) return;
    for (let d = 0; d < days; d++) {
      for (let p = 0; p < hours; p++) {
        const cell = table[d][p];
        if (cell && cell.status === 'elective') {
          electiveTeachers.forEach(tid => {
            usage[tid] = (usage[tid] || 0) + 1;
          });
        }
      }
    }
  });

  const teacherHoursLeft = {};
  teachers.forEach(t => {
    const req = Number(t.weeklyRequiredHours || 0);
    teacherHoursLeft[t.id] = Math.max(0, req - (usage[t.id] || 0));
  });

  return { timetables, teacherHoursLeft };
}
