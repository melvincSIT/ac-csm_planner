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
    return DATA.features[feature] !== false;
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
      careerCatalystAt: null,
      riweAt: null,
      capstone: false,
      leave: new Array(DATA.maxTotalTrimesters).fill(false),
      reattempt: new Array(DATA.maxTotalTrimesters).fill(false),
      remodule: new Array(DATA.maxTotalTrimesters).fill(false),
      rplCredits: new Array(DATA.maxTotalTrimesters).fill(0),
      rplMc: new Array(DATA.maxTotalTrimesters).fill(null),
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

  function rplMaxPerTrimester() {
    return DATA.rplMaxCreditsPerTrimester || 24;
  }

  function rplCreditSteps() {
    return DATA.rplCreditSteps || [0, 6, 12, 18, 24];
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

  function countCourseAttempts(plan, courseId) {
    let n = 0;
    plan.mc.forEach((id) => {
      if (id === courseId) n++;
    });
    return n;
  }

  function uniqueMcIds(plan) {
    const ids = new Set(plan.mc.filter(Boolean));
    (plan.rplMc || []).forEach((id, i) => {
      if (id && rplCreditsAt(plan, i + 1) >= (DATA.mcCredits || 18)) ids.add(id);
    });
    return ids;
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
    plan.mc.forEach((id) => {
      const c = courseById(id);
      if (c) scheduledNames.add(c.name);
    });
    return required.every((name) => scheduledNames.has(name));
  }

  function hasCareerCatalystBefore(plan, trimester) {
    return plan.careerCatalystAt != null && plan.careerCatalystAt < trimester;
  }

  function courseIdsOfferedInMonth(month) {
    return DATA.offeringsByMonth[month] || [];
  }

  function usedCourseIds(plan, exceptTrimester) {
    const used = new Set();
    plan.mc.forEach((sel, i) => {
      if (sel && i + 1 !== exceptTrimester) used.add(sel);
    });
    return used;
  }

  function coursesOfferedInTrimester(intakeKey, trimester, plan) {
    const month = monthForTrimester(intakeKey, trimester);
    const ids = courseIdsOfferedInMonth(month);
    const used = usedCourseIds(plan, trimester);
    const bothFoundations = hasBothFoundations(plan);

    return ids
      .map((id) => courseById(id))
      .filter((c) => {
        if (!c) return false;
        if (used.has(c.id)) return false;
        if (bothFoundations && isFoundation(c)) return false;
        return true;
      });
  }

  function tilesForTrimester(intakeKey, trimester, plan) {
    return coursesOfferedInTrimester(intakeKey, trimester, plan).map((c) => ({
      type: 'course',
      id: c.id,
      course: c,
    }));
  }

  function canAssignCareerCatalyst(trimester, plan) {
    if (!hasFeature('wfeCc')) return false;
    if (isTrimesterBlocked(plan, trimester)) return false;
    if (plan.careerCatalystAt != null && plan.careerCatalystAt !== trimester) return false;
    if (plan.mc[trimester - 1]) return false;
    return true;
  }

  function canAssignMc(trimester, plan) {
    if (isTrimesterBlocked(plan, trimester)) return false;
    if (plan.careerCatalystAt === trimester) return false;
    if (isOnReattempt(plan, trimester)) return false;
    return true;
  }

  function canOfferRiwe(plan, trimester) {
    return studyYearAt(plan, trimester) === DATA.constraints.wfeRiweYear;
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
    for (let t = 0; t < trimester - 1; t++) {
      if (plan.mc[t]) n++;
      else if (rplMcAt(plan, t + 1) && rplCreditsAt(plan, t + 1) >= (DATA.mcCredits || 18)) n++;
    }
    return n;
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

  function riweCalendarSlots(plan, intakeKey) {
    return riweStudySlots(intakeKey)
      .map((st) => calendarTrimesterForStudyIndex(plan, st))
      .filter((t) => t != null);
  }

  function riweStartTrimesters(plan, intakeKey) {
    const slots = riweCalendarSlots(plan, intakeKey);
    return slots.length ? [slots[0]] : [];
  }

  function riweSpanTrimesters(plan, intakeKey) {
    const slots = riweCalendarSlots(plan, intakeKey);
    const duration = (DATA.prerequisites.wfeRiwe && DATA.prerequisites.wfeRiwe.durationTrimesters) || 2;
    if (!slots.length) return [];
    if (plan.riweAt == null) return slots.slice(0, duration);
    const startIdx = slots.indexOf(plan.riweAt);
    if (startIdx < 0) return [];
    return slots.slice(startIdx, startIdx + duration);
  }

  function sanitizePlanSchedule(plan, intakeKey) {
    if (plan.riweAt != null) {
      const starts = riweStartTrimesters(plan, intakeKey);
      if (!starts.length || plan.riweAt !== starts[0]) plan.riweAt = null;
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
    const duration = (DATA.prerequisites.wfeRiwe && DATA.prerequisites.wfeRiwe.durationTrimesters) || 2;
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
      const sel = plan.mc[t - 1];
      if (sel && !countedMc.has(sel)) {
        const c = courseById(sel);
        if (c) {
          total += c.credits;
          countedMc.add(sel);
        }
      }
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
    if (plan.mc[trimester - 1]) return true;
    if (plan.careerCatalystAt === trimester) return true;
    if (isRiweActiveTrimester(plan, intakeKey, trimester)) return true;
    const capTs = capstoneTrimestersFor(plan, intakeKey, DATA.maxTotalTrimesters);
    if (plan.capstone && capTs.includes(trimester)) return true;
    if (rplCreditsAt(plan, trimester) > 0) return true;
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

  function suggestedExtensionTrimesters(plan, intakeKey) {
    const breakdown = creditBreakdown(plan);
    if (breakdown.total >= DATA.totalCredits) return 0;
    let ext = 0;
    let maxT = DATA.maxCoreTrimesters;
    const maxExt = DATA.maxTotalTrimesters - DATA.maxCoreTrimesters;
    while (ext < maxExt) {
      if (!allVisibleTrimestersOccupied(plan, intakeKey, maxT)) break;
      if (creditBreakdown(plan).total >= DATA.totalCredits) break;
      ext++;
      maxT = DATA.maxCoreTrimesters + ext;
    }
    return ext;
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
    let wfeCc = plan.careerCatalystAt != null ? DATA.wfeCcCredits : 0;
    let riwe = 0;
    if (plan.riweAt != null) {
      const duration = (DATA.prerequisites.wfeRiwe && DATA.prerequisites.wfeRiwe.durationTrimesters) || 2;
      riwe = duration * riweCreditsPerTrimester();
    }
    let capstone = plan.capstone ? DATA.capstoneCredits : 0;
    let rpl = 0;

    plan.mc.forEach((sel) => {
      if (!sel || countedMc.has(sel)) return;
      const c = courseById(sel);
      if (!c) return;
      countedMc.add(sel);
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

  function applyReattempt(plan, trimester) {
    if (trimester < 2) return false;
    const prevId = plan.mc[trimester - 2];
    if (!prevId) return false;
    if (countCourseAttempts(plan, prevId) >= 3) return false;
    plan.mc[trimester - 1] = prevId;
    return true;
  }

  function coursesForRemodule(plan, trimester, intakeKey) {
    const seen = uniqueMcIds(plan);
    const used = usedCourseIds(plan, trimester);
    return [...seen]
      .map((id) => courseById(id))
      .filter((c) => {
        if (!c) return false;
        if (used.has(c.id) && plan.mc[trimester - 1] !== c.id) return false;
        if (countCourseAttempts(plan, c.id) >= 3) return false;
        return true;
      });
  }

  function isCourseOfferedInTrimester(intakeKey, trimester, courseId) {
    const month = monthForTrimester(intakeKey, trimester);
    return courseIdsOfferedInMonth(month).includes(courseId);
  }

  function analyze(plan, intakeKey) {
    const issues = [];
    const counts = { foundation: 0, stackable: 0, mc: 0 };
    const capTs = capstoneTrimestersFor(plan, intakeKey, DATA.maxTotalTrimesters);
    const ccName = componentName('wfe_cc');
    const riweName = componentName('riwe');

    const uniqueIds = uniqueMcIds(plan);
    const attemptTotals = {};

    plan.mc.forEach((sel, i) => {
      if (!sel) return;
      const t = i + 1;
      attemptTotals[sel] = (attemptTotals[sel] || 0) + 1;
      if (isTrimesterBlocked(plan, t) && !isOnReattempt(plan, t) && !isOnRemodule(plan, t)) {
        const c = courseById(sel);
        issues.push({
          type: 'error',
          msg: `Trimester ${t}: cannot assign ${c ? c.name : 'a micro-credential'} during leave.`,
        });
        return;
      }
      if (plan.careerCatalystAt === t) {
        const c = courseById(sel);
        issues.push({
          type: 'error',
          msg: `Trimester ${t}: ${c ? c.name : 'Micro-credential'} cannot be taken in the same trimester as ${ccName}.`,
        });
        return;
      }
      const month = monthForTrimester(intakeKey, t);
      const c = courseById(sel);
      if (!c) {
        issues.push({ type: 'error', msg: `Trimester ${t}: unknown selection.` });
        return;
      }
      if (!isCourseOfferedInTrimester(intakeKey, t, c.id) && !isOnReattempt(plan, t) && !isOnRemodule(plan, t)) {
        issues.push({
          type: 'error',
          msg: `Trimester ${t} (${month}): ${c.name} is not offered this trimester.`,
        });
      }
    });

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
      if (plan.careerCatalystAt != null) {
        if (isOnLeave(plan, plan.careerCatalystAt)) {
          issues.push({ type: 'error', msg: `${ccName} cannot be scheduled on a leave trimester.` });
        }
      } else {
        issues.push({ type: 'warn', msg: `${ccName} not yet scheduled.` });
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
      (plan.rplCredits || []).forEach((cr, i) => {
        const t = i + 1;
        const credits = cr || 0;
        if (credits <= 0) return;
        if (credits > rplMaxPerTrimester()) {
          issues.push({
            type: 'error',
            msg: `Trimester ${t}: RPL exceeds ${rplMaxPerTrimester()} credits per trimester.`,
          });
        }
        if (credits >= (DATA.mcCredits || 18)) {
          const id = plan.rplMc && plan.rplMc[i];
          if (!id) {
            issues.push({
              type: 'warn',
              msg: `Trimester ${t}: RPL ${credits} cr — select exempted micro-credential.`,
            });
          } else if (plan.mc.filter((m) => m === id).length > 0) {
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
        [...plan.mc.filter(Boolean), ...(plan.rplMc || []).filter(Boolean)]
          .map((id) => courseById(id)?.name)
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
          issues.push({ type: 'error', msg: `${riweName} must be scheduled in study Year 2.` });
        }
        const riweStarts = riweStartTrimesters(plan, intakeKey);
        if (!riweStarts.includes(plan.riweAt) || plan.riweAt !== riweStarts[0]) {
          issues.push({
            type: 'error',
            msg: `${riweName} must start in trimester ${riweStarts[0] || '—'} (study Year 2).`,
          });
        }
        if (!meetsRiwePrereq(plan, plan.riweAt)) {
          issues.push({
            type: 'error',
            msg: `${riweName} (from Tri ${plan.riweAt}): prerequisite not met (${DATA.prerequisites.wfeRiwe.description}).`,
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
      (!hasFeature('wfeCc') || plan.careerCatalystAt != null) &&
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
      rplCredits: new Array(DATA.maxTotalTrimesters).fill(0),
      rplMc: new Array(DATA.maxTotalTrimesters).fill(null),
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
    coursesForRemodule,
    suggestedExtensionTrimesters,
    allVisibleTrimestersOccupied,
    componentAvailability,
    isRiweCompleteBefore,
    lastRiweTrimester,
    riweCreditsPerTrimester,
    uniqueMcIds,
    formatTileLabel,
    formatCatalogRefLabel,
    EMPTY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
