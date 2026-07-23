/* CSM Candidature Planner — logic */
(function (global) {
  'use strict';

  let DATA = null;
  let REGISTRY = null;
  let ACTIVE_PROGRAM_ID = null;
  const EMPTY = '';

  const MONTHS_FULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_SHORT = {
    Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', May: 'May', Jun: 'Jun',
    Jul: 'Jul', Aug: 'Aug', Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dec: 'Dec',
  };

  function monthToIndex(monthName) {
    return MONTHS_FULL.indexOf(monthName);
  }

  function addCalendarMonths(year, monthName, offset) {
    let idx = monthToIndex(monthName) + offset;
    let y = year + Math.floor(idx / 12);
    idx = ((idx % 12) + 12) % 12;
    return { year: y, month: MONTHS_FULL[idx] };
  }

  function trimesterCalendarStart(intakeKey, startYear, trimester) {
    const intakeMonth = DATA.intakes[intakeKey].startMonth;
    const offset = (trimester - 1) * 4;
    return addCalendarMonths(startYear, intakeMonth, offset);
  }

  function academicYearForMonth(year, monthName) {
    const idx = monthToIndex(monthName);
    if (idx >= monthToIndex('Sep')) {
      const y2 = String(year + 1).slice(-2);
      return { label: `AY${String(year).slice(-2)}/${y2}`, startYear: year };
    }
    const y1 = String(year - 1).slice(-2);
    return { label: `AY${y1}/${String(year).slice(-2)}`, startYear: year - 1 };
  }

  function trimesterInAcademicYear(monthName) {
    const idx = monthToIndex(monthName);
    if (idx >= monthToIndex('Sep') && idx <= monthToIndex('Nov')) return 1;
    if (idx >= monthToIndex('Jan') && idx <= monthToIndex('Mar')) return 2;
    if (idx >= monthToIndex('May') && idx <= monthToIndex('Jul')) return 3;
    return 1;
  }

  function trimesterMeta(intakeKey, startYear, trimester) {
    const start = trimesterCalendarStart(intakeKey, startYear, trimester);
    const end = addCalendarMonths(start.year, start.month, 2);
    const breakMonth = addCalendarMonths(start.year, start.month, 3);
    const ay = academicYearForMonth(start.year, start.month);
    const triInAy = trimesterInAcademicYear(start.month);
    const ext = trimester > DATA.maxCoreTrimesters;
    return {
      ayLabel: ay.label,
      ayStartYear: ay.startYear,
      triInAy,
      periodLabel: `${MONTH_SHORT[start.month]}–${MONTH_SHORT[end.month]}`,
      breakLabel: `${MONTH_SHORT[breakMonth.month]} break`,
      breakMonth: MONTH_SHORT[breakMonth.month],
      periodMonths: [
        start.month,
        addCalendarMonths(start.year, start.month, 1).month,
        addCalendarMonths(start.year, start.month, 2).month,
      ].map((m) => MONTH_SHORT[m]),
      start,
      end,
      ext,
    };
  }

  function cohortLabel(intakeKey, startYear) {
    const names = { sep: 'September', jan: 'January', may: 'May' };
    return `${names[intakeKey] || DATA.intakes[intakeKey].label} ${startYear}`;
  }

  function cohortParts(intakeKey, startYear) {
    const names = { sep: 'September', jan: 'January', may: 'May' };
    return {
      month: names[intakeKey] || DATA.intakes[intakeKey].label,
      year: String(startYear),
    };
  }

  const AY_PALETTES_LIGHT = [
    { bg: '#dce6ef', text: '#1e3348', accent: '#3d6282' },
    { bg: '#dcebe3', text: '#1e3d30', accent: '#3d7a5c' },
    { bg: '#e4dce8', text: '#342a42', accent: '#5c4a72' },
  ];

  const AY_PALETTES_DARK = [
    { bg: '#2a3f54', text: '#c5ddf5', accent: '#7eb8f5' },
    { bg: '#254538', text: '#c0ecd8', accent: '#58d9a0' },
    { bg: '#352d48', text: '#d8cce8', accent: '#b8a0f0' },
  ];

  function isDarkTheme() {
    return typeof document !== 'undefined'
      && document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function ayPalette(ayStartYear) {
    const palettes = isDarkTheme() ? AY_PALETTES_DARK : AY_PALETTES_LIGHT;
    const i = ((ayStartYear - 2024) % palettes.length + palettes.length) % palettes.length;
    return palettes[i];
  }

  function colsForTriRange(fromTri, toTri, maxT) {
    let n = 0;
    for (let t = fromTri; t <= toTri; t++) {
      n += 1;
      if (t < maxT) n += 1;
    }
    return n;
  }

  function rowLabelText(name) {
    if (name === 'Relevant Industry Work Experience') {
      return 'Relevant Industry\nWork Experience';
    }
    return name;
  }

  function buildAyGroups(intakeKey, startYear, maxT) {
    const groups = [];
    let t = 1;
    while (t <= maxT) {
      const meta = trimesterMeta(intakeKey, startYear, t);
      let span = 1;
      while (t + span <= maxT) {
        const next = trimesterMeta(intakeKey, startYear, t + span);
        if (next.ayLabel !== meta.ayLabel) break;
        span++;
      }
      const lastMeta = trimesterMeta(intakeKey, startYear, t + span - 1);
      groups.push({
        startTri: t,
        endTri: t + span - 1,
        span,
        ayLabel: meta.ayLabel,
        ayStartYear: meta.ayStartYear,
        ext: t > DATA.maxCoreTrimesters,
        fadeStart: meta.triInAy > 1,
        fadeEnd: lastMeta.triInAy < 3,
      });
      t += span;
    }
    return groups;
  }

  function ayGroupForTrimester(groups, trimester) {
    return groups.find((g) => trimester >= g.startTri && trimester <= g.endTri);
  }

  function monthForTrimester(intakeKey, trimester) {
    const start = DATA.monthCycle.indexOf(DATA.intakes[intakeKey].startMonth);
    return DATA.monthCycle[(start + trimester - 1) % 3];
  }

  function yearForTrimester(trimester) {
    return Math.ceil(trimester / 3);
  }

  function triInYear(trimester) {
    return ((trimester - 1) % 3) + 1;
  }

  function courseById(id) {
    return DATA.courses.find((c) => c.id === id);
  }

  function componentByKind(kind) {
    return DATA.components.find((c) => c.kind === kind);
  }

  function componentName(kind) {
    const c = componentByKind(kind);
    return c ? c.name : kind;
  }

  function hasFeature(feature) {
    if (!DATA || !DATA.features) return true;
    const f = DATA.features[feature];
    if (feature === 'rpl' || feature === 'reattempt' || feature === 'remodule') {
      return f === true;
    }
    return f !== false;
  }

  function normalizeRegistry(raw) {
    if (raw && raw.programs) return raw;
    return {
      institution: raw.institution,
      defaultProgramId: raw.id || 'applied-computing',
      programs: { [raw.id || 'applied-computing']: raw },
    };
  }

  function applyProgram(programId) {
    if (!REGISTRY) throw new Error('Programme registry not loaded.');
    const program = REGISTRY.programs[programId];
    if (!program) throw new Error(`Unknown programme: ${programId}`);
    ACTIVE_PROGRAM_ID = programId;
    DATA = program;
    return DATA;
  }

  function listPrograms() {
    if (!REGISTRY) return [];
    return Object.entries(REGISTRY.programs)
      .map(([id, program]) => ({
        id,
        degreeTitle: program.degreeTitle || program.title,
        order: program.order || 0,
      }))
      .sort((a, b) => a.order - b.order || a.degreeTitle.localeCompare(b.degreeTitle));
  }

  function getActiveProgramId() {
    return ACTIVE_PROGRAM_ID;
  }

  function getRegistry() {
    return REGISTRY;
  }

  function isFoundation(course) {
    return course && course.category === 'foundation';
  }

  function isStackable(course) {
    return course && course.category === 'stackable';
  }

  function isOnLeave(plan, trimester) {
    return plan.leave && plan.leave[trimester - 1];
  }

  function emptyPlan() {
    return {
      mc: new Array(DATA.maxTotalTrimesters).fill(EMPTY),
      reattemptMc: new Array(DATA.maxTotalTrimesters).fill(EMPTY),
      remoduleMc: new Array(DATA.maxTotalTrimesters).fill(EMPTY),
      careerCatalystAt: null,
      riweAt: null,
      capstone: false,
      leave: new Array(DATA.maxTotalTrimesters).fill(false),
      reattempt: new Array(DATA.maxTotalTrimesters).fill(false),
      remodule: new Array(DATA.maxTotalTrimesters).fill(false),
      rplCredits: new Array(DATA.maxTotalTrimesters).fill(0),
      rplMc: new Array(DATA.maxTotalTrimesters).fill(null),
      rplWfe: new Array(DATA.maxTotalTrimesters).fill(false),
    };
  }

  function isOnReattempt(plan, trimester) {
    return plan.reattempt && plan.reattempt[trimester - 1];
  }

  function isOnRemodule(plan, trimester) {
    return plan.remodule && plan.remodule[trimester - 1];
  }

  function isPlanningDelay(plan, trimester) {
    return isOnLeave(plan, trimester) || isOnReattempt(plan, trimester) || isOnRemodule(plan, trimester);
  }

  function studyTrimesterIndex(plan, calendarTrimester) {
    let n = 0;
    for (let t = 1; t <= calendarTrimester; t++) {
      if (!isPlanningDelay(plan, t)) n++;
    }
    return n;
  }

  function calendarTrimesterForStudyIndex(plan, studyIndex) {
    if (studyIndex <= 0) return null;
    let n = 0;
    for (let t = 1; t <= DATA.maxTotalTrimesters; t++) {
      if (!isPlanningDelay(plan, t)) n++;
      if (n === studyIndex) return t;
    }
    return null;
  }

  function studyYearAt(plan, trimester) {
    const idx = studyTrimesterIndex(plan, trimester);
    if (idx <= 0) return 0;
    return Math.ceil(idx / 3);
  }

  function getMinCohortYear() {
    return DATA.minCohortYear || 2023;
  }

  function getDefaultCohortYear() {
    return DATA.defaultCohortYear || getMinCohortYear();
  }

  function rplMaxTotalCredits() {
    return DATA.rplMaxTotalCredits || 90;
  }

  function rplWfeCredits() {
    return DATA.rplWfeCredits || 10;
  }

  function reattemptOfferWindow() {
    return DATA.reattemptOfferWindowTrimesters || 2;
  }

  function rplCreditSteps() {
    return DATA.rplCreditSteps || [0, 3, 6, 9, 12, 15, 18];
  }

  function rplWfeAt(plan, trimester) {
    if (!plan.rplWfe) return false;
    return !!plan.rplWfe[trimester - 1];
  }

  function courseAtTrimester(plan, trimester) {
    const idx = trimester - 1;
    return (
      (plan.mc && plan.mc[idx]) ||
      (plan.reattemptMc && plan.reattemptMc[idx]) ||
      (plan.remoduleMc && plan.remoduleMc[idx]) ||
      null
    );
  }

  function allScheduledCourseEntries(plan) {
    const entries = [];
    const push = (arr, slot) => {
      if (!arr) return;
      arr.forEach((id, i) => {
        if (id) entries.push({ trimester: i + 1, id, slot });
      });
    };
    push(plan.mc, 'mc');
    push(plan.reattemptMc, 'reattempt');
    push(plan.remoduleMc, 'remodule');
    return entries;
  }

  function totalRplCredits(plan) {
    let total = 0;
    (plan.rplCredits || []).forEach((cr) => {
      total += cr || 0;
    });
    (plan.rplWfe || []).forEach((on) => {
      if (on) total += rplWfeCredits();
    });
    return total;
  }

  function courseRetryTrimesters(intakeKey, courseId, maxTrimester) {
    const allowed = new Set();
    const window = reattemptOfferWindow();
    for (let t = 1; t <= maxTrimester; t++) {
      if (!isCourseOfferedInTrimester(intakeKey, t, courseId)) continue;
      for (let w = 0; w < window && t + w <= maxTrimester; w++) {
        allowed.add(t + w);
      }
    }
    return allowed;
  }

  function trimesterActivityCredits(plan, intakeKey, trimester) {
    const idx = trimester - 1;
    let total = 0;
    [plan.mc, plan.reattemptMc, plan.remoduleMc].forEach((arr) => {
      const id = arr && arr[idx];
      if (!id) return;
      const c = courseById(id);
      if (c) total += c.credits;
    });
    total += rplCreditsAt(plan, trimester);
    if (rplWfeAt(plan, trimester)) total += rplWfeCredits();
    if (plan.careerCatalystAt === trimester) total += DATA.wfeCcCredits;
    if (plan.riweAt != null && isRiweActiveTrimester(plan, intakeKey, trimester) && !isOnLeave(plan, trimester)) {
      total += riweCreditsPerTrimester();
    }
    return total;
  }

  function addUniqueMcCredits(plan, countedMc, onCourse) {
    allScheduledCourseEntries(plan).forEach(({ id }) => {
      if (!id || countedMc.has(id)) return;
      const c = courseById(id);
      if (!c) return;
      countedMc.add(id);
      onCourse(c);
    });
  }

  function rplMaxPerTrimester() {
    return DATA.rplMaxCreditsPerTrimester || 24;
  }

  function cycleRplWfe(on) {
    return !on;
  }

  function isOnLeaveOnly(plan, trimester) {
    return isOnLeave(plan, trimester);
  }

  function countCourseAttemptsExcluding(plan, courseId, exceptTrimester, exceptSlot) {
    let n = 0;
    allScheduledCourseEntries(plan).forEach(({ trimester: t, id, slot }) => {
      if (id !== courseId) return;
      if (exceptTrimester && t === exceptTrimester && exceptSlot && slot === exceptSlot) return;
      n++;
    });
    return n;
  }

  function countCourseAttempts(plan, courseId) {
    return countCourseAttemptsExcluding(plan, courseId, null, null);
  }

  function hasPriorCourseAttempt(plan, courseId, trimester) {
    return allScheduledCourseEntries(plan).some(
      ({ trimester: t, id }) => id === courseId && t < trimester
    );
  }

  function isValidReattemptSelection(plan, intakeKey, trimester, courseId) {
    if (!courseId || !hasFeature('reattempt')) return false;
    if (!hasPriorCourseAttempt(plan, courseId, trimester)) return false;
    if (!courseRetryTrimesters(intakeKey, courseId, DATA.maxTotalTrimesters).has(trimester)) {
      return false;
    }
    const prior = countCourseAttemptsExcluding(plan, courseId, trimester, 'reattempt');
    return prior < 3;
  }

  function isValidRemoduleSelection(plan, intakeKey, trimester, courseId) {
    if (!courseId || !hasFeature('remodule')) return false;
    if (!hasPriorCourseAttempt(plan, courseId, trimester)) return false;
    if (!courseRetryTrimesters(intakeKey, courseId, DATA.maxTotalTrimesters).has(trimester)) {
      return false;
    }
    const prior = countCourseAttemptsExcluding(plan, courseId, trimester, 'remodule');
    return prior < 3;
  }

  function uniqueMcIds(plan) {
    const ids = new Set();
    allScheduledCourseEntries(plan).forEach(({ id }) => ids.add(id));
    (plan.rplMc || []).forEach((id, i) => {
      if (id && rplCreditsAt(plan, i + 1) >= (DATA.mcCredits || 18)) ids.add(id);
    });
    return ids;
  }

  function rplCreditsAt(plan, trimester) {
    if (!plan.rplCredits) return 0;
    return plan.rplCredits[trimester - 1] || 0;
  }

  function rplMcAt(plan, trimester) {
    if (!plan.rplMc) return null;
    return plan.rplMc[trimester - 1] || null;
  }

  function cycleRplCredits(current) {
    const steps = rplCreditSteps();
    const max = rplMaxPerTrimester();
    const idx = steps.indexOf(current);
    const next = idx < 0 ? steps[0] || 0 : steps[(idx + 1) % steps.length];
    return Math.min(next, max);
  }

  function isTrimesterBlocked(plan, trimester) {
    return isOnLeave(plan, trimester) || isOnReattempt(plan, trimester) || isOnRemodule(plan, trimester);
  }

  function riweCreditsPerTrimester() {
    return DATA.riweCreditsPerTrimester || Math.floor((DATA.riweCredits || 10) / 2);
  }

  function wrapLabelLines(name, maxLines, targetLen) {
    const words = name.split(' ');
    if (words.length <= 1) return name;
    const lines = [];
    let current = '';
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (next.length <= targetLen || !current) {
        current = next;
      } else {
        lines.push(current);
        current = w;
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (current) {
      if (lines.length >= maxLines) {
        lines[maxLines - 1] = `${lines[maxLines - 1]} ${current}`.trim();
      } else {
        lines.push(current);
      }
    }
    return lines.slice(0, maxLines).join('\n');
  }

  function formatCatalogRefLabel(name) {
    if (!name) return '';
    if (name === 'Advanced Generative Text Artificial Intelligence') {
      return 'Advanced\nGenerative Text\nArtificial Intelligence';
    }
    if (name === 'Deep Learning Forecasting with Time Series Analysis') {
      return 'Deep Learning\nForecasting with\nTime Series Analysis';
    }
    if (name.length <= 24) return name;
    if (name.includes(' & ')) {
      const idx = name.indexOf(' & ');
      const before = name.slice(0, idx).trim();
      const after = name.slice(idx + 3).trim();
      if (before.length > 16 && after.length <= 14) {
        const words = before.split(' ');
        if (words.length >= 2) {
          const mid = Math.ceil(words.length / 2);
          return `${words.slice(0, mid).join(' ')}\n${words.slice(mid).join(' ')} & ${after}`;
        }
      }
      if (after.length > 18) return wrapLabelLines(name, 3, 20);
      return `${before} &\n${after}`;
    }
    return wrapLabelLines(name, 3, 20);
  }

  function formatTileLabel(name) {
    if (!name) return '';
    if (name === 'Advanced Generative Text Artificial Intelligence') {
      return 'Advanced\nGenerative Text\nArtificial Intelligence';
    }
    if (name.length <= 22) return name;
    if (name.includes(' & ')) {
      const idx = name.indexOf(' & ');
      return name.slice(0, idx + 3).trim() + '\n' + name.slice(idx + 3).trim();
    }
    const words = name.split(' ');
    if (words.length <= 2) return name;
    const mid = Math.ceil(words.length / 2);
    return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
  }

  function hasBothFoundations(plan) {
    const required = Object.values(DATA.foundationSlots || {});
    if (!required.length) return false;
    const scheduledNames = new Set();
    allScheduledCourseEntries(plan).forEach(({ id }) => {
      const c = courseById(id);
      if (c) scheduledNames.add(c.name);
    });
    (plan.rplMc || []).forEach((id) => {
      const c = courseById(id);
      if (c) scheduledNames.add(c.name);
    });
    return required.every((name) => scheduledNames.has(name));
  }

  function courseIdsOfferedInMonth(month) {
    return DATA.offeringsByMonth[month] || [];
  }

  function courseIdsUsedInTrimester(plan, trimester, exceptSlot) {
    const idx = trimester - 1;
    const used = new Set();
    if (exceptSlot !== 'mc' && plan.mc?.[idx]) used.add(plan.mc[idx]);
    if (exceptSlot !== 'reattempt' && plan.reattemptMc?.[idx]) used.add(plan.reattemptMc[idx]);
    if (exceptSlot !== 'remodule' && plan.remoduleMc?.[idx]) used.add(plan.remoduleMc[idx]);
    return used;
  }

  function coursesForMcSlot(intakeKey, trimester, plan) {
    const month = monthForTrimester(intakeKey, trimester);
    const ids = courseIdsOfferedInMonth(month);
    const sameTri = courseIdsUsedInTrimester(plan, trimester, 'mc');
    const current = plan.mc[trimester - 1];
    const completedElsewhere = new Set(uniqueMcIds(plan));
    if (current) completedElsewhere.delete(current);
    const bothFoundations = hasBothFoundations(plan);

    return ids
      .map((id) => courseById(id))
      .filter((c) => {
        if (!c) return false;
        if (sameTri.has(c.id)) return false;
        if (completedElsewhere.has(c.id)) return false;
        if (bothFoundations && isFoundation(c) && c.id !== current) return false;
        return true;
      });
  }

  function usedCourseIds(plan, exceptTrimester) {
    const used = new Set();
    allScheduledCourseEntries(plan).forEach(({ trimester, id }) => {
      if (trimester !== exceptTrimester) used.add(id);
    });
    return used;
  }

  function coursesOfferedInTrimester(intakeKey, trimester, plan) {
    return coursesForMcSlot(intakeKey, trimester, plan);
  }

  function tilesForMcSlot(intakeKey, trimester, plan) {
    return coursesForMcSlot(intakeKey, trimester, plan).map((c) => ({
      type: 'course',
      id: c.id,
      course: c,
    }));
  }

  function tilesForTrimester(intakeKey, trimester, plan) {
    return tilesForMcSlot(intakeKey, trimester, plan);
  }

  function canAssignCareerCatalyst(trimester, plan) {
    if (!hasFeature('wfeCc')) return false;
    if (isOnLeave(plan, trimester)) return false;
    if (rplWfeAt(plan, trimester)) return false;
    if (plan.careerCatalystAt != null && plan.careerCatalystAt !== trimester) return false;
    if (plan.mc[trimester - 1]) return false;
    return true;
  }

  function canAssignMc(trimester, plan) {
    if (isOnLeave(plan, trimester)) return false;
    if (plan.careerCatalystAt === trimester) return false;
    return true;
  }

  function canOfferRiwe(plan, trimester) {
    const minYear = DATA.constraints.wfeRiweYear || 2;
    return studyYearAt(plan, trimester) >= minYear;
  }

  function minRiweStudyIndex(intakeKey) {
    const slots = riweStudySlots(intakeKey);
    if (slots.length) return Math.min(...slots);
    return (DATA.constraints.wfeRiweYear || 2) * 3 - 2;
  }

  function canStartCapstone(plan, trimester) {
    return studyYearAt(plan, trimester) >= DATA.constraints.capstoneMinYear;
  }

  function selectionLabel(sel) {
    if (!sel || sel === EMPTY) return null;
    const c = courseById(sel);
    if (!c) return null;
    return { name: c.name, kind: c.category };
  }

  function countMcBefore(plan, trimester) {
    let n = 0;
    for (let t = 1; t < trimester; t++) {
      const idx = t - 1;
      if (
        plan.mc[idx] ||
        (plan.reattemptMc && plan.reattemptMc[idx]) ||
        (plan.remoduleMc && plan.remoduleMc[idx])
      ) {
        n++;
      } else if (rplMcAt(plan, t) && rplCreditsAt(plan, t) >= (DATA.mcCredits || 18)) {
        n++;
      }
    }
    return n;
  }

  function hasCareerCatalystCredit(plan) {
    if (plan.careerCatalystAt != null) return true;
    return (plan.rplWfe || []).some(Boolean);
  }

  function hasCareerCatalystBefore(plan, trimester) {
    if (plan.careerCatalystAt != null && plan.careerCatalystAt < trimester) return true;
    for (let t = 1; t < trimester; t++) {
      if (rplWfeAt(plan, t)) return true;
    }
    return false;
  }

  function meetsRiwePrereq(plan, startTrimester) {
    const mc = countMcBefore(plan, startTrimester);
    const cc = hasCareerCatalystBefore(plan, startTrimester);
    const p = DATA.prerequisites.wfeRiwe;
    return mc >= p.minMc || (mc >= p.altMinMc && cc);
  }

  function canShowRiweOption(plan, trimester) {
    return canOfferRiwe(plan, trimester) && meetsRiwePrereq(plan, trimester);
  }

  function riweStudySlots(intakeKey) {
    return DATA.intakes[intakeKey].wfeRiweTrimesters || [];
  }

  function riweDurationTrimesters() {
    return (DATA.prerequisites.wfeRiwe && DATA.prerequisites.wfeRiwe.durationTrimesters) || 2;
  }

  function collectNonDelaySpan(plan, startCalendar, count) {
    const span = [];
    for (let t = startCalendar; t <= DATA.maxTotalTrimesters && span.length < count; t++) {
      if (isPlanningDelay(plan, t)) continue;
      span.push(t);
    }
    return span;
  }

  function isValidRiweStart(plan, trimester, intakeKey) {
    if (trimester == null) return false;
    if (isPlanningDelay(plan, trimester)) return false;
    if (studyTrimesterIndex(plan, trimester) < minRiweStudyIndex(intakeKey)) return false;
    if (!canOfferRiwe(plan, trimester)) return false;
    if (!meetsRiwePrereq(plan, trimester)) return false;
    return true;
  }

  function riweCalendarSlots(plan, intakeKey) {
    const duration = riweDurationTrimesters();
    const ideal = riweStudySlots(intakeKey)
      .map((st) => calendarTrimesterForStudyIndex(plan, st))
      .filter((t) => t != null);

    if (ideal.length && isValidRiweStart(plan, ideal[0], intakeKey)) {
      const fromIdeal = collectNonDelaySpan(plan, ideal[0], duration);
      if (fromIdeal.length >= duration) return fromIdeal;
    }

    for (let t = 1; t <= DATA.maxTotalTrimesters; t++) {
      if (!isValidRiweStart(plan, t, intakeKey)) continue;
      const span = collectNonDelaySpan(plan, t, duration);
      if (span.length >= duration) return span;
    }

    return ideal.slice(0, duration);
  }

  function riweStartTrimesters(plan, intakeKey) {
    const slots = riweCalendarSlots(plan, intakeKey);
    if (!slots.length) return [];
    if (isValidRiweStart(plan, slots[0], intakeKey)) return [slots[0]];
    return [];
  }

  function riweSpanTrimesters(plan, intakeKey) {
    const duration = riweDurationTrimesters();
    const slots = riweCalendarSlots(plan, intakeKey);
    if (!slots.length) return [];
    if (plan.riweAt == null) return slots.slice(0, duration);
    const startIdx = slots.indexOf(plan.riweAt);
    if (startIdx >= 0) return slots.slice(startIdx, startIdx + duration);
    return collectNonDelaySpan(plan, plan.riweAt, duration);
  }

  function sanitizePlanSchedule(plan, intakeKey) {
    if (plan.riweAt != null) {
      const starts = riweStartTrimesters(plan, intakeKey);
      if (!starts.length || !starts.includes(plan.riweAt)) {
        plan.riweAt = starts[0] != null ? starts[0] : null;
      }
    }

    if (hasFeature('reattempt') && plan.reattemptMc) {
      for (let t = 1; t <= DATA.maxTotalTrimesters; t++) {
        const idx = t - 1;
        const id = plan.reattemptMc[idx];
        if (!id) continue;
        if (!isValidReattemptSelection(plan, intakeKey, t, id)) {
          plan.reattemptMc[idx] = EMPTY;
          if (plan.reattempt) plan.reattempt[idx] = false;
        }
      }
    }

    if (hasFeature('remodule') && plan.remoduleMc) {
      for (let t = 1; t <= DATA.maxTotalTrimesters; t++) {
        const idx = t - 1;
        const id = plan.remoduleMc[idx];
        if (!id) continue;
        if (!isValidRemoduleSelection(plan, intakeKey, t, id)) {
          plan.remoduleMc[idx] = EMPTY;
          if (plan.remodule) plan.remodule[idx] = false;
        }
      }
    }
  }

  function canAssignRiwe(trimester, plan, intakeKey) {
    if (!hasFeature('riwe')) return false;
    if (isTrimesterBlocked(plan, trimester)) return false;
    const starts = riweStartTrimesters(plan, intakeKey);
    const firstStart = starts[0];
    if (trimester !== firstStart) return false;
    if (!meetsRiwePrereq(plan, trimester)) return false;
    if (plan.riweAt != null && plan.riweAt !== trimester) return false;
    return true;
  }

  function riweCellTrimesters(plan, intakeKey) {
    const span = riweSpanTrimesters(plan, intakeKey);
    if (span.length) return new Set(span);
    const slots = riweCalendarSlots(plan, intakeKey);
    const duration = riweDurationTrimesters();
    return new Set(slots.slice(0, duration));
  }

  function lastRiweTrimester(plan, intakeKey) {
    if (plan.riweAt == null) return null;
    const span = riweSpanTrimesters(plan, intakeKey);
    return span.length ? span[span.length - 1] : null;
  }

  function isRiweCompleteBefore(plan, intakeKey, trimester) {
    if (!hasFeature('riwe')) return true;
    const last = lastRiweTrimester(plan, intakeKey);
    if (last == null) return false;
    return trimester > last;
  }

  function isRiweActiveTrimester(plan, intakeKey, trimester) {
    if (plan.riweAt == null) return false;
    return riweSpanTrimesters(plan, intakeKey).includes(trimester);
  }

  function firstRiweOfferTrimester(plan, intakeKey) {
    if (plan.riweAt != null) return null;
    const slots = riweStartTrimesters(plan, intakeKey);
    for (let i = 0; i < slots.length; i++) {
      const t = slots[i];
      if (canAssignRiwe(t, plan, intakeKey)) return t;
    }
    return null;
  }

  function meetsCapstonePrereq(plan, startTrimester) {
    const mc = countMcBefore(plan, startTrimester);
    const cc = hasCareerCatalystBefore(plan, startTrimester);
    const p = DATA.prerequisites.capstone;
    return mc >= p.minMc || (mc >= p.altMinMc && cc);
  }

  function canShowCapstoneOption(plan, trimester, intakeKey) {
    if (!isRiweCompleteBefore(plan, intakeKey, trimester)) return false;
    return canStartCapstone(plan, trimester) && meetsCapstonePrereq(plan, trimester);
  }

  function capstoneTrimestersFor(plan, intakeKey, maxTrimester) {
    const indices = DATA.intakes[intakeKey].capstoneTrimesters || [];
    return indices
      .map((st) => calendarTrimesterForStudyIndex(plan, st))
      .filter((t) => t != null && t <= maxTrimester);
  }

  function cumulativeCredits(plan, intakeKey, throughTrimester) {
    let total = 0;
    let ccCounted = false;
    let capCounted = false;
    const countedMc = new Set();
    const riweSpan = plan.riweAt != null ? riweSpanTrimesters(plan, intakeKey) : [];
    const riwePer = riweCreditsPerTrimester();
    const capCal = capstoneTrimestersFor(plan, intakeKey, throughTrimester);

    for (let t = 1; t <= throughTrimester; t++) {
      const idx = t - 1;
      [plan.mc, plan.reattemptMc, plan.remoduleMc].forEach((arr) => {
        const sel = arr && arr[idx];
        if (!sel || countedMc.has(sel)) return;
        const c = courseById(sel);
        if (c) {
          total += c.credits;
          countedMc.add(sel);
        }
      });
      const rplCr = rplCreditsAt(plan, t);
      if (rplCr > 0) {
        const rplId = rplMcAt(plan, t);
        if (rplId && rplCr >= (DATA.mcCredits || 18)) {
          if (!countedMc.has(rplId)) {
            const c = courseById(rplId);
            if (c) {
              total += c.credits;
              countedMc.add(rplId);
            }
          }
        } else {
          total += rplCr;
        }
      }
      if (plan.careerCatalystAt === t && !ccCounted) {
        total += DATA.wfeCcCredits;
        ccCounted = true;
      } else if (!ccCounted && rplWfeAt(plan, t)) {
        total += rplWfeCredits();
        ccCounted = true;
      }
      if (riweSpan.includes(t) && !isOnLeave(plan, t)) {
        total += riwePer;
      }

      if (plan.capstone && capCal.includes(t) && !capCounted) {
        if (t === capCal[0]) {
          total += DATA.capstoneCredits;
          capCounted = true;
        }
      }
    }
    return total;
  }

  function hasSelectionInTrimester(plan, intakeKey, trimester) {
    const idx = trimester - 1;
    if (plan.mc[idx]) return true;
    if (plan.reattemptMc && plan.reattemptMc[idx]) return true;
    if (plan.remoduleMc && plan.remoduleMc[idx]) return true;
    if (plan.careerCatalystAt === trimester) return true;
    if (isRiweActiveTrimester(plan, intakeKey, trimester)) return true;
    const capTs = capstoneTrimestersFor(plan, intakeKey, DATA.maxTotalTrimesters);
    if (plan.capstone && capTs.includes(trimester)) return true;
    if (rplCreditsAt(plan, trimester) > 0) return true;
    if (rplWfeAt(plan, trimester)) return true;
    if (isOnLeave(plan, trimester)) return true;
    if (isOnReattempt(plan, trimester)) return true;
    if (isOnRemodule(plan, trimester)) return true;
    return false;
  }

  function allVisibleTrimestersOccupied(plan, intakeKey, maxTrimester) {
    for (let t = 1; t <= maxTrimester; t++) {
      if (!hasSelectionInTrimester(plan, intakeKey, t)) return false;
    }
    return true;
  }

  function milestoneCalendarTrimesters(plan, intakeKey) {
    const trimesters = [];
    const intake = DATA.intakes[intakeKey];
    if (!intake) return trimesters;

    (intake.capstoneTrimesters || []).forEach((st) => {
      const cal = calendarTrimesterForStudyIndex(plan, st);
      if (cal) trimesters.push(cal);
    });

    if (hasFeature('riwe')) {
      riweCalendarSlots(plan, intakeKey).forEach((t) => trimesters.push(t));
      if (plan.riweAt != null) {
        riweSpanTrimesters(plan, intakeKey).forEach((t) => trimesters.push(t));
      }
    }

    for (let t = DATA.maxTotalTrimesters; t >= 1; t--) {
      if (hasSelectionInTrimester(plan, intakeKey, t)) {
        trimesters.push(t);
        break;
      }
    }

    return trimesters;
  }

  function extensionForMilestones(plan, intakeKey) {
    const milestones = milestoneCalendarTrimesters(plan, intakeKey);
    if (!milestones.length) return 0;
    return Math.max(0, Math.max(...milestones) - DATA.maxCoreTrimesters);
  }

  function suggestedExtensionTrimesters(plan, intakeKey) {
    const maxExt = DATA.maxTotalTrimesters - DATA.maxCoreTrimesters;
    let ext = extensionForMilestones(plan, intakeKey);

    let maxT = DATA.maxCoreTrimesters + ext;
    while (ext < maxExt) {
      const caps = capstoneTrimestersFor(plan, intakeKey, maxT);
      if (hasFeature('capstone') && plan.capstone && caps.length === 0) {
        ext++;
        maxT = DATA.maxCoreTrimesters + ext;
        continue;
      }
      if (!allVisibleTrimestersOccupied(plan, intakeKey, maxT)) break;
      if (creditBreakdown(plan).total >= DATA.totalCredits) break;
      ext++;
      maxT = DATA.maxCoreTrimesters + ext;
    }

    return Math.min(maxExt, ext);
  }

  function hasPlanFromTrimester(plan, intakeKey, fromTrimester, maxTrimester) {
    for (let t = fromTrimester; t <= maxTrimester; t++) {
      if (hasSelectionInTrimester(plan, intakeKey, t)) return true;
    }
    return false;
  }

  function firstPlannedTrimester(plan, intakeKey, maxTrimester) {
    for (let t = 1; t <= maxTrimester; t++) {
      if (hasSelectionInTrimester(plan, intakeKey, t)) return t;
    }
    return null;
  }

  function showCumulativeAtTrimester(plan, intakeKey, trimester, maxTrimester) {
    const first = firstPlannedTrimester(plan, intakeKey, maxTrimester);
    if (first == null || trimester < first) return false;
    return hasPlanFromTrimester(plan, intakeKey, trimester, maxTrimester);
  }

  function creditBreakdown(plan) {
    const countedMc = new Set();
    let mc = 0;
    let foundation = 0;
    let stackable = 0;
    let wfeCc = 0;
    if (plan.careerCatalystAt != null) wfeCc = DATA.wfeCcCredits;
    else if ((plan.rplWfe || []).some(Boolean)) wfeCc = rplWfeCredits();
    let riwe = 0;
    if (plan.riweAt != null) {
      const duration = (DATA.prerequisites.wfeRiwe && DATA.prerequisites.wfeRiwe.durationTrimesters) || 2;
      riwe = duration * riweCreditsPerTrimester();
    }
    let capstone = plan.capstone ? DATA.capstoneCredits : 0;
    let rpl = 0;

    addUniqueMcCredits(plan, countedMc, (c) => {
      mc += c.credits;
      if (isFoundation(c)) foundation += c.credits;
      else stackable += c.credits;
    });

    (plan.rplCredits || []).forEach((cr, i) => {
      const credits = cr || 0;
      if (credits <= 0) return;
      const id = plan.rplMc && plan.rplMc[i];
      if (id && credits >= (DATA.mcCredits || 18)) {
        if (!countedMc.has(id)) {
          const c = courseById(id);
          if (c) {
            countedMc.add(id);
            mc += c.credits;
            if (isFoundation(c)) foundation += c.credits;
            else stackable += c.credits;
          }
        }
      } else {
        rpl += credits;
      }
    });

    return { mc, foundation, stackable, wfeCc, riwe, capstone, rpl, total: mc + wfeCc + riwe + capstone + rpl };
  }

  function componentAvailability(kind) {
    return (DATA.componentAvailability && DATA.componentAvailability[kind]) || '';
  }

  function applyReattempt(plan, trimester, intakeKey) {
    if (trimester < 2) return false;
    const prevId = courseAtTrimester(plan, trimester - 1);
    if (!prevId) return false;
    if (countCourseAttempts(plan, prevId) >= 3) return false;
    if (!courseRetryTrimesters(intakeKey, prevId, DATA.maxTotalTrimesters).has(trimester)) return false;
    if (!plan.reattemptMc) plan.reattemptMc = new Array(DATA.maxTotalTrimesters).fill(EMPTY);
    plan.reattemptMc[trimester - 1] = prevId;
    return true;
  }

  function coursesForReattempt(plan, trimester, intakeKey) {
    const sameTri = courseIdsUsedInTrimester(plan, trimester, 'reattempt');
    const maxT = DATA.maxTotalTrimesters;
    const candidates = new Set();
    if (trimester >= 2) {
      const prev = courseAtTrimester(plan, trimester - 1);
      if (prev) candidates.add(prev);
    }
    allScheduledCourseEntries(plan).forEach(({ trimester: t, id }) => {
      if (t < trimester) candidates.add(id);
    });
    return [...candidates]
      .map((id) => courseById(id))
      .filter((c) => {
        if (!c) return false;
        if (sameTri.has(c.id)) return false;
        if (!hasPriorCourseAttempt(plan, c.id, trimester)) return false;
        if (countCourseAttemptsExcluding(plan, c.id, trimester, 'reattempt') >= 3) return false;
        return courseRetryTrimesters(intakeKey, c.id, maxT).has(trimester);
      });
  }

  function coursesForRemodule(plan, trimester, intakeKey) {
    const sameTri = courseIdsUsedInTrimester(plan, trimester, 'remodule');
    const maxT = DATA.maxTotalTrimesters;
    return [...uniqueMcIds(plan)]
      .map((id) => courseById(id))
      .filter((c) => {
        if (!c) return false;
        if (sameTri.has(c.id)) return false;
        if (!hasPriorCourseAttempt(plan, c.id, trimester)) return false;
        if (countCourseAttemptsExcluding(plan, c.id, trimester, 'remodule') >= 3) return false;
        return courseRetryTrimesters(intakeKey, c.id, maxT).has(trimester);
      });
  }

  function isCourseOfferedInTrimester(intakeKey, trimester, courseId) {
    const month = monthForTrimester(intakeKey, trimester);
    return courseIdsOfferedInMonth(month).includes(courseId);
  }

  function countMcCategories(plan) {
    const counts = { foundation: 0, stackable: 0, mc: 0 };
    uniqueMcIds(plan).forEach((id) => {
      const c = courseById(id);
      if (!c) return;
      counts.mc++;
      if (isFoundation(c)) counts.foundation++;
      else counts.stackable++;
    });
    return counts;
  }

  function programmePathMilestones(plan, intakeKey) {
    const counts = countMcCategories(plan);
    const bd = creditBreakdown(plan);
    const labels = DATA.catalogLabels || {};
    const raw = [];

    if (DATA.foundationCount > 0) {
      raw.push({
        id: 'foundation',
        label: labels.foundation || 'Foundation',
        progress: `${Math.min(counts.foundation, DATA.foundationCount)}/${DATA.foundationCount}`,
        done: counts.foundation >= DATA.foundationCount,
      });
    }

    if (DATA.foundationCount > 0 && DATA.stackableCount > 0) {
      raw.push({
        id: 'stackable',
        label: labels.stackable || 'Stackable',
        progress: `${Math.min(counts.stackable, DATA.stackableCount)}/${DATA.stackableCount}`,
        done: counts.stackable >= DATA.stackableCount,
      });
    } else {
      raw.push({
        id: 'mc',
        label: labels.foundation || 'Modules',
        progress: `${Math.min(counts.mc, DATA.mcCount)}/${DATA.mcCount}`,
        done: counts.mc >= DATA.mcCount,
      });
    }

    if (hasFeature('wfeCc')) {
      const wfeDone = hasCareerCatalystCredit(plan);
      raw.push({
        id: 'wfe_cc',
        label: componentName('wfe_cc'),
        progress: wfeDone ? 'Complete' : bd.wfeCc > 0 ? `${bd.wfeCc}/${DATA.wfeCcCredits} cr` : 'Not started',
        done: wfeDone,
        partial: !wfeDone && bd.wfeCc > 0,
        trimester: plan.careerCatalystAt,
      });
    }

    if (hasFeature('riwe')) {
      const riweDone = plan.riweAt != null;
      raw.push({
        id: 'riwe',
        label: componentName('riwe'),
        progress: riweDone ? `${bd.riwe}/${DATA.riweCredits} cr` : 'Not started',
        done: riweDone,
        partial: false,
        trimester: plan.riweAt,
      });
    }

    if (hasFeature('capstone')) {
      const capTs = capstoneTrimestersFor(plan, intakeKey, DATA.maxTotalTrimesters);
      const capDone = plan.capstone;
      raw.push({
        id: 'capstone',
        label: componentName('capstone'),
        progress: capDone ? `${DATA.capstoneCredits} cr` : 'Not started',
        done: capDone,
        partial: false,
        trimester: capDone && capTs.length ? capTs[0] : null,
      });
    }

    raw.push({
      id: 'complete',
      label: 'Complete',
      progress: `${bd.total} / ${DATA.totalCredits} cr`,
      done: bd.total >= DATA.totalCredits,
      partial: bd.total > 0 && bd.total < DATA.totalCredits,
    });

    let seenActive = false;
    return raw.map((step) => {
      const partial =
        step.partial != null
          ? step.partial
          : !step.done &&
            ((step.id === 'foundation' && counts.foundation > 0) ||
              (step.id === 'stackable' && counts.stackable > 0) ||
              (step.id === 'mc' && counts.mc > 0));
      let status = 'pending';
      if (step.done) status = 'done';
      else if (!seenActive) {
        status = partial ? 'partial' : 'active';
        seenActive = true;
      }
      return { ...step, partial, status };
    });
  }

  function analyze(plan, intakeKey) {
    const issues = [];
    const counts = { foundation: 0, stackable: 0, mc: 0 };
    const capTs = capstoneTrimestersFor(plan, intakeKey, DATA.maxTotalTrimesters);
    const ccName = componentName('wfe_cc');
    const riweName = componentName('riwe');

    const uniqueIds = uniqueMcIds(plan);
    const attemptTotals = {};

    allScheduledCourseEntries(plan).forEach(({ trimester: t, id, slot }) => {
      attemptTotals[id] = (attemptTotals[id] || 0) + 1;
      if (isOnLeave(plan, t)) {
        const c = courseById(id);
        issues.push({
          type: 'error',
          msg: `Trimester ${t}: cannot assign ${c ? c.name : 'a micro-credential'} during leave (${slot}).`,
        });
        return;
      }
      if (plan.careerCatalystAt === t && slot === 'mc') {
        const c = courseById(id);
        issues.push({
          type: 'error',
          msg: `Trimester ${t}: ${c ? c.name : 'Micro-credential'} cannot be taken in the same trimester as ${ccName}.`,
        });
        return;
      }
      const month = monthForTrimester(intakeKey, t);
      const c = courseById(id);
      if (!c) {
        issues.push({ type: 'error', msg: `Trimester ${t}: unknown selection (${slot}).` });
        return;
      }
      if (slot === 'mc' && !isCourseOfferedInTrimester(intakeKey, t, c.id)) {
        issues.push({
          type: 'error',
          msg: `Trimester ${t} (${month}): ${c.name} is not offered this trimester.`,
        });
      }
      if ((slot === 'reattempt' || slot === 'remodule') && !courseRetryTrimesters(intakeKey, c.id, DATA.maxTotalTrimesters).has(t)) {
        issues.push({
          type: 'error',
          msg: `Trimester ${t}: ${c.name} ${slot} is only allowed in the ${reattemptOfferWindow()} trimesters when that course is offered.`,
        });
      }
    });

    for (let t = 1; t <= DATA.maxTotalTrimesters; t++) {
      const idx = t - 1;
      const inTri = [plan.mc[idx], plan.reattemptMc?.[idx], plan.remoduleMc?.[idx]].filter(Boolean);
      if (inTri.length > 1 && new Set(inTri).size !== inTri.length) {
        issues.push({
          type: 'error',
          msg: `Trimester ${t}: MC, Reattempt, and Remodule must be different courses in the same trimester.`,
        });
      }
      if (hasFeature('reattempt') && isOnReattempt(plan, t) && !plan.reattemptMc?.[idx]) {
        issues.push({
          type: 'warn',
          msg: `Trimester ${t}: Reattempt enabled — select a course in the offering window.`,
        });
      }
      if (hasFeature('remodule') && isOnRemodule(plan, t) && !plan.remoduleMc?.[idx]) {
        issues.push({
          type: 'warn',
          msg: `Trimester ${t}: Remodule enabled — select a course in the offering window.`,
        });
      }
      const load = trimesterActivityCredits(plan, intakeKey, t);
      if (load > rplMaxPerTrimester()) {
        issues.push({
          type: 'error',
          msg: `Trimester ${t}: ${load} credits scheduled (max ${rplMaxPerTrimester()} per trimester).`,
        });
      }
    }

    Object.entries(attemptTotals).forEach(([id, n]) => {
      if (n > 3) {
        const c = courseById(id);
        issues.push({
          type: 'error',
          msg: `${c ? c.name : 'Module'}: maximum 3 attempts allowed (have ${n}).`,
        });
      }
    });

    uniqueIds.forEach((id) => {
      const c = courseById(id);
      if (!c) return;
      counts.mc++;
      if (isFoundation(c)) counts.foundation++;
      else counts.stackable++;
    });

    if (hasFeature('wfeCc')) {
      if (!hasCareerCatalystCredit(plan)) {
        issues.push({ type: 'warn', msg: `${ccName} not yet scheduled (or WFE RPL).` });
      } else if (plan.careerCatalystAt != null && isOnLeave(plan, plan.careerCatalystAt)) {
        issues.push({ type: 'error', msg: `${ccName} cannot be scheduled on a leave trimester.` });
      }
      if (plan.careerCatalystAt != null && (plan.rplWfe || []).some(Boolean)) {
        issues.push({ type: 'error', msg: `${ccName} cannot combine scheduled CC with WFE RPL.` });
      }
    }

    const leaveCount = (plan.leave || []).filter(Boolean).length;
    const reattemptCount = (plan.reattempt || []).filter(Boolean).length;
    const remoduleCount = (plan.remodule || []).filter(Boolean).length;
    const delayCount = leaveCount + reattemptCount + remoduleCount;
    if (delayCount > 0) {
      const parts = [];
      if (leaveCount) parts.push(`${leaveCount} leave`);
      if (reattemptCount) parts.push(`${reattemptCount} reattempt`);
      if (remoduleCount) parts.push(`${remoduleCount} remodule`);
      issues.push({
        type: 'info',
        msg: `${delayCount} delay trimester(s) (${parts.join(', ')}) — RIWE and Capstone shift to later calendar trimesters.`,
      });
    }

    if (hasFeature('rpl')) {
      if (totalRplCredits(plan) > rplMaxTotalCredits()) {
        issues.push({
          type: 'error',
          msg: `Total RPL ${totalRplCredits(plan)} credits exceeds maximum ${rplMaxTotalCredits()}.`,
        });
      }
      (plan.rplCredits || []).forEach((cr, i) => {
        const t = i + 1;
        const credits = cr || 0;
        if (credits <= 0) return;
        if (credits >= (DATA.mcCredits || 18)) {
          const id = plan.rplMc && plan.rplMc[i];
          if (!id) {
            issues.push({
              type: 'warn',
              msg: `Trimester ${t}: RPL ${credits} cr — select exempted micro-credential.`,
            });
          } else if (allScheduledCourseEntries(plan).some((e) => e.id === id)) {
            const c = courseById(id);
            issues.push({
              type: 'error',
              msg: `Trimester ${t}: ${c ? c.name : 'Micro-credential'} already scheduled; RPL duplicates it.`,
            });
          }
        }
      });
    }

    const foundationLabel = (DATA.catalogLabels && DATA.catalogLabels.foundation) || 'foundation';

    if (counts.foundation < DATA.foundationCount) {
      issues.push({
        type: 'warn',
        msg: `Need ${DATA.foundationCount} ${foundationLabel.toLowerCase()} micro-credentials (have ${counts.foundation}).`,
      });
    }
    if (counts.foundation > DATA.foundationCount) {
      issues.push({
        type: 'error',
        msg: `Too many ${foundationLabel.toLowerCase()} micro-credentials (max ${DATA.foundationCount}).`,
      });
    }
    const foundationRequired = Object.values(DATA.foundationSlots || {});
    if (foundationRequired.length && counts.foundation > 0) {
      const scheduledNames = new Set(
        allScheduledCourseEntries(plan)
          .map(({ id }) => courseById(id)?.name)
          .concat((plan.rplMc || []).filter(Boolean).map((id) => courseById(id)?.name))
          .filter(Boolean)
      );
      const missing = foundationRequired.filter((name) => !scheduledNames.has(name));
      if (missing.length) {
        const label = DATA.catalogLabels?.foundation || 'Foundation';
        issues.push({
          type: 'warn',
          msg: `${label} must include ${foundationRequired.join(' and ')}.`,
        });
      }
    }

    if (counts.stackable < DATA.stackableCount) {
      issues.push({
        type: 'warn',
        msg: `Need ${DATA.stackableCount} stackable micro-credentials (have ${counts.stackable}).`,
      });
    }
    if (counts.mc < DATA.mcCount) {
      issues.push({ type: 'warn', msg: `Need ${DATA.mcCount} micro-credentials total (have ${counts.mc}).` });
    }
    if (counts.mc > DATA.mcCount) {
      issues.push({ type: 'error', msg: `Maximum ${DATA.mcCount} micro-credentials allowed.` });
    }

    if (hasFeature('riwe')) {
      if (plan.riweAt == null) {
        issues.push({ type: 'warn', msg: `${riweName} not marked (study Year 2 only).` });
      } else {
        if (!canOfferRiwe(plan, plan.riweAt)) {
          issues.push({ type: 'error', msg: `${riweName} must be scheduled in study Year ${DATA.constraints.wfeRiweYear || 2} or later.` });
        }
        const riweStarts = riweStartTrimesters(plan, intakeKey);
        if (!riweStarts.includes(plan.riweAt)) {
          issues.push({
            type: 'error',
            msg: `${riweName} must start after at least 3 study trimesters (earliest: trimester ${riweStarts[0] || '—'}).`,
          });
        }
        if (!meetsRiwePrereq(plan, plan.riweAt)) {
          issues.push({
            type: 'error',
            msg: `${riweName} (from Tri ${plan.riweAt}): prerequisite not met (${DATA.prerequisites.wfeRiwe.description}).`,
          });
        }
        if (studyTrimesterIndex(plan, plan.riweAt) < minRiweStudyIndex(intakeKey)) {
          issues.push({
            type: 'error',
            msg: `${riweName} can only start after at least ${minRiweStudyIndex(intakeKey) - 1} study trimesters have passed.`,
          });
        }
        if (isTrimesterBlocked(plan, plan.riweAt)) {
          issues.push({
            type: 'error',
            msg: `${riweName} cannot be scheduled on a delay trimester.`,
          });
        }
      }
    }

    const capYear = DATA.constraints.capstoneMinYear || 3;
    if (hasFeature('capstone') && !plan.capstone) {
      issues.push({
        type: 'warn',
        msg: `${componentName('capstone')} not marked (study Year ${capYear}+ only).`,
      });
    } else if (hasFeature('capstone') && plan.capstone && capTs.length) {
      if (!canStartCapstone(plan, capTs[0])) {
        issues.push({
          type: 'error',
          msg: `${componentName('capstone')} can only start in study Year ${capYear}+ (trimesters ${capTs.join(', ')}).`,
        });
      }
      if (!meetsCapstonePrereq(plan, capTs[0])) {
        issues.push({
          type: 'error',
          msg: `${componentName('capstone')} (from Tri ${capTs[0]}): prerequisite not met (${DATA.prerequisites.capstone.description}).`,
        });
      }
      if (!isRiweCompleteBefore(plan, intakeKey, capTs[0])) {
        issues.push({
          type: 'error',
          msg: `${componentName('capstone')} cannot start until ${riweName} is complete.`,
        });
      }
    }

    const breakdown = creditBreakdown(plan);
    if (breakdown.total < DATA.totalCredits) {
      issues.push({
        type: 'warn',
        msg: `Credits: ${breakdown.total}/${DATA.totalCredits}.`,
      });
    }
    if (breakdown.total > DATA.totalCredits) {
      issues.push({ type: 'error', msg: `Credits exceed degree total (${breakdown.total}/${DATA.totalCredits}).` });
    }

    const errors = issues.filter((i) => i.type === 'error');
    const ready =
      errors.length === 0 &&
      counts.mc === DATA.mcCount &&
      (!hasFeature('wfeCc') || hasCareerCatalystCredit(plan)) &&
      (!hasFeature('riwe') || plan.riweAt != null) &&
      (!hasFeature('capstone') || plan.capstone) &&
      breakdown.total === DATA.totalCredits;

    return { counts, breakdown, issues, ready };
  }

  function defaultPlan(intakeKey) {
    const intake = DATA.intakes[intakeKey];
    const mc = new Array(DATA.maxTotalTrimesters).fill(EMPTY);
    const used = new Set();
    let careerCatalystAt = null;

    intake.idealFirstAttempt.forEach((slot, i) => {
      if (!slot) return;
      const trimester = i + 1;
      const partial = { mc: [...mc], careerCatalystAt };

      if (slot === 'WFE-CC') {
        careerCatalystAt = trimester;
        return;
      }
      if (slot.startsWith('Foundation')) {
        const name = DATA.foundationSlots[slot];
        const c = DATA.courses.find((x) => x.name === name);
        if (c && isCourseOfferedInTrimester(intakeKey, trimester, c.id)) {
          mc[i] = c.id;
          used.add(c.id);
        }
        return;
      }
      if (slot.startsWith('MC')) {
        const offered = coursesOfferedInTrimester(intakeKey, trimester, partial).filter(isStackable);
        const pick = offered.find((c) => !used.has(c.id));
        if (pick) {
          mc[i] = pick.id;
          used.add(pick.id);
        }
      }
    });

    const noDelays = {
      leave: new Array(DATA.maxTotalTrimesters).fill(false),
      reattempt: new Array(DATA.maxTotalTrimesters).fill(false),
      remodule: new Array(DATA.maxTotalTrimesters).fill(false),
    };
    const riweAt =
      hasFeature('riwe') && intake.wfeRiweTrimesters && intake.wfeRiweTrimesters.length
        ? calendarTrimesterForStudyIndex(noDelays, intake.wfeRiweTrimesters[0])
        : null;
    return {
      mc,
      careerCatalystAt: hasFeature('wfeCc') ? careerCatalystAt : null,
      riweAt,
      capstone: hasFeature('capstone'),
      leave: noDelays.leave,
      reattempt: noDelays.reattempt,
      remodule: noDelays.remodule,
      reattemptMc: new Array(DATA.maxTotalTrimesters).fill(EMPTY),
      remoduleMc: new Array(DATA.maxTotalTrimesters).fill(EMPTY),
      rplCredits: new Array(DATA.maxTotalTrimesters).fill(0),
      rplMc: new Array(DATA.maxTotalTrimesters).fill(null),
      rplWfe: new Array(DATA.maxTotalTrimesters).fill(false),
    };
  }

  function countUniqueMcScheduled(plan) {
    return uniqueMcIds(plan).size;
  }

  function canStillScheduleCourse(intakeKey, plan, used, afterTrimester, courseId) {
    if (used.has(courseId)) return false;
    for (let t = afterTrimester + 1; t <= DATA.maxCoreTrimesters; t++) {
      if (plan.mc[t - 1] || isOnLeave(plan, t)) continue;
      if (isCourseOfferedInTrimester(intakeKey, t, courseId)) return true;
    }
    return false;
  }

  function scoreMcForSuggest(course, intakeKey, trimester, plan, used) {
    let score = Math.random() * 22;
    if (isFoundation(course)) {
      score += 160;
      if (course.id === 'dlc') score += 12;
      if (course.id === 'ethical') score += 10;
    }
    if (course.id === 'ml') score += 38;
    if (course.id === 'genai') {
      score -= 20;
      if (!used.has('ml') && canStillScheduleCourse(intakeKey, plan, used, trimester, 'ml')) {
        score -= 75;
      }
    }
    return score;
  }

  function bestMcForTrimester(intakeKey, trimester, plan, used) {
    const offered = coursesOfferedInTrimester(intakeKey, trimester, plan).filter((c) => !used.has(c.id));
    if (!offered.length) return null;
    return offered.sort(
      (a, b) =>
        scoreMcForSuggest(b, intakeKey, trimester, plan, used) -
        scoreMcForSuggest(a, intakeKey, trimester, plan, used)
    )[0];
  }

  function findCareerCatalystTrimester(intakeKey, plan, used) {
    const maxT = DATA.maxCoreTrimesters;
    const candidates = [];
    for (let t = 1; t <= maxT; t++) {
      if (!canAssignCareerCatalyst(t, plan)) continue;
      if (plan.mc[t - 1]) continue;
      const mcBefore = countMcBefore(plan, t);
      if (mcBefore < 1) continue;
      let score = mcBefore * 8;
      if (mcBefore >= 2) score += 22;
      if (t >= 3) score += 8;
      score += Math.random() * 28;
      candidates.push({ t, score, mcBefore });
    }
    if (!candidates.length) return null;
    const withTwoMc = candidates.filter((c) => c.mcBefore >= 2);
    const pool = withTwoMc.length ? withTwoMc : candidates;
    pool.sort((a, b) => b.score - a.score);
    const top = pool.slice(0, Math.min(3, pool.length));
    return top[Math.floor(Math.random() * top.length)].t;
  }

  function assignMicroCredentials(intakeKey, plan, used) {
    const maxT = DATA.maxCoreTrimesters;
    for (let t = 1; t <= maxT; t++) {
      if (countUniqueMcScheduled(plan) >= DATA.mcCount) break;
      if (!canAssignMc(t, plan) || plan.mc[t - 1]) continue;
      const pick = bestMcForTrimester(intakeKey, t, plan, used);
      if (pick) {
        plan.mc[t - 1] = pick.id;
        used.add(pick.id);
      }
    }
    for (let t = 1; t <= maxT; t++) {
      if (countUniqueMcScheduled(plan) >= DATA.mcCount) break;
      if (!canAssignMc(t, plan) || plan.mc[t - 1]) continue;
      const pick = bestMcForTrimester(intakeKey, t, plan, used);
      if (pick) {
        plan.mc[t - 1] = pick.id;
        used.add(pick.id);
      }
    }
  }

  function suggestPlan(intakeKey) {
    const plan = emptyPlan();
    const used = new Set();
    const intake = DATA.intakes[intakeKey];

    assignMicroCredentials(intakeKey, plan, used);

    if (hasFeature('wfeCc')) {
      const ccTri = findCareerCatalystTrimester(intakeKey, plan, used);
      if (ccTri != null) plan.careerCatalystAt = ccTri;
    }

    if (hasFeature('riwe')) {
      const riweTri = firstRiweOfferTrimester(plan, intakeKey);
      if (riweTri != null) plan.riweAt = riweTri;
    }

    if (hasFeature('capstone')) {
      const capTs = capstoneTrimestersFor(plan, intakeKey, DATA.maxCoreTrimesters);
      plan.capstone = capTs.some((t) => canShowCapstoneOption(plan, t, intakeKey));
    }

    return plan;
  }

  function trimesterLabel(intakeKey, t, startYear) {
    const meta = trimesterMeta(intakeKey, startYear || new Date().getFullYear(), t);
    const ext = t > DATA.maxCoreTrimesters;
    const prefix = ext ? `Ext ${t - DATA.maxCoreTrimesters}` : `${meta.ayLabel} T${meta.triInAy}`;
    return `${prefix} · ${meta.periodLabel}`;
  }

  function coursesGrouped() {
    return {
      foundation: DATA.courses.filter((c) => c.category === 'foundation'),
      stackable: DATA.courses.filter((c) => c.category === 'stackable'),
    };
  }

  function riweTrimestersForIntake(plan, intakeKey) {
    return riweStartTrimesters(plan, intakeKey);
  }

  function coursesForRpl(plan, trimester) {
    const completed = uniqueMcIds(plan);
    const current = rplMcAt(plan, trimester);
    return DATA.courses.filter((c) => !completed.has(c.id) || c.id === current);
  }

  async function loadData(programId) {
    if (!REGISTRY) {
      let raw = null;
      try {
        const res = await fetch('data.json');
        if (res.ok) raw = await res.json();
      } catch (_) {
        /* file:// */
      }
      if (!raw && global.__CSM_PROGRAMME_DATA__) raw = global.__CSM_PROGRAMME_DATA__;
      if (!raw) throw new Error('Could not load programme data.');
      REGISTRY = normalizeRegistry(raw);
    }
    const id = programId || ACTIVE_PROGRAM_ID || REGISTRY.defaultProgramId;
    return applyProgram(id);
  }

  function setData(d) {
    if (d.programs) {
      REGISTRY = d;
      applyProgram(REGISTRY.defaultProgramId);
      return;
    }
    REGISTRY = normalizeRegistry(d);
    applyProgram(REGISTRY.defaultProgramId);
  }

  function getData() {
    return DATA;
  }

  global.CSMPlanner = {
    loadData,
    setData,
    getData,
    applyProgram,
    listPrograms,
    getActiveProgramId,
    getRegistry,
    hasFeature,
    monthForTrimester,
    yearForTrimester,
    triInYear,
    trimesterMeta,
    trimesterCalendarStart,
    academicYearForMonth,
    cohortLabel,
    cohortParts,
    ayPalette,
    colsForTriRange,
    rowLabelText,
    buildAyGroups,
    ayGroupForTrimester,
    tilesForTrimester,
    coursesOfferedInTrimester,
    selectionLabel,
    cumulativeCredits,
    hasSelectionInTrimester,
    hasPlanFromTrimester,
    firstPlannedTrimester,
    showCumulativeAtTrimester,
    creditBreakdown,
    analyze,
    emptyPlan,
    suggestPlan,
    defaultPlan,
    trimesterLabel,
    coursesGrouped,
    courseById,
    componentName,
    canAssignCareerCatalyst,
    canAssignMc,
    canOfferRiwe,
    canShowRiweOption,
    canAssignRiwe,
    riweStartTrimesters,
    riweCellTrimesters,
    capstoneTrimestersFor,
    riweSpanTrimesters,
    isRiweActiveTrimester,
    firstRiweOfferTrimester,
    canStartCapstone,
    canShowCapstoneOption,
    meetsRiwePrereq,
    meetsCapstonePrereq,
    riweTrimestersForIntake,
    isOnLeave,
    isOnReattempt,
    isOnRemodule,
    isPlanningDelay,
    studyTrimesterIndex,
    studyYearAt,
    getMinCohortYear,
    getDefaultCohortYear,
    sanitizePlanSchedule,
    rplMaxPerTrimester,
    rplCreditsAt,
    rplMcAt,
    cycleRplCredits,
    coursesForRpl,
    isTrimesterBlocked,
    countCourseAttempts,
    applyReattempt,
    coursesForMcSlot,
    courseIdsUsedInTrimester,
    tilesForMcSlot,
    coursesForReattempt,
    coursesForRemodule,
    courseAtTrimester,
    courseRetryTrimesters,
    trimesterActivityCredits,
    totalRplCredits,
    rplMaxTotalCredits,
    rplWfeCredits,
    rplWfeAt,
    cycleRplWfe,
    hasCareerCatalystCredit,
    isOnLeaveOnly,
    suggestedExtensionTrimesters,
    allVisibleTrimestersOccupied,
    componentAvailability,
    isRiweCompleteBefore,
    lastRiweTrimester,
    riweCreditsPerTrimester,
    uniqueMcIds,
    formatTileLabel,
    formatCatalogRefLabel,
    programmePathMilestones,
    countMcCategories,
    EMPTY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
