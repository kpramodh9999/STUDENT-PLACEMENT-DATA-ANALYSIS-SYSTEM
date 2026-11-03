/**
 * Placement Cell Analytics Portal - Core Application JS
 * Tech Stack: HTML5, CSS3, JavaScript, Chart.js
 * Supports Hybrid In-Browser (Zero-Setup) and Python Flask API Modes
 */

// Configuration Constants
const GRADUATION_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
const DEPARTMENTS_DATA = {
  'Computer Science & Engineering': ['AIML', 'AIDS', 'DS', 'CS', 'IT'],
  'Electronics & Communication Engineering': ['Core ECE', 'VLSI', 'Embedded', 'Telecom'],
  'Electrical & Electronics Engineering': ['Power Systems', 'Control & Automation'],
  'Mechanical Engineering': ['Design & Robotics', 'Automobile'],
  'Civil Engineering': ['Structural', 'Environmental']
};

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  students: 'Student Management',
  placements: 'Placement Records',
  manage: 'Add & Edit Details',
  departments: 'Department Analytics',
  packages: 'Package Analytics',
  skills: 'Skill Insights',
  settings: 'Settings'
};

const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5000')) ? 'http://127.0.0.1:5000' : '';

let currentPage = 'dashboard';
let charts = {};
let isBackendOnline = false;

// ==========================================
// In-Browser / Local Storage Data Engine
// ==========================================
const LocalStore = {
  getStudents() {
    try {
      const raw = localStorage.getItem('placement_portal_students');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const def = (window.DEFAULT_DATA && window.DEFAULT_DATA.students) ? JSON.parse(JSON.stringify(window.DEFAULT_DATA.students)) : [];
    this.saveStudents(def);
    return def;
  },
  saveStudents(students) {
    try { localStorage.setItem('placement_portal_students', JSON.stringify(students)); } catch (e) {}
  },
  getPlacements() {
    try {
      const raw = localStorage.getItem('placement_portal_placements');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const def = (window.DEFAULT_DATA && window.DEFAULT_DATA.placements) ? JSON.parse(JSON.stringify(window.DEFAULT_DATA.placements)) : [];
    this.savePlacements(def);
    return def;
  },
  savePlacements(placements) {
    try { localStorage.setItem('placement_portal_placements', JSON.stringify(placements)); } catch (e) {}
  },
  getStudentById(id) {
    const students = this.getStudents();
    return students.find(s => String(s.student_id) === String(id)) || null;
  },
  getPlacementById(id) {
    const placements = this.getPlacements();
    return placements.find(p => String(p.placement_id) === String(id)) || null;
  },
  saveStudent(payload, id = null) {
    const students = this.getStudents();
    if (id) {
      const idx = students.findIndex(s => String(s.student_id) === String(id));
      if (idx !== -1) {
        students[idx] = { ...students[idx], ...payload, student_id: parseInt(id) };
        this.saveStudents(students);
        return students[idx];
      }
    }
    const newId = students.length > 0 ? Math.max(...students.map(s => s.student_id || 0)) + 1 : 1;
    const newStudent = {
      ...payload,
      student_id: newId,
      is_placed: false,
      placement_count: 0,
      skills: payload.skills || []
    };
    students.unshift(newStudent);
    this.saveStudents(students);
    return newStudent;
  },
  deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter(s => String(s.student_id) !== String(id));
    this.saveStudents(students);
    let placements = this.getPlacements();
    placements = placements.filter(p => String(p.student_id) !== String(id));
    this.savePlacements(placements);
  },
  savePlacement(payload, id = null) {
    const placements = this.getPlacements();
    const students = this.getStudents();
    const student = students.find(s => s.roll_no.toUpperCase() === payload.roll_no.toUpperCase());
    const student_id = student ? student.student_id : null;
    const student_name = student ? student.student_name : payload.student_name || 'Student';
    const department = student ? student.department : (payload.department || 'Computer Science & Engineering');
    const sub_branch = student ? student.sub_branch : (payload.sub_branch || '');

    if (id) {
      const idx = placements.findIndex(p => String(p.placement_id) === String(id));
      if (idx !== -1) {
        placements[idx] = {
          ...placements[idx],
          ...payload,
          student_id: student_id || placements[idx].student_id,
          student_name,
          department,
          sub_branch,
          placement_id: parseInt(id)
        };
        this.savePlacements(placements);
        this.syncStudentPlacementCounts();
        return placements[idx];
      }
    }
    const newId = placements.length > 0 ? Math.max(...placements.map(p => p.placement_id || 0)) + 1 : 1;
    const newPlacement = {
      ...payload,
      placement_id: newId,
      student_id,
      student_name,
      department,
      sub_branch,
      status: payload.status || 'Placed'
    };
    placements.unshift(newPlacement);
    this.savePlacements(placements);
    this.syncStudentPlacementCounts();
    return newPlacement;
  },
  deletePlacement(id) {
    let placements = this.getPlacements();
    placements = placements.filter(p => String(p.placement_id) !== String(id));
    this.savePlacements(placements);
    this.syncStudentPlacementCounts();
  },
  syncStudentPlacementCounts() {
    const students = this.getStudents();
    const placements = this.getPlacements();
    const counts = {};
    placements.forEach(p => {
      const sid = p.student_id;
      if (sid) counts[sid] = (counts[sid] || 0) + 1;
    });
    students.forEach(s => {
      const c = counts[s.student_id] || 0;
      s.placement_count = c;
      s.is_placed = c > 0;
    });
    this.saveStudents(students);
  },
  addSampleBatch(count = 35) {
    const sampleNames = [
      'Aarav Patel', 'Diya Nair', 'Rohan Gupta', 'Sneha Reddy', 'Aditya Joshi',
      'Ananya Iyer', 'Vikram Malhotra', 'Pooja Bhatia', 'Arjun Saxena', 'Kavya Pillai',
      'Siddharth Menon', 'Neha Kapoor', 'Varun Rao', 'Meera Kulkarni', 'Karan Verma',
      'Isha Sen', 'Gaurav Das', 'Tanvi Chawla', 'Naveen Choudhary', 'Shruti Mehra'
    ];
    const companies = [
      { name: 'Google', roles: ['Software Engineer', 'Systems Engineer'], minP: 18, maxP: 42 },
      { name: 'Microsoft', roles: ['Cloud Solutions Architect', 'Data Engineer'], minP: 16, maxP: 38 },
      { name: 'Amazon', roles: ['SDE-1', 'Frontend Developer'], minP: 14, maxP: 34 },
      { name: 'Adobe', roles: ['Product Developer', 'ML Engineer'], minP: 12, maxP: 28 },
      { name: 'TCS', roles: ['Digital Engineer', 'Systems Analyst'], minP: 4, maxP: 9 },
      { name: 'Infosys', roles: ['Specialist Programmer', 'Power Programmer'], minP: 5, maxP: 11 },
      { name: 'Wipro', roles: ['Project Engineer', 'Turbo Developer'], minP: 4, maxP: 8 }
    ];
    const skillsList = ['Python', 'Java', 'SQL', 'C++', 'React', 'Machine Learning', 'AWS', 'Docker', 'Data Structures'];

    const depts = Object.keys(DEPARTMENTS_DATA);
    let students = this.getStudents();
    let placements = this.getPlacements();
    let currentMaxId = students.length > 0 ? Math.max(...students.map(s => s.student_id || 0)) : 0;
    let currentPlacementId = placements.length > 0 ? Math.max(...placements.map(p => p.placement_id || 0)) : 0;

    const newStudents = [];
    const newPlacements = [];

    for (let i = 0; i < count; i++) {
      currentMaxId++;
      const dept = depts[Math.floor(Math.random() * depts.length)];
      const subs = DEPARTMENTS_DATA[dept] || ['General'];
      const sub = subs[Math.floor(Math.random() * subs.length)];
      const year = GRADUATION_YEARS[Math.floor(Math.random() * GRADUATION_YEARS.length)];
      const name = sampleNames[Math.floor(Math.random() * sampleNames.length)] + ` (${currentMaxId})`;
      const eligible = Math.random() > 0.15;
      const roll = `${year.toString().slice(2)}${dept.split(' ')[0].slice(0, 2).toUpperCase()}${String(currentMaxId).padStart(3, '0')}`;
      const randomSkills = [
        skillsList[Math.floor(Math.random() * skillsList.length)],
        skillsList[Math.floor(Math.random() * skillsList.length)]
      ];

      const s = {
        student_id: currentMaxId,
        roll_no: roll,
        student_name: name,
        department: dept,
        sub_branch: sub,
        graduation_year: year,
        eligible,
        is_placed: false,
        placement_count: 0,
        skills: [...new Set(randomSkills)]
      };

      if (eligible && Math.random() > 0.25) {
        currentPlacementId++;
        const comp = companies[Math.floor(Math.random() * companies.length)];
        const role = comp.roles[Math.floor(Math.random() * comp.roles.length)];
        const pkg = Number((Math.random() * (comp.maxP - comp.minP) + comp.minP).toFixed(2));
        const dt = `${year}-${String(Math.floor(Math.random() * 11) + 1).padStart(2, '0')}-15`;

        s.is_placed = true;
        s.placement_count = 1;

        newPlacements.push({
          placement_id: currentPlacementId,
          student_id: s.student_id,
          roll_no: s.roll_no,
          student_name: s.student_name,
          department: s.department,
          sub_branch: s.sub_branch,
          company: comp.name,
          role,
          package_lpa: pkg,
          placement_date: dt,
          status: 'Placed'
        });
      }
      newStudents.push(s);
    }

    students = [...newStudents, ...students];
    placements = [...newPlacements, ...placements];
    this.saveStudents(students);
    this.savePlacements(placements);
    return { students_added: newStudents.length, placements_added: newPlacements.length };
  },
  resetData() {
    const defStudents = (window.DEFAULT_DATA && window.DEFAULT_DATA.students) ? JSON.parse(JSON.stringify(window.DEFAULT_DATA.students)) : [];
    const defPlacements = (window.DEFAULT_DATA && window.DEFAULT_DATA.placements) ? JSON.parse(JSON.stringify(window.DEFAULT_DATA.placements)) : [];
    this.saveStudents(defStudents);
    this.savePlacements(defPlacements);
  },
  clearData() {
    this.saveStudents([]);
    this.savePlacements([]);
  }
};

// ==========================================
// Local Metric & Analytics Calculators
// ==========================================
function computeDashboardMetrics() {
  const students = LocalStore.getStudents();
  const placements = LocalStore.getPlacements();

  const total_students = students.length;
  const eligible_students = students.filter(s => s.eligible).length;
  const placedIds = new Set(placements.map(p => p.student_id).filter(Boolean));
  const unique_placed_students = students.filter(s => s.eligible && placedIds.has(s.student_id)).length;
  const placement_rate = eligible_students > 0 ? Number(((unique_placed_students / eligible_students) * 100).toFixed(1)) : 0;
  const pkgs = placements.map(p => Number(p.package_lpa || p.package)).filter(v => !isNaN(v) && v > 0);
  const avg_package = pkgs.length > 0 ? Number((pkgs.reduce((a, b) => a + b, 0) / pkgs.length).toFixed(2)) : 0;

  const deptMap = {};
  students.forEach(s => {
    if (!deptMap[s.department]) deptMap[s.department] = { total: 0, eligible: 0, placed: 0, packages: [] };
    deptMap[s.department].total++;
    if (s.eligible) {
      deptMap[s.department].eligible++;
      if (placedIds.has(s.student_id)) deptMap[s.department].placed++;
    }
  });
  placements.forEach(p => {
    const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
    const dept = s ? s.department : (p.department || 'Computer Science & Engineering');
    if (deptMap[dept] && p.package_lpa) deptMap[dept].packages.push(Number(p.package_lpa));
  });

  const department_overview = Object.keys(deptMap).map(d => {
    const m = deptMap[d];
    const rate = m.eligible > 0 ? Number(((m.placed / m.eligible) * 100).toFixed(1)) : 0;
    const avg = m.packages.length > 0 ? Number((m.packages.reduce((a, b) => a + b, 0) / m.packages.length).toFixed(2)) : 0;
    return { department: d, total_students: m.total, eligible_students: m.eligible, unique_placed: m.placed, placement_rate: rate, avg_package: avg };
  });

  const skillCount = {};
  students.forEach(s => {
    (s.skills || []).forEach(sk => {
      skillCount[sk] = (skillCount[sk] || 0) + 1;
    });
  });
  const top_skills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill_name, student_count]) => ({
      skill_name,
      student_count,
      percentage: total_students > 0 ? Math.round((student_count / total_students) * 100) : 0
    }));

  const recent_placements = placements.slice(0, 10).map(p => {
    const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
    return {
      roll_no: p.roll_no || (s ? s.roll_no : '--'),
      student_name: p.student_name || (s ? s.student_name : '--'),
      department: p.department || (s ? s.department : '--'),
      company: p.company,
      role: p.role,
      package_lpa: p.package_lpa || p.package,
      placement_date: p.placement_date,
      status: p.status
    };
  });

  return {
    total_students,
    eligible_students,
    unique_placed_students,
    total_offers: placements.length,
    placement_rate,
    avg_package,
    department_overview,
    top_skills,
    recent_placements
  };
}

function computeDepartmentAnalytics(deptFilter, subFilter, gradYearFilter, offerYearFilter) {
  const students = LocalStore.getStudents();
  const placements = LocalStore.getPlacements();

  let filteredStudents = [...students];
  let filteredPlacements = [...placements];

  if (gradYearFilter) filteredStudents = filteredStudents.filter(s => String(s.graduation_year) === String(gradYearFilter));
  if (offerYearFilter) filteredPlacements = filteredPlacements.filter(p => p.placement_date && String(p.placement_date).startsWith(String(offerYearFilter)));

  const isSubBranch = !!deptFilter;
  const groups = {};

  if (isSubBranch) {
    const subs = DEPARTMENTS_DATA[deptFilter] || ['General'];
    subs.forEach(sb => {
      groups[sb] = { total: 0, eligible: 0, placed: 0, offers: 0, packages: [] };
    });
    filteredStudents.filter(s => s.department === deptFilter).forEach(s => {
      const sb = s.sub_branch || 'General';
      if (!groups[sb]) groups[sb] = { total: 0, eligible: 0, placed: 0, offers: 0, packages: [] };
      groups[sb].total++;
      if (s.eligible) groups[sb].eligible++;
    });
  } else {
    Object.keys(DEPARTMENTS_DATA).forEach(d => {
      groups[d] = { total: 0, eligible: 0, placed: 0, offers: 0, packages: [] };
    });
    filteredStudents.forEach(s => {
      if (!groups[s.department]) groups[s.department] = { total: 0, eligible: 0, placed: 0, offers: 0, packages: [] };
      groups[s.department].total++;
      if (s.eligible) groups[s.department].eligible++;
    });
  }

  const placedSet = new Set();
  filteredPlacements.forEach(p => {
    const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
    if (!s) return;
    if (deptFilter && s.department !== deptFilter) return;
    const groupKey = isSubBranch ? (s.sub_branch || 'General') : s.department;
    if (groups[groupKey]) {
      groups[groupKey].offers++;
      if (p.package_lpa) groups[groupKey].packages.push(Number(p.package_lpa));
      if (!placedSet.has(s.student_id) && s.eligible) {
        placedSet.add(s.student_id);
        groups[groupKey].placed++;
      }
    }
  });

  const departments = Object.keys(groups).map(k => {
    const g = groups[k];
    const rate = g.eligible > 0 ? Number(((g.placed / g.eligible) * 100).toFixed(1)) : 0;
    const avg = g.packages.length > 0 ? Number((g.packages.reduce((a, b) => a + b, 0) / g.packages.length).toFixed(2)) : 0;
    const max = g.packages.length > 0 ? Math.max(...g.packages) : 0;
    return {
      department: k,
      total_students: g.total,
      eligible_students: g.eligible,
      unique_placed: g.placed,
      placement_rate: rate,
      total_offers: g.offers,
      avg_package_lpa: avg,
      max_package_lpa: max
    };
  });

  return { departments, is_sub_branch_view: isSubBranch };
}

function computePackageAnalytics(deptFilter, subFilter, gradYearFilter, offerYearFilter) {
  const students = LocalStore.getStudents();
  let list = LocalStore.getPlacements();

  if (deptFilter) {
    list = list.filter(p => {
      const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
      return (s && s.department === deptFilter) || p.department === deptFilter;
    });
  }
  if (subFilter) {
    list = list.filter(p => {
      const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
      return (s && s.sub_branch === subFilter) || p.sub_branch === subFilter;
    });
  }
  if (gradYearFilter) {
    list = list.filter(p => {
      const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
      return s && String(s.graduation_year) === String(gradYearFilter);
    });
  }
  if (offerYearFilter) {
    list = list.filter(p => p.placement_date && String(p.placement_date).startsWith(String(offerYearFilter)));
  }

  const pkgs = list.map(p => Number(p.package_lpa || p.package)).filter(v => !isNaN(v) && v > 0).sort((a, b) => a - b);
  const n = pkgs.length;

  if (n === 0) {
    return {
      overall_metrics: { avg_package: 0, median_package: 0, highest_package: 0, lowest_package: 0, total_offers_analyzed: 0 },
      distribution_histogram: { bin_labels: [], counts: [] },
      dept_comparison: [],
      range_distribution: []
    };
  }

  const sum = pkgs.reduce((a, b) => a + b, 0);
  const avg_package = Number((sum / n).toFixed(2));
  const median_package = Number((n % 2 === 0 ? (pkgs[n / 2 - 1] + pkgs[n / 2]) / 2 : pkgs[Math.floor(n / 2)]).toFixed(2));
  const highest_package = pkgs[n - 1];
  const lowest_package = pkgs[0];

  // Histogram bins (e.g. 3-6, 6-9, 9-12, 12-15, 15-18, 18-24, 24+ LPA)
  const bins = [
    { label: '3 – 6 LPA', min: 3, max: 6 },
    { label: '6 – 9 LPA', min: 6, max: 9 },
    { label: '9 – 12 LPA', min: 9, max: 12 },
    { label: '12 – 15 LPA', min: 12, max: 15 },
    { label: '15 – 18 LPA', min: 15, max: 18 },
    { label: '18 – 24 LPA', min: 18, max: 24 },
    { label: '24+ LPA', min: 24, max: 999 }
  ];
  const bin_labels = bins.map(b => b.label);
  const counts = bins.map(b => pkgs.filter(p => p >= b.min && (b.max === 999 ? true : p < b.max)).length);

  // Range distribution table (< 6 LPA, 6 – 10 LPA, 10 – 18 LPA, 18+ LPA)
  const tiers = [
    { label: '< 6 LPA (Tier 3)', min: 0, max: 6 },
    { label: '6 – 10 LPA (Tier 2)', min: 6, max: 10 },
    { label: '10 – 18 LPA (Tier 1)', min: 10, max: 18 },
    { label: '18+ LPA (Super Dream)', min: 18, max: 999 }
  ];
  const range_distribution = tiers.map(t => {
    const c = pkgs.filter(p => p >= t.min && (t.max === 999 ? true : p < t.max)).length;
    return {
      range_label: t.label,
      count: c,
      percentage: Number(((c / n) * 100).toFixed(1))
    };
  });

  // Department comparison
  const isSubBranch = !!deptFilter;
  const compGroups = {};
  if (isSubBranch) {
    const subs = DEPARTMENTS_DATA[deptFilter] || ['General'];
    subs.forEach(sb => { compGroups[sb] = []; });
  } else {
    Object.keys(DEPARTMENTS_DATA).forEach(d => { compGroups[d] = []; });
  }

  list.forEach(p => {
    const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
    if (!s) return;
    const key = isSubBranch ? (s.sub_branch || 'General') : s.department;
    if (compGroups[key] && p.package_lpa) {
      compGroups[key].push(Number(p.package_lpa));
    }
  });

  const dept_comparison = Object.keys(compGroups).map(k => {
    const arr = compGroups[k].sort((a, b) => a - b);
    const count = arr.length;
    const mean = count > 0 ? Number((arr.reduce((a, b) => a + b, 0) / count).toFixed(2)) : 0;
    const median = count > 0 ? Number((count % 2 === 0 ? (arr[count / 2 - 1] + arr[count / 2]) / 2 : arr[Math.floor(count / 2)]).toFixed(2)) : 0;
    const highest = count > 0 ? arr[count - 1] : 0;
    const shortLabel = k
      .replace('Computer Science & Engineering', 'CSE')
      .replace('Electronics & Communication Engineering', 'ECE')
      .replace('Electrical & Electronics Engineering', 'EEE')
      .replace('Mechanical Engineering', 'ME')
      .replace('Civil Engineering', 'CE');
    return {
      department: shortLabel,
      mean_package: mean,
      median_package: median,
      highest_package: highest
    };
  });

  return {
    overall_metrics: {
      avg_package,
      median_package,
      highest_package,
      lowest_package,
      total_offers_analyzed: n
    },
    distribution_histogram: {
      bin_labels,
      counts
    },
    dept_comparison,
    range_distribution
  };
}

function computeSkillInsights(gradYearFilter, deptFilter, subFilter) {
  let students = LocalStore.getStudents();
  let placements = LocalStore.getPlacements();

  if (gradYearFilter) students = students.filter(s => String(s.graduation_year) === String(gradYearFilter));
  if (deptFilter) students = students.filter(s => s.department === deptFilter);
  if (subFilter) students = students.filter(s => s.sub_branch === subFilter);

  const placedIds = new Set(placements.map(p => p.student_id).filter(Boolean));
  students.forEach(s => {
    if (placements.some(p => p.roll_no === s.roll_no)) {
      placedIds.add(s.student_id);
    }
  });

  const placedStudents = students.filter(s => placedIds.has(s.student_id));
  const unplacedStudents = students.filter(s => !placedIds.has(s.student_id));

  const totalStudents = students.length;
  const totalPlaced = placedStudents.length;
  const totalUnplaced = unplacedStudents.length;

  const skillStats = {};
  students.forEach(s => {
    const isPlaced = placedIds.has(s.student_id);
    (s.skills || []).forEach(sk => {
      if (!skillStats[sk]) {
        skillStats[sk] = { skill_name: sk, total: 0, placed: 0, unplaced: 0 };
      }
      skillStats[sk].total++;
      if (isPlaced) skillStats[sk].placed++;
      else skillStats[sk].unplaced++;
    });
  });

  const skillList = Object.values(skillStats).sort((a, b) => b.total - a.total);

  const most_common_skills = skillList.slice(0, 10).map(s => ({
    skill_name: s.skill_name,
    student_count: s.total,
    percentage: totalStudents > 0 ? Number(((s.total / totalStudents) * 100).toFixed(1)) : 0
  }));

  const placed_vs_unplaced = skillList.slice(0, 10).map(s => {
    const placed_pct = totalPlaced > 0 ? Number(((s.placed / totalPlaced) * 100).toFixed(1)) : 0;
    const unplaced_pct = totalUnplaced > 0 ? Number(((s.unplaced / totalUnplaced) * 100).toFixed(1)) : 0;
    return {
      skill_name: s.skill_name,
      total_students: s.total,
      placed_count: s.placed,
      placed_pct,
      unplaced_count: s.unplaced,
      unplaced_pct
    };
  });

  return {
    most_common_skills,
    placed_vs_unplaced
  };
}

// ==========================================
// Initialization & Backend Check
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupDropdowns();
  setupEventListeners();
  checkBackend();
  loadPageData('dashboard');
});

async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
    if (res.ok) {
      isBackendOnline = true;
    }
  } catch (e) {
    isBackendOnline = false;
  }
}

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

// ==========================================
// Navigation & Views
// ==========================================
function setupNavigation() {
  document.querySelectorAll('.sidebar .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      navigateToPage(page);
      closeMobileSidebar();
    });
  });

  document.querySelectorAll('.footer-nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      navigateToPage(page);
    });
  });

  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const closeBtn = document.getElementById('sidebarCloseBtn');
  const sidebar = document.getElementById('sidebar');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

function navigateToPage(page) {
  if (!PAGE_TITLES[page]) page = 'dashboard';
  currentPage = page;

  const headerTitle = document.getElementById('headerPageTitle');
  if (headerTitle) {
    headerTitle.textContent = PAGE_TITLES[page];
  }

  document.querySelectorAll('.sidebar .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });
  document.querySelectorAll('.footer-nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });

  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(`view-${page}`);
  if (targetView) targetView.classList.add('active');

  loadPageData(page);
}

function loadPageData(page) {
  switch (page) {
    case 'dashboard':
      fetchDashboardData();
      break;
    case 'students':
      fetchStudents();
      break;
    case 'placements':
      fetchPlacements();
      break;
    case 'manage':
      fetchManageData();
      break;
    case 'departments':
      fetchDepartmentAnalytics();
      break;
    case 'packages':
      fetchPackageAnalytics();
      break;
    case 'skills':
      fetchSkillInsights();
      break;
  }
}

// ==========================================
// Setup Filter Dropdowns
// ==========================================
function setupDropdowns() {
  const deptOptionsHtml = '<option value="">All Departments</option>' + 
    Object.keys(DEPARTMENTS_DATA).map(d => `<option value="${d}">${d}</option>`).join('');
  
  const yearOptionsHtml = '<option value="">All Batches (2018–2026)</option>' +
    GRADUATION_YEARS.map(y => `<option value="${y}">Batch ${y}</option>`).join('');

  const offerYearOptionsHtml = '<option value="">All Offer Years (2018–2026)</option>' +
    GRADUATION_YEARS.map(y => `<option value="${y}">Offer Year ${y}</option>`).join('');

  // Student Filters
  const sDept = document.getElementById('studentDeptFilter');
  const sYear = document.getElementById('studentGradYearFilter');
  if (sDept) sDept.innerHTML = deptOptionsHtml;
  if (sYear) sYear.innerHTML = yearOptionsHtml;

  // Placement Filters
  const pDept = document.getElementById('placementDeptFilter');
  const pYear = document.getElementById('placementYearFilter');
  if (pDept) pDept.innerHTML = deptOptionsHtml;
  if (pYear) pYear.innerHTML = offerYearOptionsHtml;

  // Department Analytics
  const daDept = document.getElementById('deptAnalyticsDeptSelect');
  const daGrad = document.getElementById('deptAnalyticsGradYearSelect');
  const daOffer = document.getElementById('deptAnalyticsOfferYearSelect');
  if (daDept) daDept.innerHTML = '<option value="">All Departments Overview</option>' + Object.keys(DEPARTMENTS_DATA).map(d => `<option value="${d}">${d}</option>`).join('');
  if (daGrad) daGrad.innerHTML = yearOptionsHtml;
  if (daOffer) daOffer.innerHTML = offerYearOptionsHtml;

  // Package Analytics
  const pkgDept = document.getElementById('pkgDeptFilter');
  const pkgGrad = document.getElementById('pkgGradYearFilter');
  const pkgOffer = document.getElementById('pkgOfferYearFilter');
  if (pkgDept) pkgDept.innerHTML = deptOptionsHtml;
  if (pkgGrad) pkgGrad.innerHTML = yearOptionsHtml;
  if (pkgOffer) pkgOffer.innerHTML = offerYearOptionsHtml;

  // Skills
  const skDept = document.getElementById('skillDeptFilter');
  const skGrad = document.getElementById('skillGradYearFilter');
  if (skDept) skDept.innerHTML = deptOptionsHtml;
  if (skGrad) skGrad.innerHTML = yearOptionsHtml;

  // Modal forms
  const modalDept = document.getElementById('studentFormDept');
  const modalGrad = document.getElementById('studentFormGradYear');
  if (modalDept) modalDept.innerHTML = Object.keys(DEPARTMENTS_DATA).map(d => `<option value="${d}">${d}</option>`).join('');
  if (modalGrad) modalGrad.innerHTML = GRADUATION_YEARS.map(y => `<option value="${y}">Batch ${y}</option>`).join('');

  // Manage Page Form dropdowns
  const mDept = document.getElementById('manageStudentDept');
  const mGrad = document.getElementById('manageStudentGradYear');
  if (mDept) mDept.innerHTML = Object.keys(DEPARTMENTS_DATA).map(d => `<option value="${d}">${d}</option>`).join('');
  if (mGrad) mGrad.innerHTML = GRADUATION_YEARS.map(y => `<option value="${y}">Batch ${y}</option>`).join('');

  // Setup sub-branch linkages
  linkSubBranchSelect('studentDeptFilter', 'studentSubBranchFilter');
  linkSubBranchSelect('placementDeptFilter', 'placementSubBranchFilter');
  linkSubBranchSelect('deptAnalyticsDeptSelect', 'deptAnalyticsSubBranchSelect');
  linkSubBranchSelect('pkgDeptFilter', 'pkgSubBranchFilter');
  linkSubBranchSelect('skillDeptFilter', 'skillSubBranchFilter');
  linkSubBranchSelect('studentFormDept', 'studentFormSubBranch');
  linkSubBranchSelect('manageStudentDept', 'manageStudentSubBranch');

  // Trigger initial sub-branch population for form defaults
  [
    ['studentFormDept', 'studentFormSubBranch'],
    ['manageStudentDept', 'manageStudentSubBranch']
  ].forEach(([dId, sbId]) => {
    const dEl = document.getElementById(dId);
    const sbEl = document.getElementById(sbId);
    if (dEl && sbEl) {
      const branches = DEPARTMENTS_DATA[dEl.value] || [];
      sbEl.disabled = branches.length === 0;
      sbEl.innerHTML = branches.map(sb => `<option value="${sb}">${sb}</option>`).join('');
    }
  });
}

function linkSubBranchSelect(deptSelectId, subBranchSelectId) {
  const deptSelect = document.getElementById(deptSelectId);
  const subSelect = document.getElementById(subBranchSelectId);
  if (!deptSelect || !subSelect) return;

  deptSelect.addEventListener('change', () => {
    const selectedDept = deptSelect.value;
    const subBranches = DEPARTMENTS_DATA[selectedDept] || [];

    if (subBranches.length > 0) {
      subSelect.disabled = false;
      subSelect.innerHTML = `<option value="">All Sub-Branches (${subBranches.length})</option>` +
        subBranches.map(sb => `<option value="${sb}">${sb}</option>`).join('');
    } else {
      subSelect.disabled = true;
      subSelect.innerHTML = '<option value="">All Sub-Branches</option>';
    }
  });
}

// ==========================================
// Setup Event Listeners
// ==========================================
function setupEventListeners() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.querySelector('svg').classList.add('spinning');
      loadPageData(currentPage);
      setTimeout(() => {
        refreshBtn.querySelector('svg').classList.remove('spinning');
        showToast('Data refreshed successfully');
      }, 350);
    });
  }

  const aboutBtn = document.getElementById('footerAboutBtn');
  const helpBtn = document.getElementById('footerHelpBtn');
  if (aboutBtn) aboutBtn.addEventListener('click', () => openModal('modalAbout'));
  if (helpBtn) helpBtn.addEventListener('click', () => openModal('modalHelp'));

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) modal.classList.remove('open');
    });
  });

  // Filter listeners
  ['studentSearchInput', 'studentDeptFilter', 'studentSubBranchFilter', 'studentGradYearFilter', 'studentEligibleFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => fetchStudents());
  });

  ['placementSearchInput', 'placementDeptFilter', 'placementSubBranchFilter', 'placementCompanyFilter', 'placementYearFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => fetchPlacements());
  });

  ['deptAnalyticsDeptSelect', 'deptAnalyticsSubBranchSelect', 'deptAnalyticsGradYearSelect', 'deptAnalyticsOfferYearSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => fetchDepartmentAnalytics());
  });

  ['pkgDeptFilter', 'pkgSubBranchFilter', 'pkgGradYearFilter', 'pkgOfferYearFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => fetchPackageAnalytics());
  });

  ['skillGradYearFilter', 'skillDeptFilter', 'skillSubBranchFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => fetchSkillInsights());
  });

  // Manage Tab Switcher
  document.querySelectorAll('.manage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      document.querySelectorAll('.manage-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.manage-tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pane = document.getElementById(`pane-${tabTarget}`);
      if (pane) pane.classList.add('active');
    });
  });

  // Manage Student Skill Chips
  document.querySelectorAll('#manageStudentSkillChips .skill-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const skill = chip.getAttribute('data-skill');
      const input = document.getElementById('manageStudentSkills');
      if (!input) return;
      const current = input.value ? input.value.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (!current.includes(skill)) {
        current.push(skill);
        input.value = current.join(', ');
      }
    });
  });

  // Modal Student Add Form
  const addStudentBtn = document.getElementById('openAddStudentBtn');
  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', () => {
      document.getElementById('studentFormId').value = '';
      document.getElementById('studentModalTitle').textContent = 'Add Student Record';
      document.getElementById('studentForm').reset();
      openModal('modalStudentForm');
    });
  }

  const studentForm = document.getElementById('studentForm');
  if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('studentFormId').value;
      const skillsStr = document.getElementById('studentFormSkills').value;
      const payload = {
        roll_no: document.getElementById('studentFormRoll').value.trim(),
        student_name: document.getElementById('studentFormName').value.trim(),
        department: document.getElementById('studentFormDept').value,
        sub_branch: document.getElementById('studentFormSubBranch').value,
        graduation_year: parseInt(document.getElementById('studentFormGradYear').value),
        eligible: document.getElementById('studentFormEligible').checked,
        skills: skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      try {
        if (isBackendOnline) {
          const url = id ? `${API_BASE}/api/students/${id}` : `${API_BASE}/api/students`;
          const method = id ? 'PUT' : 'POST';
          await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
      } catch (err) {}

      LocalStore.saveStudent(payload, id || null);
      showToast(id ? 'Student record updated!' : 'Student profile added!');
      closeModal('modalStudentForm');
      fetchStudents();
      fetchManageRecentStudents();
    });
  }

  // Modal Placement Add Form
  const addPlacementBtn = document.getElementById('openAddPlacementBtn');
  if (addPlacementBtn) {
    addPlacementBtn.addEventListener('click', () => {
      document.getElementById('placementFormId').value = '';
      document.getElementById('placementModalTitle').textContent = 'Add Placement Offer';
      document.getElementById('placementForm').reset();
      document.getElementById('placementFormDate').value = new Date().toISOString().split('T')[0];
      openModal('modalPlacementForm');
    });
  }

  const placementForm = document.getElementById('placementForm');
  if (placementForm) {
    placementForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('placementFormId').value;
      const payload = {
        roll_no: document.getElementById('placementFormRoll').value.trim(),
        company: document.getElementById('placementFormCompany').value.trim(),
        role: document.getElementById('placementFormRole').value.trim(),
        package_lpa: parseFloat(document.getElementById('placementFormPackage').value),
        placement_date: document.getElementById('placementFormDate').value,
        status: document.getElementById('placementFormStatus').value
      };

      try {
        if (isBackendOnline) {
          const url = id ? `${API_BASE}/api/placements/${id}` : `${API_BASE}/api/placements`;
          const method = id ? 'PUT' : 'POST';
          await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
      } catch (err) {}

      LocalStore.savePlacement(payload, id || null);
      showToast(id ? 'Placement offer updated!' : 'Placement offer added!');
      closeModal('modalPlacementForm');
      fetchPlacements();
      fetchManageRecentPlacements();
    });
  }

  // Manage Page: Student Form Handling
  const manageStudentForm = document.getElementById('manageStudentForm');
  const btnManageResetStudent = document.getElementById('btnManageResetStudent');
  const btnManageNewStudent = document.getElementById('btnManageNewStudent');

  const resetManageStudentForm = () => {
    document.getElementById('manageStudentId').value = '';
    document.getElementById('manageStudentFormTitle').textContent = 'Add New Student';
    manageStudentForm?.reset();
    const mDept = document.getElementById('manageStudentDept');
    const mSub = document.getElementById('manageStudentSubBranch');
    if (mDept && mSub) {
      const branches = DEPARTMENTS_DATA[mDept.value] || [];
      mSub.innerHTML = branches.map(sb => `<option value="${sb}">${sb}</option>`).join('');
    }
  };

  if (btnManageResetStudent) btnManageResetStudent.addEventListener('click', resetManageStudentForm);
  if (btnManageNewStudent) btnManageNewStudent.addEventListener('click', resetManageStudentForm);

  if (manageStudentForm) {
    manageStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('manageStudentId').value;
      const skillsStr = document.getElementById('manageStudentSkills').value;
      const payload = {
        roll_no: document.getElementById('manageStudentRoll').value.trim(),
        student_name: document.getElementById('manageStudentName').value.trim(),
        department: document.getElementById('manageStudentDept').value,
        sub_branch: document.getElementById('manageStudentSubBranch').value,
        graduation_year: parseInt(document.getElementById('manageStudentGradYear').value),
        eligible: document.getElementById('manageStudentEligible').checked,
        skills: skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      try {
        if (isBackendOnline) {
          const url = id ? `${API_BASE}/api/students/${id}` : `${API_BASE}/api/students`;
          const method = id ? 'PUT' : 'POST';
          await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
      } catch (err) {}

      LocalStore.saveStudent(payload, id || null);
      showToast(id ? 'Student record updated successfully!' : 'Student profile added successfully!');
      resetManageStudentForm();
      fetchManageRecentStudents();
      fetchStudents();
    });
  }

  // Manage Page: Placement Form Handling
  const managePlacementForm = document.getElementById('managePlacementForm');
  const btnManageResetPlacement = document.getElementById('btnManageResetPlacement');
  const btnManageNewPlacement = document.getElementById('btnManageNewPlacement');

  const resetManagePlacementForm = () => {
    document.getElementById('managePlacementId').value = '';
    document.getElementById('managePlacementFormTitle').textContent = 'Add New Placement Offer';
    managePlacementForm?.reset();
    const dateInput = document.getElementById('managePlacementDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  };

  if (btnManageResetPlacement) btnManageResetPlacement.addEventListener('click', resetManagePlacementForm);
  if (btnManageNewPlacement) btnManageNewPlacement.addEventListener('click', resetManagePlacementForm);

  if (managePlacementForm) {
    managePlacementForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('managePlacementId').value;
      const payload = {
        roll_no: document.getElementById('managePlacementRoll').value.trim(),
        company: document.getElementById('managePlacementCompany').value.trim(),
        role: document.getElementById('managePlacementRole').value.trim(),
        package_lpa: parseFloat(document.getElementById('managePlacementPackage').value),
        placement_date: document.getElementById('managePlacementDate').value,
        status: document.getElementById('managePlacementStatus').value
      };

      try {
        if (isBackendOnline) {
          const url = id ? `${API_BASE}/api/placements/${id}` : `${API_BASE}/api/placements`;
          const method = id ? 'PUT' : 'POST';
          await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
      } catch (err) {}

      LocalStore.savePlacement(payload, id || null);
      showToast(id ? 'Placement offer updated successfully!' : 'Placement offer added successfully!');
      resetManagePlacementForm();
      fetchManageRecentPlacements();
      fetchPlacements();
    });
  }

  // Admin Sample Data Handlers
  const handleAddSampleBatch = async (btn) => {
    try {
      if (btn) {
        btn.disabled = true;
        btn.dataset.origHtml = btn.innerHTML;
        btn.innerHTML = `<span>Adding Records...</span>`;
      }
      try {
        if (isBackendOnline) {
          await fetch(`${API_BASE}/api/admin/add-sample`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 35 })
          });
        }
      } catch (e) {}

      const res = LocalStore.addSampleBatch(35);
      showToast(`Added ${res.students_added} students & ${res.placements_added} offers! Dynamic charts updated.`);
      loadPageData(currentPage);
    } catch (err) {
      alert('Error adding sample data: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
      }
    }
  };

  const quickAddBtn = document.getElementById('quickAddSampleBtn');
  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', () => handleAddSampleBatch(quickAddBtn));
  }

  const btnAddSampleBatch = document.getElementById('btnAddSampleBatch');
  if (btnAddSampleBatch) {
    btnAddSampleBatch.addEventListener('click', () => handleAddSampleBatch(btnAddSampleBatch));
  }

  const btnSeedSampleData = document.getElementById('btnSeedSampleData');
  if (btnSeedSampleData) {
    btnSeedSampleData.addEventListener('click', async () => {
      if (!confirm('This will repopulate the portal with the rich dataset (300+ students, 280+ offers across 2018-2026). Proceed?')) return;
      try {
        btnSeedSampleData.disabled = true;
        btnSeedSampleData.innerHTML = `<span>Seeding Data...</span>`;
        try {
          if (isBackendOnline) await fetch(`${API_BASE}/api/admin/seed`, { method: 'POST' });
        } catch (e) {}
        LocalStore.resetData();
        showToast('Sample dataset restored successfully!');
        loadPageData(currentPage);
      } catch (err) {
        alert('Seeding error: ' + err.message);
      } finally {
        btnSeedSampleData.disabled = false;
        btnSeedSampleData.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          <span>Re-seed Sample Data</span>
        `;
      }
    });
  }

  const btnClearData = document.getElementById('btnClearData');
  if (btnClearData) {
    btnClearData.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear student and placement records from the portal?')) return;
      try {
        btnClearData.disabled = true;
        btnClearData.innerHTML = `<span>Clearing...</span>`;
        try {
          if (isBackendOnline) await fetch(`${API_BASE}/api/admin/clear`, { method: 'POST' });
        } catch (e) {}
        LocalStore.clearData();
        showToast('All records cleared successfully.');
        loadPageData(currentPage);
      } catch (err) {
        alert('Clear error: ' + err.message);
      } finally {
        btnClearData.disabled = false;
        btnClearData.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Clear All Records</span>
        `;
      }
    });
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// ==========================================
// 1. Dashboard View
// ==========================================
async function fetchDashboardData() {
  let data = null;
  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/dashboard`);
      if (res.ok) data = await res.json();
    } catch (e) {}
  }
  if (!data) {
    data = computeDashboardMetrics();
  }

  // 5 Metric Cards
  document.getElementById('dashTotalStudents').textContent = data.total_students || 0;
  document.getElementById('dashEligibleStudents').textContent = data.eligible_students || 0;
  const eligiblePct = data.total_students > 0 ? Math.round((data.eligible_students / data.total_students) * 100) : 0;
  document.getElementById('dashEligiblePct').textContent = `${eligiblePct}% of total cohort`;
  document.getElementById('dashUniquePlaced').textContent = data.unique_placed_students || 0;
  document.getElementById('dashTotalOffers').textContent = `${data.total_offers || 0} total offers issued`;
  document.getElementById('dashPlacementRate').textContent = data.placement_rate ?? 0;
  document.getElementById('dashAvgPackage').textContent = data.avg_package ? Number(data.avg_package).toFixed(2) : '0.00';

  renderDashboardDeptChart(data.department_overview || []);
  renderDashboardSkillsList(data.top_skills || []);
  renderDashboardRecentPlacements(data.recent_placements || []);
}

function renderDashboardDeptChart(depts) {
  const ctx = document.getElementById('chartDashboardDepts');
  if (!ctx) return;

  if (charts.dashDepts) charts.dashDepts.destroy();

  const labels = depts.map(d => {
    return d.department
      .replace('Computer Science & Engineering', 'CSE')
      .replace('Electronics & Communication Engineering', 'ECE')
      .replace('Electrical & Electronics Engineering', 'EEE')
      .replace('Mechanical Engineering', 'ME')
      .replace('Civil Engineering', 'CE');
  });

  charts.dashDepts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Placement Rate (%)',
        data: depts.map(d => d.placement_rate),
        backgroundColor: '#2563EB',
        borderRadius: 4,
        barThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%` } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderDashboardSkillsList(skills) {
  const container = document.getElementById('dashboardSkillsList');
  if (!container) return;

  if (skills.length === 0) {
    container.innerHTML = '<span style="color:#94a3b8; font-size:12px;">No skills recorded.</span>';
    return;
  }

  container.innerHTML = skills.map(sk => `
    <div>
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
        <span style="font-weight:600; color:#1e293b;">${sk.skill_name}</span>
        <span style="color:#64748b;">${sk.student_count} students (${sk.percentage}%)</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill emerald" style="width: ${Math.min(100, sk.percentage)}%;"></div>
      </div>
    </div>
  `).join('');
}

function renderDashboardRecentPlacements(placements) {
  const tbody = document.getElementById('dashRecentPlacementsBody');
  if (!tbody) return;

  if (placements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:20px;">No recent placements found.</td></tr>';
    return;
  }

  tbody.innerHTML = placements.map(p => `
    <tr>
      <td style="font-family:monospace; color:#2563eb; font-weight:600;">${p.roll_no}</td>
      <td style="font-weight:600; color:#0f172a;">${p.student_name}</td>
      <td>${p.department}</td>
      <td style="font-weight:600; color:#0f172a;">${p.company}</td>
      <td>${p.role}</td>
      <td style="font-weight:700; color:#0f172a;">${Number(p.package_lpa).toFixed(2)} LPA</td>
      <td style="color:#64748b;">${p.placement_date || '--'}</td>
      <td><span class="badge-status placed">${p.status}</span></td>
    </tr>
  `).join('');
}

// ==========================================
// 2. Student Management View
// ==========================================
async function fetchStudents() {
  const search = (document.getElementById('studentSearchInput')?.value || '').toLowerCase();
  const dept = document.getElementById('studentDeptFilter')?.value || '';
  const sub = document.getElementById('studentSubBranchFilter')?.value || '';
  const grad = document.getElementById('studentGradYearFilter')?.value || '';
  const eligible = document.getElementById('studentEligibleFilter')?.value || '';

  let list = LocalStore.getStudents();
  if (search) {
    list = list.filter(s => (s.roll_no && s.roll_no.toLowerCase().includes(search)) || (s.student_name && s.student_name.toLowerCase().includes(search)));
  }
  if (dept) list = list.filter(s => s.department === dept);
  if (sub) list = list.filter(s => s.sub_branch === sub);
  if (grad) list = list.filter(s => String(s.graduation_year) === String(grad));
  if (eligible) list = list.filter(s => String(s.eligible) === String(eligible === 'true'));

  renderStudentsTable(list);
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">No students found matching current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = students.slice(0, 100).map(s => `
    <tr>
      <td style="font-family:monospace; color:#2563eb; font-weight:600;">${s.roll_no}</td>
      <td style="font-weight:600; color:#0f172a;">${s.student_name}</td>
      <td>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>${s.department}</span>
          ${s.sub_branch ? `<span class="badge-status subbranch">${s.sub_branch}</span>` : ''}
        </div>
      </td>
      <td style="color:#64748b;">${s.graduation_year}</td>
      <td>
        <div style="display:flex; gap:4px; flex-wrap:wrap; max-width:240px;">
          ${(s.skills || []).slice(0, 3).map(sk => `<span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:10px; color:#475569;">${sk}</span>`).join('')}
          ${(s.skills || []).length > 3 ? `<span style="font-size:10px; color:#94a3b8;">+${s.skills.length - 3}</span>` : ''}
        </div>
      </td>
      <td>
        ${s.eligible
          ? '<span style="color:#059669; font-weight:600;">&bull; Eligible</span>'
          : '<span style="color:#94a3b8;">Ineligible</span>'}
      </td>
      <td>
        ${s.is_placed
          ? `<span class="badge-status placed">Placed (${s.placement_count || 1})</span>`
          : '<span style="color:#94a3b8; font-size:11px;">Not Placed</span>'}
      </td>
      <td style="text-align:right;">
        <div class="action-btns">
          <button class="btn-action-icon" title="Edit Student" onclick="editStudent(${s.student_id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-action-icon delete" title="Delete Student" onclick="deleteStudent(${s.student_id}, '${s.roll_no}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function editStudent(id, targetView = null) {
  let s = LocalStore.getStudentById(id);
  if (!s && isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/api/students/${id}`);
      if (res.ok) {
        const data = await res.json();
        s = data.student || data;
      }
    } catch (e) {}
  }
  if (!s) {
    alert('Student record not found');
    return;
  }

  // 1. Populate Modal Form
  const modalId = document.getElementById('studentFormId');
  if (modalId) modalId.value = s.student_id;
  const modalTitle = document.getElementById('studentModalTitle');
  if (modalTitle) modalTitle.textContent = `Edit Student: ${s.roll_no} (${s.student_name})`;
  const modalRoll = document.getElementById('studentFormRoll');
  if (modalRoll) modalRoll.value = s.roll_no || '';
  const modalName = document.getElementById('studentFormName');
  if (modalName) modalName.value = s.student_name || '';
  const modalDept = document.getElementById('studentFormDept');
  if (modalDept) modalDept.value = s.department || '';

  const subSelect = document.getElementById('studentFormSubBranch');
  const subBranches = DEPARTMENTS_DATA[s.department] || [];
  if (subSelect) {
    subSelect.disabled = subBranches.length === 0;
    subSelect.innerHTML = subBranches.map(sb => `<option value="${sb}">${sb}</option>`).join('');
    subSelect.value = s.sub_branch || '';
  }

  const modalGrad = document.getElementById('studentFormGradYear');
  if (modalGrad) modalGrad.value = s.graduation_year;
  const modalEligible = document.getElementById('studentFormEligible');
  if (modalEligible) modalEligible.checked = !!s.eligible;
  const modalSkills = document.getElementById('studentFormSkills');
  if (modalSkills) modalSkills.value = (s.skills || []).join(', ');

  // 2. Populate Manage Page Form
  const mId = document.getElementById('manageStudentId');
  if (mId) {
    mId.value = s.student_id;
    const mTitle = document.getElementById('manageStudentFormTitle');
    if (mTitle) mTitle.textContent = `Edit Student: ${s.roll_no} (${s.student_name})`;
    const mRoll = document.getElementById('manageStudentRoll');
    if (mRoll) mRoll.value = s.roll_no || '';
    const mName = document.getElementById('manageStudentName');
    if (mName) mName.value = s.student_name || '';
    const mDept = document.getElementById('manageStudentDept');
    if (mDept) mDept.value = s.department || '';
    const mSub = document.getElementById('manageStudentSubBranch');
    if (mSub) {
      mSub.disabled = subBranches.length === 0;
      mSub.innerHTML = subBranches.map(sb => `<option value="${sb}">${sb}</option>`).join('');
      mSub.value = s.sub_branch || '';
    }
    const mGrad = document.getElementById('manageStudentGradYear');
    if (mGrad) mGrad.value = s.graduation_year;
    const mEligible = document.getElementById('manageStudentEligible');
    if (mEligible) mEligible.checked = !!s.eligible;
    const mSkills = document.getElementById('manageStudentSkills');
    if (mSkills) mSkills.value = (s.skills || []).join(', ');
  }

  if (targetView === 'manage') {
    navigateToPage('manage');
    const tabBtn = document.querySelector('.manage-tab-btn[data-tab="manage-students"]');
    if (tabBtn) tabBtn.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    openModal('modalStudentForm');
  }
}

async function deleteStudent(id, rollNo) {
  if (!confirm(`Are you sure you want to delete student record ${rollNo}? All associated placements will also be removed.`)) return;
  try {
    if (isBackendOnline) {
      await fetch(`${API_BASE}/api/students/${id}`, { method: 'DELETE' });
    }
  } catch (e) {}

  LocalStore.deleteStudent(id);
  showToast(`Student ${rollNo} removed.`);
  fetchStudents();
  fetchManageRecentStudents();
}

// ==========================================
// 3. Placement Records View
// ==========================================
async function fetchPlacements() {
  const search = (document.getElementById('placementSearchInput')?.value || '').toLowerCase();
  const dept = document.getElementById('placementDeptFilter')?.value || '';
  const sub = document.getElementById('placementSubBranchFilter')?.value || '';
  const company = document.getElementById('placementCompanyFilter')?.value || '';
  const year = document.getElementById('placementYearFilter')?.value || '';

  const students = LocalStore.getStudents();
  let list = LocalStore.getPlacements();

  if (search) {
    list = list.filter(p => 
      (p.roll_no && p.roll_no.toLowerCase().includes(search)) ||
      (p.student_name && p.student_name.toLowerCase().includes(search)) ||
      (p.company && p.company.toLowerCase().includes(search)) ||
      (p.role && p.role.toLowerCase().includes(search))
    );
  }
  if (dept) {
    list = list.filter(p => {
      const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
      return (s && s.department === dept) || p.department === dept;
    });
  }
  if (sub) {
    list = list.filter(p => {
      const s = students.find(st => st.student_id === p.student_id || st.roll_no === p.roll_no);
      return (s && s.sub_branch === sub) || p.sub_branch === sub;
    });
  }
  if (company) list = list.filter(p => p.company === company);
  if (year) list = list.filter(p => p.placement_date && String(p.placement_date).startsWith(String(year)));

  renderPlacementsTable(list);
}

function renderPlacementsTable(placements) {
  const tbody = document.getElementById('placementsTableBody');
  if (!tbody) return;

  if (placements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:24px;">No placement offers found.</td></tr>';
    return;
  }

  tbody.innerHTML = placements.slice(0, 100).map(p => `
    <tr>
      <td style="color:#94a3b8; font-family:monospace; font-size:11px;">#${p.placement_id}</td>
      <td style="font-family:monospace; color:#2563eb; font-weight:600;">${p.roll_no}</td>
      <td style="font-weight:600; color:#0f172a;">${p.student_name || '--'}</td>
      <td>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>${p.department}</span>
          ${p.sub_branch ? `<span class="badge-status subbranch">${p.sub_branch}</span>` : ''}
        </div>
      </td>
      <td style="font-weight:600; color:#0f172a;">${p.company}</td>
      <td>${p.role}</td>
      <td style="font-weight:700; color:#0f172a;">${Number(p.package_lpa).toFixed(2)} LPA</td>
      <td style="color:#64748b;">${p.placement_date || '--'}</td>
      <td><span class="badge-status placed">${p.status}</span></td>
      <td style="text-align:right;">
        <div class="action-btns">
          <button class="btn-action-icon" title="Edit Placement Offer" onclick="editPlacement(${p.placement_id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-action-icon delete" title="Delete Offer" onclick="deletePlacement(${p.placement_id}, '${p.company}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function editPlacement(id, targetView = null) {
  let p = LocalStore.getPlacementById(id);
  if (!p && isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/api/placements/${id}`);
      if (res.ok) {
        const data = await res.json();
        p = data.placement || data;
      }
    } catch (e) {}
  }
  if (!p) {
    alert('Placement offer not found');
    return;
  }

  // 1. Populate Modal Form
  const modalId = document.getElementById('placementFormId');
  if (modalId) modalId.value = p.placement_id;
  const modalTitle = document.getElementById('placementModalTitle');
  if (modalTitle) modalTitle.textContent = `Edit Offer: ${p.company} (#${p.placement_id})`;
  const modalRoll = document.getElementById('placementFormRoll');
  if (modalRoll) modalRoll.value = p.roll_no || '';
  const modalCompany = document.getElementById('placementFormCompany');
  if (modalCompany) modalCompany.value = p.company || '';
  const modalRole = document.getElementById('placementFormRole');
  if (modalRole) modalRole.value = p.role || '';
  const modalPkg = document.getElementById('placementFormPackage');
  if (modalPkg) modalPkg.value = p.package_lpa ?? '';
  const modalDate = document.getElementById('placementFormDate');
  if (modalDate) modalDate.value = p.placement_date ? p.placement_date.split('T')[0] : '';
  const modalStatus = document.getElementById('placementFormStatus');
  if (modalStatus) modalStatus.value = p.status || 'Placed';

  // 2. Populate Manage Page Form
  const mId = document.getElementById('managePlacementId');
  if (mId) {
    mId.value = p.placement_id;
    const mTitle = document.getElementById('managePlacementFormTitle');
    if (mTitle) mTitle.textContent = `Edit Offer: ${p.company} (#${p.placement_id})`;
    const mRoll = document.getElementById('managePlacementRoll');
    if (mRoll) mRoll.value = p.roll_no || '';
    const mComp = document.getElementById('managePlacementCompany');
    if (mComp) mComp.value = p.company || '';
    const mRole = document.getElementById('managePlacementRole');
    if (mRole) mRole.value = p.role || '';
    const mPkg = document.getElementById('managePlacementPackage');
    if (mPkg) mPkg.value = p.package_lpa ?? '';
    const mDate = document.getElementById('managePlacementDate');
    if (mDate) mDate.value = p.placement_date ? p.placement_date.split('T')[0] : '';
    const mStatus = document.getElementById('managePlacementStatus');
    if (mStatus) mStatus.value = p.status || 'Placed';
  }

  if (targetView === 'manage') {
    navigateToPage('manage');
    const tabBtn = document.querySelector('.manage-tab-btn[data-tab="manage-placements"]');
    if (tabBtn) tabBtn.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    openModal('modalPlacementForm');
  }
}

async function deletePlacement(id, company) {
  if (!confirm(`Are you sure you want to delete the placement offer from ${company}?`)) return;
  try {
    if (isBackendOnline) {
      await fetch(`${API_BASE}/api/placements/${id}`, { method: 'DELETE' });
    }
  } catch (e) {}

  LocalStore.deletePlacement(id);
  showToast('Placement offer removed.');
  fetchPlacements();
  fetchManageRecentPlacements();
}

// ==========================================
// Manage Page Helpers
// ==========================================
async function fetchManageData() {
  fetchManageRecentStudents();
  fetchManageRecentPlacements();
}

function fetchManageRecentStudents() {
  const students = LocalStore.getStudents().slice(0, 8);
  renderManageRecentStudents(students);
}

function renderManageRecentStudents(students) {
  const tbody = document.getElementById('manageRecentStudentsBody');
  if (!tbody) return;
  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:18px;">No students recorded yet.</td></tr>';
    return;
  }
  tbody.innerHTML = students.map(s => `
    <tr>
      <td style="font-family:monospace; color:#2563eb; font-weight:600;">${s.roll_no}</td>
      <td style="font-weight:600; color:#0f172a;">${s.student_name}</td>
      <td>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>${s.department}</span>
          ${s.sub_branch ? `<span class="badge-status subbranch">${s.sub_branch}</span>` : ''}
        </div>
      </td>
      <td style="color:#64748b;">${s.graduation_year}</td>
      <td>${s.eligible ? '<span style="color:#059669; font-weight:600;">&bull; Eligible</span>' : '<span style="color:#94a3b8;">Ineligible</span>'}</td>
      <td style="text-align:right;">
        <div class="action-btns">
          <button class="btn-action-icon" title="Edit on this form" onclick="editStudent(${s.student_id}, 'manage')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-action-icon delete" title="Delete Student" onclick="deleteStudent(${s.student_id}, '${s.roll_no}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function fetchManageRecentPlacements() {
  const placements = LocalStore.getPlacements().slice(0, 8);
  renderManageRecentPlacements(placements);
}

function renderManageRecentPlacements(placements) {
  const tbody = document.getElementById('manageRecentPlacementsBody');
  if (!tbody) return;
  if (placements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:18px;">No placement offers recorded yet.</td></tr>';
    return;
  }
  tbody.innerHTML = placements.map(p => `
    <tr>
      <td style="color:#94a3b8; font-family:monospace; font-size:11px;">#${p.placement_id}</td>
      <td style="font-family:monospace; color:#2563eb; font-weight:600;">${p.roll_no}</td>
      <td style="font-weight:600; color:#0f172a;">${p.student_name || '--'}</td>
      <td style="font-weight:600; color:#0f172a;">${p.company}</td>
      <td>${p.role}</td>
      <td style="font-weight:700; color:#0f172a;">${Number(p.package_lpa).toFixed(2)} LPA</td>
      <td><span class="badge-status placed">${p.status}</span></td>
      <td style="text-align:right;">
        <div class="action-btns">
          <button class="btn-action-icon" title="Edit on this form" onclick="editPlacement(${p.placement_id}, 'manage')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-action-icon delete" title="Delete Offer" onclick="deletePlacement(${p.placement_id}, '${p.company}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// 4. Department Analytics View
// ==========================================
async function fetchDepartmentAnalytics() {
  const dept = document.getElementById('deptAnalyticsDeptSelect')?.value || '';
  const sub = document.getElementById('deptAnalyticsSubBranchSelect')?.value || '';
  const grad = document.getElementById('deptAnalyticsGradYearSelect')?.value || '';
  const offer = document.getElementById('deptAnalyticsOfferYearSelect')?.value || '';

  let data = null;
  if (isBackendOnline) {
    try {
      const params = new URLSearchParams();
      if (dept) params.append('department', dept);
      if (sub) params.append('sub_branch', sub);
      if (grad) params.append('graduation_year', grad);
      if (offer) params.append('placement_year', offer);
      const res = await fetch(`${API_BASE}/api/analytics/department?${params.toString()}`);
      if (res.ok) data = await res.json();
    } catch (e) {}
  }
  if (!data) {
    data = computeDepartmentAnalytics(dept, sub, grad, offer);
  }
  renderDepartmentAnalytics(data);
}

function renderDepartmentAnalytics(data) {
  const depts = data.departments || [];
  const isSubBranch = Boolean(data.is_sub_branch_view);

  document.getElementById('deptChartRateTitle').textContent = isSubBranch ? 'Sub-Branch Placement Rates' : 'Placement Rates by Department';
  document.getElementById('deptChartCompareTitle').textContent = isSubBranch ? 'Eligible vs Placed by Specialization' : 'Eligible vs Placed Students';

  const ctxRate = document.getElementById('chartDeptRate');
  if (ctxRate) {
    if (charts.deptRate) charts.deptRate.destroy();
    charts.deptRate = new Chart(ctxRate, {
      type: 'bar',
      data: {
        labels: depts.map(d => d.department),
        datasets: [{
          label: 'Placement Rate (%)',
          data: depts.map(d => d.placement_rate),
          backgroundColor: '#2563EB',
          borderRadius: 4,
          barThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%` } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  const ctxCompare = document.getElementById('chartDeptCompare');
  if (ctxCompare) {
    if (charts.deptCompare) charts.deptCompare.destroy();
    charts.deptCompare = new Chart(ctxCompare, {
      type: 'bar',
      data: {
        labels: depts.map(d => d.department),
        datasets: [
          {
            label: 'Eligible Students',
            data: depts.map(d => d.eligible_students),
            backgroundColor: '#94A3B8',
            borderRadius: 4,
            barThickness: 16
          },
          {
            label: 'Placed Students',
            data: depts.map(d => d.unique_placed),
            backgroundColor: '#10B981',
            borderRadius: 4,
            barThickness: 16
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true },
          x: { grid: { display: false } }
        }
      }
    });
  }

  const tbody = document.getElementById('deptAnalyticsTableBody');
  if (tbody) {
    if (depts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">No department records found.</td></tr>';
      return;
    }
    tbody.innerHTML = depts.map(d => `
      <tr>
        <td style="font-weight:700; color:#0f172a;">${d.department}</td>
        <td style="text-align:center;">${d.total_students}</td>
        <td style="text-align:center;">${d.eligible_students}</td>
        <td style="text-align:center; font-weight:600; color:#059669;">${d.unique_placed}</td>
        <td style="text-align:center;"><span class="badge-status placed">${d.placement_rate}%</span></td>
        <td style="text-align:center;">${d.total_offers}</td>
        <td style="text-align:right; font-weight:600;">${d.avg_package_lpa ? Number(d.avg_package_lpa).toFixed(2) + ' LPA' : '—'}</td>
        <td style="text-align:right; font-weight:700; color:#2563eb;">${d.max_package_lpa ? Number(d.max_package_lpa).toFixed(2) + ' LPA' : '—'}</td>
      </tr>
    `).join('');
  }
}

// ==========================================
// 5. Package Analytics View
// ==========================================
async function fetchPackageAnalytics() {
  const dept = document.getElementById('pkgDeptFilter')?.value || '';
  const sub = document.getElementById('pkgSubBranchFilter')?.value || '';
  const grad = document.getElementById('pkgGradYearFilter')?.value || '';
  const offer = document.getElementById('pkgOfferYearFilter')?.value || '';

  let data = null;
  if (isBackendOnline) {
    try {
      const params = new URLSearchParams();
      if (dept) params.append('department', dept);
      if (sub) params.append('sub_branch', sub);
      if (grad) params.append('graduation_year', grad);
      if (offer) params.append('placement_year', offer);
      const res = await fetch(`${API_BASE}/api/analytics/package?${params.toString()}`);
      if (res.ok) data = await res.json();
    } catch (e) {}
  }
  if (!data) {
    data = computePackageAnalytics(dept, sub, grad, offer);
  }
  renderPackageAnalytics(data);
}

function renderPackageAnalytics(data) {
  const metrics = data.overall_metrics || {};
  const elAvg = document.getElementById('pkgAvgValue');
  if (elAvg) elAvg.textContent = metrics.avg_package ? Number(metrics.avg_package).toFixed(2) : '--';
  const elMed = document.getElementById('pkgMedianValue');
  if (elMed) elMed.textContent = metrics.median_package ? Number(metrics.median_package).toFixed(2) : '--';
  const elHigh = document.getElementById('pkgHighestValue');
  if (elHigh) elHigh.textContent = metrics.highest_package ? Number(metrics.highest_package).toFixed(2) : '--';
  const elLow = document.getElementById('pkgLowestValue');
  if (elLow) elLow.textContent = metrics.lowest_package ? Number(metrics.lowest_package).toFixed(2) : '--';

  // 1. Chart: Histogram (Salary Package Distribution)
  const ctxHist = document.getElementById('chartPkgHistogram');
  if (ctxHist) {
    if (charts.pkgHistogram) charts.pkgHistogram.destroy();
    const histData = data.distribution_histogram || {};
    const labels = histData.bin_labels || [];
    const counts = histData.counts || [];

    charts.pkgHistogram = new Chart(ctxHist, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Offers Issued',
          data: counts,
          backgroundColor: '#10B981',
          borderRadius: 4,
          barThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} offers in bracket`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 2. Chart: Department Package Comparison
  const ctxComp = document.getElementById('chartPkgDeptCompare');
  if (ctxComp) {
    if (charts.pkgDeptCompare) charts.pkgDeptCompare.destroy();
    const deptData = data.dept_comparison || [];
    const labels = deptData.map(d => d.department);
    const meanPkgs = deptData.map(d => d.mean_package);
    const medianPkgs = deptData.map(d => d.median_package);

    charts.pkgDeptCompare = new Chart(ctxComp, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Mean Package (LPA)',
            data: meanPkgs,
            backgroundColor: '#2563EB',
            borderRadius: 4,
            barThickness: 16
          },
          {
            label: 'Median Package (LPA)',
            data: medianPkgs,
            backgroundColor: '#F59E0B',
            borderRadius: 4,
            barThickness: 16
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} LPA`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => `${v} LPA` } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 3. Table: Salary Range Frequency Table
  const tbody = document.getElementById('pkgRangeTableBody');
  if (tbody) {
    const ranges = data.range_distribution || [];
    if (ranges.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:20px;">No salary distribution records.</td></tr>';
      return;
    }
    tbody.innerHTML = ranges.map(r => `
      <tr>
        <td style="font-weight:600; color:#0f172a;">${r.range_label}</td>
        <td style="text-align:center; font-weight:700; color:#2563eb;">${r.count}</td>
        <td style="text-align:center;">
          <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>${r.percentage}%</span>
            <div style="width:70px; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
              <div style="width:${Math.min(100, r.percentage)}%; height:100%; background:#10b981;"></div>
            </div>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

// ==========================================
// 6. Skill Insights View
// ==========================================
async function fetchSkillInsights() {
  const grad = document.getElementById('skillGradYearFilter')?.value || '';
  const dept = document.getElementById('skillDeptFilter')?.value || '';
  const sub = document.getElementById('skillSubBranchFilter')?.value || '';

  let data = null;
  if (isBackendOnline) {
    try {
      const params = new URLSearchParams();
      if (grad) params.append('graduation_year', grad);
      if (dept) params.append('department', dept);
      if (sub) params.append('sub_branch', sub);
      const res = await fetch(`${API_BASE}/api/analytics/skills?${params.toString()}`);
      if (res.ok) data = await res.json();
    } catch (e) {}
  }
  if (!data) {
    data = computeSkillInsights(grad, dept, sub);
  }
  renderSkillInsights(data);
}

function renderSkillInsights(data) {
  // 1. Chart: Most In-Demand Recorded Skills (Horizontal Bar)
  const ctxFreq = document.getElementById('chartSkillsFrequency');
  if (ctxFreq) {
    if (charts.skillsFrequency) charts.skillsFrequency.destroy();
    const skills = data.most_common_skills || [];
    charts.skillsFrequency = new Chart(ctxFreq, {
      type: 'bar',
      data: {
        labels: skills.map(s => s.skill_name),
        datasets: [{
          label: 'Student Profiles',
          data: skills.map(s => s.student_count),
          backgroundColor: '#38BDF8',
          borderRadius: 4,
          barThickness: 18
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.x} students (${skills[ctx.dataIndex]?.percentage || 0}%)`
            }
          }
        },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // 2. Chart: Skill Incidence: Placed vs Unplaced Cohort
  const ctxComp = document.getElementById('chartSkillsCompare');
  if (ctxComp) {
    if (charts.skillsCompare) charts.skillsCompare.destroy();
    const compareData = data.placed_vs_unplaced || [];
    charts.skillsCompare = new Chart(ctxComp, {
      type: 'bar',
      data: {
        labels: compareData.map(s => s.skill_name),
        datasets: [
          {
            label: 'Placed Students %',
            data: compareData.map(s => s.placed_pct),
            backgroundColor: '#10B981',
            borderRadius: 4,
            barThickness: 14
          },
          {
            label: 'Unplaced Students %',
            data: compareData.map(s => s.unplaced_pct),
            backgroundColor: '#94A3B8',
            borderRadius: 4,
            barThickness: 14
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%` } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 3. Table: Recorded Skills Breakdown by Cohort
  const tbody = document.getElementById('skillsTableBody');
  if (tbody) {
    const list = data.placed_vs_unplaced || [];
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">No skill records available.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(s => `
      <tr>
        <td style="font-weight:700; color:#0f172a;">${s.skill_name}</td>
        <td style="text-align:center;">${s.total_students}</td>
        <td style="text-align:center; font-weight:600; color:#059669;">${s.placed_count}</td>
        <td style="text-align:center;"><span class="badge-status placed">${s.placed_pct}%</span></td>
        <td style="text-align:center; color:#64748b;">${s.unplaced_count}</td>
        <td style="text-align:center; color:#94a3b8;">${s.unplaced_pct}%</td>
      </tr>
    `).join('');
  }
}