// Genetic Algorithm based timetable generator
// Produces the same output shape used by the app: for each class -> days x periods matrix of slot objects
// Slot object: { subjectName, className, status, teacherId }

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function createEmptyTable(days, hours, breakSlots) {
  const table = Array.from({ length: days }, () => Array.from({ length: hours }, () => null));
  for (let d = 0; d < days; d++) {
    (breakSlots || []).forEach((p) => {
      if (Number.isFinite(p) && p >= 0 && p < hours) {
        table[d][p] = { subjectName: 'Break', className: '', status: 'break', teacherId: '' };
      }
    });
  }
  return table;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function variance(arr) {
  if (!arr || arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
}

function computeTeacherUsage(timetables) {
  const usage = {}; // teacherId -> count
  Object.values(timetables).forEach((table) => {
    table.forEach((day) => {
      day.forEach((slot) => {
        if (slot && slot.status !== 'break' && slot.status !== 'free' && slot.teacherId) {
          usage[slot.teacherId] = (usage[slot.teacherId] || 0) + 1;
        }
      });
    });
  });
  return usage;
}

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildSubjectPool(cls, teachingSlots, freePercent) {
  const breaksPerDay = 0; // handled outside
  const nonBreakSlots = teachingSlots; // already excludes breaks
  const freeSlots = Math.round((freePercent / 100) * nonBreakSlots);
  const nonFreeSlots = Math.max(0, nonBreakSlots - freeSlots);

  const subjects = Array.isArray(cls.subjects) ? cls.subjects : [];
  const totalCredits = subjects.reduce((sum, s) => sum + Number(s.credits || 0), 0);
  const pool = [];

  if (totalCredits > 0) {
    subjects.forEach((s) => {
      const count = Math.round((Number(s.credits || 0) / totalCredits) * nonFreeSlots);
      for (let i = 0; i < count; i++) {
        pool.push({ type: 'subject', subjectName: s.name, teachers: Array.isArray(s.teachers) ? s.teachers.slice() : [] });
      }
    });
  }
  // If rounding left some slots, fill with subjects randomly
  while (pool.filter(p => p.type === 'subject').length < nonFreeSlots && subjects.length > 0) {
    const s = randomChoice(subjects);
    pool.push({ type: 'subject', subjectName: s.name, teachers: Array.isArray(s.teachers) ? s.teachers.slice() : [] });
  }

  // Fill the remainder with free periods
  while (pool.length < nonBreakSlots) pool.push({ type: 'free' });

  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function initializeChromosome(classes, teachers, days, hours, breakSlots, freePercent) {
  const chromosome = {};
  const teacherHoursLeft = {};
  teachers.forEach(t => { teacherHoursLeft[t.id] = Number(t.weeklyRequiredHours || 0); });

  const slotsPerDay = hours - (breakSlots?.length || 0);
  const teachingSlotsPerWeek = days * slotsPerDay;

  for (const cls of classes) {
    const table = createEmptyTable(days, hours, breakSlots);
    const pool = buildSubjectPool(cls, teachingSlotsPerWeek, freePercent);

    for (let d = 0; d < days; d++) {
      for (let p = 0; p < hours; p++) {
        if (table[d][p]) continue; // break
        if (pool.length === 0) {
          table[d][p] = { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
          continue;
        }
        const item = pool.pop();
        if (item.type === 'free') {
          table[d][p] = { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
        } else {
          // Try to pick a teacher with hours left
          let chosen = '';
          const shuffled = item.teachers.slice().sort(() => Math.random() - 0.5);
          for (const tid of shuffled) {
            if ((teacherHoursLeft[tid] || 0) > 0) { chosen = tid; break; }
          }
          if (chosen) teacherHoursLeft[chosen] -= 1;
          table[d][p] = { subjectName: item.subjectName, className: cls.name, status: 'confirmed', teacherId: chosen };
        }
      }
    }
    chromosome[cls.name] = table;
  }

  return chromosome;
}

function fitness(chromosome, classes, teachers, days, hours, breakSlots) {
  let penalty = 0;

  const WEIGHTS = {
    teacherConflict: 6,
    dailyRepeatOver2: 2,
    adjacentSameSubject: 3,
    longStreakBeyond2: 1,
    emptyTeacher: 1,
    subjectDayVariance: 1.5,
    teacherDayVariance: 2.0,
    teacherUnderOverUse: 0.5,
  };

  // 1) Teacher conflicts across classes at same time
  for (let d = 0; d < days; d++) {
    for (let p = 0; p < hours; p++) {
      if (breakSlots?.includes(p)) continue;
      const seen = new Set();
      for (const cls of classes) {
        const slot = chromosome[cls.name]?.[d]?.[p];
        if (!slot || slot.status !== 'confirmed' || !slot.teacherId) continue;
        const key = slot.teacherId;
        if (seen.has(key)) penalty += WEIGHTS.teacherConflict; else seen.add(key);
      }
    }
  }

  // 2) Subject repetition penalties + distribution
  for (const cls of classes) {
    const table = chromosome[cls.name];
    const subjects = new Set();
    for (let d = 0; d < days; d++) {
      const counts = {};
      for (let p = 0; p < hours; p++) {
        const slot = table[d][p];
        if (slot && slot.status === 'confirmed' && slot.subjectName !== 'Free') {
          counts[slot.subjectName] = (counts[slot.subjectName] || 0) + 1;
          subjects.add(slot.subjectName);
        }
      }
      Object.values(counts).forEach(c => { if (c > 2) penalty += (c - 2) * WEIGHTS.dailyRepeatOver2; });

      // Adjacent identical subjects (prefer spacing)
      for (let p = 1; p < hours; p++) {
        const a = table[d][p - 1];
        const b = table[d][p];
        if (a && b && a.status === 'confirmed' && b.status === 'confirmed' && a.subjectName === b.subjectName) {
          penalty += WEIGHTS.adjacentSameSubject;
        }
      }
    }

    // Subject spread across days: minimize variance of day counts per subject
    for (const name of subjects) {
      const dayCounts = [];
      for (let d = 0; d < days; d++) {
        let c = 0;
        for (let p = 0; p < hours; p++) {
          const slot = table[d][p];
          if (slot && slot.status === 'confirmed' && slot.subjectName === name) c += 1;
        }
        dayCounts.push(c);
      }
      const v = variance(dayCounts);
      penalty += v * WEIGHTS.subjectDayVariance;
    }
  }

  // 3) Teacher hours overflow/underuse + distribution across days
  const usage = computeTeacherUsage(chromosome);
  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, Number(t.weeklyRequiredHours || 0)]));
  Object.keys(usage).forEach(tid => {
    const over = usage[tid] - (teacherMap[tid] || 0);
    if (over > 0) penalty += over * 4; // hard overflow
    const underOver = Math.abs((teacherMap[tid] || 0) - usage[tid]);
    penalty += underOver * WEIGHTS.teacherUnderOverUse; // soft target matching
  });

  // Day-wise distribution for teachers
  const teacherDayCounts = {}; // tid -> [days]
  for (let d = 0; d < days; d++) {
    for (let p = 0; p < hours; p++) {
      if (breakSlots?.includes(p)) continue;
      for (const cls of classes) {
        const slot = chromosome[cls.name]?.[d]?.[p];
        if (!slot || slot.status !== 'confirmed' || !slot.teacherId) continue;
        const tid = slot.teacherId;
        if (!teacherDayCounts[tid]) teacherDayCounts[tid] = Array.from({ length: days }, () => 0);
        teacherDayCounts[tid][d] += 1;
      }
    }
  }
  Object.values(teacherDayCounts).forEach(arr => {
    penalty += variance(arr) * WEIGHTS.teacherDayVariance;
  });

  // 4) Long streaks (>2) same subject
  for (const cls of classes) {
    const table = chromosome[cls.name];
    for (let d = 0; d < days; d++) {
      let streak = 1;
      for (let p = 1; p < hours; p++) {
        const a = table[d][p - 1];
        const b = table[d][p];
        if (a && b && a.status === 'confirmed' && b.status === 'confirmed' && a.subjectName === b.subjectName) {
          streak += 1;
          if (streak > 2) penalty += (streak - 2) * WEIGHTS.longStreakBeyond2;
        } else {
          streak = 1;
        }
      }
    }
  }

  // 5) Prefer having non-empty teacherId for confirmed slots
  for (const cls of classes) {
    const table = chromosome[cls.name];
    for (let d = 0; d < days; d++) {
      for (let p = 0; p < hours; p++) {
        const slot = table[d][p];
        if (slot && slot.status === 'confirmed' && !slot.teacherId) penalty += WEIGHTS.emptyTeacher;
      }
    }
  }

  return -penalty; // higher is better
}

function tournamentSelect(pop, scores, k = 3) {
  let best = -Infinity;
  let bestIdx = 0;
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * pop.length);
    if (scores[idx] > best) { best = scores[idx]; bestIdx = idx; }
  }
  return deepClone(pop[bestIdx]);
}

function crossover(parentA, parentB, classes) {
  const child = {};
  for (const cls of classes) {
    if (Math.random() < 0.5) child[cls.name] = deepClone(parentA[cls.name]);
    else child[cls.name] = deepClone(parentB[cls.name]);
  }
  return child;
}

function mutate(chromosome, classes, days, hours, breakSlots, mutationRate = 0.1) {
  const mutated = deepClone(chromosome);
  for (const cls of classes) {
    if (Math.random() > mutationRate) continue;
    const table = mutated[cls.name];

    // Option A: swap two non-break periods possibly across different days
    const coords = [];
    for (let d = 0; d < days; d++) {
      for (let p = 0; p < hours; p++) {
        if (!breakSlots?.includes(p)) coords.push([d, p]);
      }
    }
    if (coords.length >= 2) {
      const [d1, p1] = coords[Math.floor(Math.random() * coords.length)];
      const [d2, p2] = coords[Math.floor(Math.random() * coords.length)];
      const tmp = table[d1][p1];
      table[d1][p1] = table[d2][p2];
      table[d2][p2] = tmp;
    }

    // Option B: occasionally reassign teacher for a slot to another eligible teacher
    if (Math.random() < 0.5) {
      const d = Math.floor(Math.random() * days);
      const p = Math.floor(Math.random() * hours);
      if (!breakSlots?.includes(p)) {
        const slot = table[d][p];
        if (slot && slot.status === 'confirmed' && slot.subjectName && slot.subjectName !== 'Free') {
          const def = (cls.subjects || []).find(s => s.name === slot.subjectName);
          const candidates = def && Array.isArray(def.teachers) ? def.teachers.slice() : [];
          if (candidates.length > 0) {
            slot.teacherId = candidates[Math.floor(Math.random() * candidates.length)] || '';
          }
        }
      }
    }
  }
  return mutated;
}

export function geneticGenerateTimetables({ classes = [], teachers = [], workingDays = 5, hoursPerDay = 5, breakSlots = [], freePeriodPercentage = 20, options = {} }) {
  const days = clamp(Number(workingDays) || 5, 1, 7);
  const hours = clamp(Number(hoursPerDay) || 5, 1, 12);
  const breaks = Array.isArray(breakSlots) ? breakSlots.slice() : [];

  const populationSize = clamp(options.populationSize || 40, 10, 200);
  const generations = clamp(options.generations || 80, 10, 500);
  const mutationRate = clamp(options.mutationRate || 0.15, 0.01, 0.8);
  const elitism = clamp(options.elitism || 2, 0, 10);

  // Initialize population
  const population = [];
  for (let i = 0; i < populationSize; i++) {
    population.push(initializeChromosome(classes, teachers, days, hours, breaks, freePeriodPercentage));
  }

  // Evolve
  for (let gen = 0; gen < generations; gen++) {
    const scores = population.map(ch => fitness(ch, classes, teachers, days, hours, breaks));

    // Sort by fitness descending
    const ranked = population.map((ch, i) => ({ ch, score: scores[i] }))
      .sort((a, b) => b.score - a.score);

    const newPop = ranked.slice(0, elitism).map(r => deepClone(r.ch));

    while (newPop.length < populationSize) {
      const parentA = tournamentSelect(population, scores);
      const parentB = tournamentSelect(population, scores);
      let child = crossover(parentA, parentB, classes);
      child = mutate(child, classes, days, hours, breaks, mutationRate);
      newPop.push(child);
    }

    // Replace
    for (let i = 0; i < populationSize; i++) population[i] = newPop[i];
  }

  // Best solution
  const finalScores = population.map(ch => fitness(ch, classes, teachers, days, hours, breaks));
  let bestIdx = 0; let bestScore = -Infinity;
  finalScores.forEach((s, i) => { if (s > bestScore) { bestScore = s; bestIdx = i; } });
  const best = population[bestIdx];

  // Ensure slot objects have correct className/status etc.
  const timetables = {};
  for (const cls of classes) {
    const table = best[cls.name];
    // Replace any nulls just in case
    for (let d = 0; d < days; d++) {
      for (let p = 0; p < hours; p++) {
        if (!table[d][p]) table[d][p] = { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
        else if (table[d][p].status !== 'break' && table[d][p].subjectName !== 'Free') {
          table[d][p].className = cls.name;
          table[d][p].status = 'confirmed';
        }
      }
    }
    timetables[cls.name] = table;
  }

  // Compute remaining teacher hours
  const used = computeTeacherUsage(timetables);
  const resultHoursLeft = {};
  teachers.forEach(t => {
    const req = Number(t.weeklyRequiredHours || 0);
    resultHoursLeft[t.id] = Math.max(0, req - (used[t.id] || 0));
  });

  return { timetables, teacherHoursLeft: resultHoursLeft };
}
