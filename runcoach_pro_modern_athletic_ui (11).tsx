import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Calendar,
  Flame,
  Trophy,
  ChevronRight,
  ChevronDown,
  Camera,
  Copy,
  Trash2,
  Edit3,
  Sparkles,
  BarChart2,
  Award,
  X,
  Layers,
  Heart,
  Compass,
  Key,
  Users,
  Settings,
  Send,
  Printer,
  Check,
  Clock,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Flag,
  Zap,
  RefreshCw
} from 'lucide-react';

// ==========================================
// VDOT & RUNNING PHYSIOLOGY ENGINE
// ==========================================
function calculateVDOT(timeInMinutes, distanceInMeters = 5000) {
  if (!timeInMinutes || timeInMinutes <= 0) return 30;
  const velocity = distanceInMeters / timeInMinutes; // m/min
  const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
  const percentMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeInMinutes) +
    0.2989558 * Math.exp(-0.1932605 * timeInMinutes);
  const vdot = vo2 / percentMax;
  return Math.max(15, Math.min(85, parseFloat(vdot.toFixed(1))));
}

function formatPace(secondsPerKm) {
  if (!secondsPerKm || isNaN(secondsPerKm) || secondsPerKm <= 0) return '0:00';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function parsePaceToSeconds(paceStr) {
  if (!paceStr) return 360;
  const parts = paceStr.replace('/km', '').trim().split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return 360;
}

function calculatePaceZones(fiveKTimeMinutes) {
  const fiveKPaceSec = (fiveKTimeMinutes * 60) / 5;
  const easyLowSec = Math.round(fiveKPaceSec * 1.25);
  const easyHighSec = Math.round(fiveKPaceSec * 1.38);
  const thresholdLowSec = Math.round(fiveKPaceSec * 1.08);
  const thresholdHighSec = Math.round(fiveKPaceSec * 1.15);
  const marathonLowSec = Math.round(fiveKPaceSec * 1.16);
  const marathonHighSec = Math.round(fiveKPaceSec * 1.23);
  const intervalLowSec = Math.round(fiveKPaceSec * 0.95);
  const intervalHighSec = Math.round(fiveKPaceSec * 1.00);

  return {
    easy: `${formatPace(easyLowSec)} - ${formatPace(easyHighSec)}`,
    threshold: `${formatPace(thresholdLowSec)} - ${formatPace(thresholdHighSec)}`,
    marathon: `${formatPace(marathonLowSec)} - ${formatPace(marathonHighSec)}`,
    interval: `${formatPace(intervalLowSec)} - ${formatPace(intervalHighSec)}`,
    easyAvgSec: (easyLowSec + easyHighSec) / 2,
    thresholdAvgSec: (thresholdLowSec + thresholdHighSec) / 2,
    marathonAvgSec: (marathonLowSec + marathonHighSec) / 2
  };
}

function getFitnessLevel(vdot) {
  if (vdot < 32) return { label: 'Khởi động (Novice)', color: 'text-sky-600 bg-sky-50 border-sky-200' };
  if (vdot < 42) return { label: 'Phong Trào Vững Vàng (Club)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
  if (vdot < 52) return { label: 'Nâng Cao (Intermediate)', color: 'text-amber-700 bg-amber-50 border-amber-300' };
  if (vdot < 62) return { label: 'Bán Chuyên (Advanced)', color: 'text-orange-700 bg-orange-50 border-orange-300' };
  return { label: 'Đỉnh Cao (Elite)', color: 'text-rose-700 bg-rose-50 border-rose-300' };
}

const ALL_WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

function getDayOfWeekFromDate(dateStr) {
  if (!dateStr) return 'Chủ Nhật';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayIndex = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
  if (dayIndex === 0) return 'Chủ Nhật';
  return `Thứ ${dayIndex + 1}`;
}

function getDistanceKm(distanceStr, customDistance) {
  if (distanceStr.includes('5K')) return 5.0;
  if (distanceStr.includes('10K')) return 10.0;
  if (distanceStr.includes('Half Marathon')) return 21.0975;
  if (distanceStr.includes('Full Marathon')) return 42.195;
  if (customDistance && parseFloat(customDistance)) return parseFloat(customDistance);
  return 21.0975;
}

function generateDefaultTrainingPlan(
  distanceStr,
  targetTimeStr,
  raceDateStr,
  vdot,
  availableDays = ['Thứ 3', 'Thứ 5', 'Thứ 7', 'Chủ Nhật'],
  targetRacePace = '5:41',
  paceZonesObj = null
) {
  const weeksCount = 12;
  const weeks = [];
  const phases = [
    'Nền Tảng Cơ Sở (Base)',
    'Phát Triển Ngưỡng (Build)',
    'Đỉnh Cao Thể Lực (Peak)',
    'Giảm Tải & Taper (Taper & Race)'
  ];
  const activeDaysList = availableDays.length > 0 ? availableDays : ['Thứ 4', 'Chủ Nhật'];
  const runsCount = activeDaysList.length;
  const targetKm = getDistanceKm(distanceStr, '');
  const raceDayOfWeek = getDayOfWeekFromDate(raceDateStr);

  const easyPaceDisplay = paceZonesObj?.easy || '7:40 - 8:30';
  const thresholdPaceDisplay = paceZonesObj?.threshold || '6:25 - 6:45';

  for (let w = 1; w <= weeksCount; w++) {
    const phaseIndex = Math.min(3, Math.floor((w - 1) / 3));
    const isRaceWeek = w === 12;
    const isTaper = w >= 10;

    // Scale mileage based on number of runs and target race distance
    const distScale = targetKm >= 40 ? 1.4 : targetKm >= 20 ? 1.0 : targetKm >= 10 ? 0.75 : 0.55;
    const baseScale = runsCount === 1 ? 0.35 : runsCount === 2 ? 0.6 : runsCount === 3 ? 0.8 : runsCount === 4 ? 1.0 : 1.18;

    let weeklyMileage = Math.round((isRaceWeek ? 18 : isTaper ? 26 : (26 + (w - 1) * 2.6)) * baseScale * distScale);
    weeklyMileage = Math.max(12, weeklyMileage);

    const tempoKm = Math.max(3, Math.round(weeklyMileage * 0.28));
    const easyKm = Math.max(3, Math.round(weeklyMileage * 0.24));
    const stridesKm = Math.max(3, Math.round(weeklyMileage * 0.2));
    const longKm = Math.max(
      Math.round(targetKm * 0.35),
      Math.min(Math.round(targetKm * 0.85), Math.round(weeklyMileage * 0.45))
    );
    const intervalReps = phaseIndex === 0 ? 3 : phaseIndex === 1 ? 4 : phaseIndex === 2 ? 5 : 3;

    // Workouts synchronized with VDOT Pace Zones
    const createQualityWorkout = () => ({
      title: isRaceWeek ? 'Khởi Động Làm Nóng Giải (Pre-Race Sharpener)' : 'Chạy Biến Tốc (Threshold / Tempo)',
      distance: isRaceWeek ? '3.5 km' : `${tempoKm} km`,
      pace: isRaceWeek ? `${targetRacePace} /km` : `${thresholdPaceDisplay} /km`,
      desc: isRaceWeek
        ? `• Khởi động nhẹ nhàng - 1.5 km - Pace ${easyPaceDisplay} /km - 1 lần\n• Kích hoạt guồng chân Race Pace - 0.5 km - Pace ${targetRacePace} /km - 2 lần\n• Thả lỏng giãn cơ nhẹ - 1.0 km - Thư giãn - 1 lần`
        : `• Khởi động làm nóng cơ (Warm-up) - 1.5 km - Pace ${easyPaceDisplay} /km - 1 lần\n• Chạy tốc độ ngưỡng (Threshold Interval) - 1.0 km - Pace ${thresholdPaceDisplay} /km - ${intervalReps} lần (nghỉ 90s giữa hiệp)\n• Chạy xả cơ & Hạ nhiệt (Cool-down) - 1.0 km - Pace ${easyPaceDisplay} /km - 1 lần`,
      type: 'Tempo',
      completed: false
    });

    const createLongWorkout = () => ({
      title: isRaceWeek ? 'Chạy Thả Lỏng Taper Nhẹ' : 'Chạy Dài Cuối Tuần (Long Run)',
      distance: isRaceWeek ? '4.0 km' : `${longKm} km`,
      pace: `${easyPaceDisplay} /km`,
      desc: isRaceWeek
        ? `• Khởi động khớp - 0.5 km - Nhẹ nhàng - 1 lần\n• Chạy thả lỏng dưỡng sức trước giải - 3.0 km - Pace ${easyPaceDisplay} /km - 1 lần\n• Giãn cơ và đi ngủ sớm - 0.5 km - Thả lỏng - 1 lần`
        : `• Khởi động bắt nhịp nhẹ nhàng - 1.0 km - Pace ${easyPaceDisplay} /km - 1 lần\n• Chạy dài hiếu khí đường trường - ${Math.max(4, longKm - 2)} km - Pace ${easyPaceDisplay} /km - 1 lần (Uống nước mỗi 2.5km, nạp 1 Gel ở phút 45)\n• Đi bộ xả cơ & Giãn cơ chân - 1.0 km - Thả lỏng - 1 lần`,
      type: 'LongRun',
      completed: false
    });

    const createEasyWorkout = () => ({
      title: 'Chạy Phục Hồi Nhẹ (Easy Run)',
      distance: `${easyKm} km`,
      pace: `${easyPaceDisplay} /km`,
      desc: `• Khởi động khớp & Ép dẻo động - 0.5 km - Đi bộ / Jog nhẹ - 1 lần\n• Chạy phục hồi nhịp tim Zone 2 - ${Math.max(2.5, easyKm - 1)} km - Pace ${easyPaceDisplay} /km - 1 lần (nhịp thở 3:3)\n• Đi bộ hạ nhiệt & Thả lỏng - 0.5 km - Thư giãn - 1 lần`,
      type: 'Easy',
      completed: false
    });

    const createStridesWorkout = () => ({
      title: 'Chạy Thả Lỏng & Strides Tốc Độ',
      distance: `${stridesKm} km`,
      pace: `${easyPaceDisplay} /km`,
      desc: `• Chạy thả lỏng hiếu khí - ${Math.max(2.5, stridesKm - 1)} km - Pace ${easyPaceDisplay} /km - 1 lần\n• Bứt tốc sải chân kỹ thuật (Strides) - 0.1 km (100m) - Tăng tốc nhịp nhàng - 4 lần (nghỉ đi bộ 60s)\n• Đi bộ hạ nhiệt cơ bắp - 0.5 km - Thả lỏng - 1 lần`,
      type: 'Easy',
      completed: false
    });

    // Special Official Race Day Workout
    const createRaceDayWorkout = () => ({
      title: `🏁 RACE DAY: GIẢI CHẠY CHÍNH THỨC (${distanceStr})`,
      distance: `${targetKm.toFixed(1)} km`,
      pace: `${targetRacePace} /km (Target)`,
      desc: `• Khởi động làm nóng & Ép dẻo động tại vạch xuất phát - 1.0 km - Nhẹ nhàng - 1 lần (15 phút trước giờ G)\n• THI ĐẤU CHÍNH THỨC: Chạy đúng chiến thuật đã chọn ở Bước 4 - ${targetKm.toFixed(1)} km - Target Pace ${targetRacePace} /km - 1 lần\n• CÁN ĐÍCH FINISHER & Nhận Huy Chương: Đi bộ thả lỏng, uống điện giải & giãn cơ toàn thân - 0.5 km - Tự hào - 1 lần`,
      type: 'RaceDay',
      completed: false
    });

    // Assign days of week
    let activeDayIndex = 0;
    const days = ALL_WEEK_DAYS.map(dayName => {
      // Check if this specific day is the OFFICIAL RACE DAY in Week 12
      if (isRaceWeek && dayName === raceDayOfWeek) {
        return {
          day: dayName,
          ...createRaceDayWorkout()
        };
      }

      const isSelectedDay = activeDaysList.includes(dayName);

      if (!isSelectedDay) {
        return {
          day: dayName,
          title: 'Nghỉ Ngơi Tích Cực / Giãn Cơ',
          distance: '0 km',
          pace: '--',
          desc: '• Nghỉ ngơi tích cực tái tạo cơ bắp - 0.0 km - Thư giãn - 1 lần\n• Lăn ống Foam Roll & Giãn cơ dải chậu chày - 0.0 km - Nhẹ nhàng - 1 lần (15 phút)',
          type: 'Rest',
          completed: false
        };
      }

      // Assign workouts based on availability and race week status
      let workout;
      if (runsCount === 1) {
        workout = createLongWorkout();
      } else if (runsCount === 2) {
        workout = activeDayIndex === 0 ? createQualityWorkout() : createLongWorkout();
      } else if (runsCount === 3) {
        if (activeDayIndex === 0) workout = createEasyWorkout();
        else if (activeDayIndex === 1) workout = createQualityWorkout();
        else workout = createLongWorkout();
      } else if (runsCount === 4) {
        if (activeDayIndex === 0) workout = createEasyWorkout();
        else if (activeDayIndex === 1) workout = createQualityWorkout();
        else if (activeDayIndex === 2) workout = createStridesWorkout();
        else workout = createLongWorkout();
      } else {
        const roles = [createEasyWorkout, createQualityWorkout, createEasyWorkout, createStridesWorkout, createLongWorkout];
        workout = roles[activeDayIndex % roles.length]();
      }

      activeDayIndex++;
      return {
        day: dayName,
        ...workout
      };
    });

    // Recalculate true weekly Km from the days
    const totalWeekKm = days.reduce((sum, d) => sum + (parseFloat(d.distance) || 0), 0);

    weeks.push({
      weekNumber: w,
      phase: isRaceWeek ? '🏁 TUẦN THI ĐẤU CHÍNH THỨC (RACE WEEK)' : phases[phaseIndex],
      weeklyKm: Math.round(totalWeekKm),
      focus: isRaceWeek
        ? `Tập trung ngày thi đấu: ${raceDateStr} (${raceDayOfWeek}). Giữ sức & bung sức đúng lúc!`
        : runsCount <= 2
          ? 'Tập trung 80/20: Ngưỡng tốc độ & Sức bền Long Run'
          : isTaper
            ? 'Giữ tốc độ, giảm khối lượng (Taper)'
            : 'Gia tăng sức bền hiếu khí & ngưỡng đào thải acid lactic',
      days
    });
  }

  return {
    targetDistance: distanceStr || 'Half Marathon (21.1 km)',
    targetTime: targetTimeStr || '02:00',
    raceDate: raceDateStr || '2026-11-29',
    calculatedVDOT: vdot || 36.6,
    totalWeeks: weeksCount,
    availableDays: activeDaysList,
    targetRacePace: targetRacePace || '5:41',
    generatedBy: runsCount <= 2 ? 'Thuật toán VDOT 80/20 & Đồng Bộ Race Day' : 'Thuật toán Jack Daniels VDOT & Race Day',
    weeks
  };
}

export default function App() {
  // Navigation & Step State
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('home');

  // AI Engine State & Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('runcoach_gemini_api_key') || '');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiEngineStatus, setAiEngineStatus] = useState({
    modelName: 'gemini-3-flash',
    isLive: true,
    lastChecked: 'Sẵn sàng'
  });

  // Modals
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Athlete Profiles
  const [athleteId, setAthleteId] = useState('PACER-DEMO');
  const [athleteName, setAthleteName] = useState('Văn Đồng Viên Pacer');
  const [savedAthletes, setSavedAthletes] = useState(() => {
    const local = localStorage.getItem('runcoach_all_athletes');
    return local ? JSON.parse(local) : [
      { id: 'PACER-DEMO', name: 'Văn Đồng Viên Pacer' },
      { id: 'HOANG-SUB2', name: 'Hoàng Runner' }
    ];
  });
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [newAthleteNameInput, setNewAthleteNameInput] = useState('');
  const [newAthleteIdInput, setNewAthleteIdInput] = useState('');
  const [copyNotification, setCopyNotification] = useState(false);

  // Physical Profile (Step 1)
  const [gender, setGender] = useState('Nam (Male)');
  const [age, setAge] = useState(27);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [fiveKHours, setFiveKHours] = useState(0);
  const [fiveKMinutes, setFiveKMinutes] = useState(26);
  const [runningExperience, setRunningExperience] = useState('2 năm');

  // SPECIFIC AVAILABLE DAYS (User Availability Selector)
  const [availableDays, setAvailableDays] = useState(['Thứ 3', 'Thứ 5', 'Thứ 7', 'Chủ Nhật']);
  const runsPerWeek = useMemo(() => availableDays.length, [availableDays]);
  const [weeklyMileage, setWeeklyMileage] = useState(28);
  const [injuryNotes, setInjuryNotes] = useState('Không có chấn thương, muốn tập trung tránh quá tải gân Achilles');

  // Goals & Race (Step 2)
  const [selectedDistance, setSelectedDistance] = useState('Half Marathon (21.1 km)');
  const [customDistance, setCustomDistance] = useState('');
  const [targetHours, setTargetHours] = useState(2);
  const [targetMinutes, setTargetMinutes] = useState(0);
  const [raceDate, setRaceDate] = useState('2026-11-29');

  // Training Plan & Multi-plan (Step 3)
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationSource, setGenerationSource] = useState('Thuật toán VDOT & Race Day');

  // Step 4 Race Tactics
  const [selectedRaceTactic, setSelectedRaceTactic] = useState('negative');

  // Workout Check-in Modal
  const [checkInModal, setCheckInModal] = useState({
    isOpen: false,
    weekIndex: 0,
    dayIndex: 0,
    dayData: null,
    actualKm: '',
    actualPace: '',
    heartRate: '',
    rpe: 5,
    notes: '',
    imageUrl: '',
    isScanningImage: false
  });

  // Coach AI Interactive Chat
  const [coachChatOpen, setCoachChatOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState([
    {
      sender: 'coach',
      text: 'Chào bạn! Mình là AI Coach của RunCoach (Gemini 3 Flash). Hãy hỏi mình bất kỳ thắc mắc nào về bài chạy, chiến lược Race Day hay dinh dưỡng nhé!'
    }
  ]);
  const [coachInput, setCoachInput] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);

  // Hovered Week in Bar Chart
  const [hoveredWeekIdx, setHoveredWeekIdx] = useState(null);

  // Toggle Day Selection Handler
  const handleToggleDay = (dayName) => {
    setAvailableDays(prev => {
      if (prev.includes(dayName)) {
        if (prev.length <= 1) return prev;
        return prev.filter(d => d !== dayName);
      } else {
        return [...prev, dayName];
      }
    });
  };

  const handleSelectDaysPreset = (preset) => {
    if (preset === 2) setAvailableDays(['Thứ 4', 'Chủ Nhật']);
    else if (preset === 3) setAvailableDays(['Thứ 3', 'Thứ 6', 'Chủ Nhật']);
    else if (preset === 4) setAvailableDays(['Thứ 3', 'Thứ 5', 'Thứ 7', 'Chủ Nhật']);
    else if (preset === 5) setAvailableDays(['Thứ 2', 'Thứ 3', 'Thứ 5', 'Thứ 6', 'Chủ Nhật']);
  };

  const total5KMinutes = useMemo(() => {
    return fiveKHours * 60 + fiveKMinutes;
  }, [fiveKHours, fiveKMinutes]);

  const currentVDOT = useMemo(() => {
    return calculateVDOT(total5KMinutes, 5000);
  }, [total5KMinutes]);

  const paceZones = useMemo(() => {
    return calculatePaceZones(total5KMinutes);
  }, [total5KMinutes]);

  const fitnessLevel = useMemo(() => {
    return getFitnessLevel(currentVDOT);
  }, [currentVDOT]);

  const calculated5KPace = useMemo(() => {
    const sec = (total5KMinutes * 60) / 5;
    return formatPace(sec);
  }, [total5KMinutes]);

  const calculatedSpeedKmh = useMemo(() => {
    if (total5KMinutes <= 0) return '0.0';
    return (5 / (total5KMinutes / 60)).toFixed(1);
  }, [total5KMinutes]);

  const targetKmNumber = useMemo(() => {
    return getDistanceKm(selectedDistance, customDistance);
  }, [selectedDistance, customDistance]);

  const targetRacePace = useMemo(() => {
    const totalTargetSec = (targetHours * 60 + targetMinutes) * 60;
    const paceSec = totalTargetSec / targetKmNumber;
    return formatPace(paceSec);
  }, [targetHours, targetMinutes, targetKmNumber]);

  const targetRacePaceSec = useMemo(() => {
    return parsePaceToSeconds(targetRacePace);
  }, [targetRacePace]);

  // RACE COUNTDOWN & DAY OF WEEK
  const raceDateDetails = useMemo(() => {
    if (!raceDate) {
      return {
        formattedDate: 'Chưa chọn ngày',
        dayOfWeek: 'Chủ Nhật',
        totalWeeks: 0,
        totalDays: 0,
        isPast: false
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = raceDate.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isPast = diffDays < 0;

    const totalDays = Math.max(0, diffDays);
    const totalWeeks = Math.max(1, Math.round(totalDays / 7));

    const dayOfWeekNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dName = dayOfWeekNames[target.getDay()] || 'Chủ Nhật';
    const dayOfWeekShort = target.getDay() === 0 ? 'Chủ Nhật' : `Thứ ${target.getDay() + 1}`;
    const formattedDate = `${dName}, ngày ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;

    return {
      formattedDate,
      dayOfWeek: dayOfWeekShort,
      totalWeeks,
      totalDays,
      isPast
    };
  }, [raceDate]);

  // DYNAMIC RACE SPLITS CALCULATION (Synchronized with Step 2, 4)
  const dynamicRaceSplits = useMemo(() => {
    const dist = targetKmNumber;
    let s1End, s2End;

    if (dist <= 6) {
      s1End = 1.5;
      s2End = 4.0;
    } else if (dist <= 12) {
      s1End = 2.5;
      s2End = 8.0;
    } else if (dist <= 25) {
      s1End = 5.0;
      s2End = 16.0;
    } else {
      s1End = 10.0;
      s2End = 32.0;
    }

    // Pacing calculations based on selected tactic
    let pace1Sec, pace2Sec, pace3Sec;
    if (selectedRaceTactic === 'negative') {
      pace1Sec = targetRacePaceSec + 7; // Slow start to save glycogen
      pace2Sec = targetRacePaceSec;
      pace3Sec = targetRacePaceSec - 7; // Strong finish
    } else if (selectedRaceTactic === 'even') {
      pace1Sec = targetRacePaceSec;
      pace2Sec = targetRacePaceSec;
      pace3Sec = targetRacePaceSec;
    } else {
      // Conservative
      pace1Sec = targetRacePaceSec + 12;
      pace2Sec = targetRacePaceSec + 4;
      pace3Sec = targetRacePaceSec - 4;
    }

    // Nutrition & hydration logic based on distance
    const getNutritionPlan = (stage) => {
      if (dist <= 6) {
        if (stage === 1) return 'Uống 1 ngụm nước nhỏ tại vạch xuất phát.';
        if (stage === 2) return 'Uống 1 ngụm nước nhỏ ở trạm km 2.5 (nếu trời nóng).';
        return 'Không cần nạp gel. Tập trung rút đích!';
      }
      if (dist <= 12) {
        if (stage === 1) return 'Uống nước nhẹ ở trạm km 2.5 - 3.';
        if (stage === 2) return 'Nạp 1 gói Gel ở km 5 kèm ngụm nước lọc.';
        return 'Duy trì bù nước điện giải trạm km 8.';
      }
      if (dist <= 25) {
        if (stage === 1) return 'Uống nước nhỏ giọt mỗi 2.5km. Tránh uống quá no.';
        if (stage === 2) return 'Nạp Gel 1 ở km 7 - 8. Nạp Gel 2 ở km 14 + điện giải.';
        return 'Nạp Gel 3 (loại có Caffeine) ở km 18, tưới nước mát lên gáy.';
      }
      // Marathon 42K+
      if (stage === 1) return 'Uống nước đều mỗi 2.5km. Nạp Gel 1 ở km 8 + 1 viên muối.';
      if (stage === 2) return 'Nạp Gel 2 (km 16), Gel 3 (km 24), Gel 4 (km 32) + muối mỗi 10km.';
      return 'Nạp Gel 5 (km 37), dội nước hạ nhiệt cơ thể, giữ vững ý chí.';
    };

    return [
      {
        stageName: `Km 0 - ${s1End.toFixed(1)}`,
        paceDesc: `${formatPace(pace1Sec)} /km`,
        status: selectedRaceTactic === 'negative'
          ? 'Chậm hơn 7s so với Target (Bắt nhịp, kiểm soát tim Zone 2/3, tránh bị cuốn)'
          : selectedRaceTactic === 'even'
            ? 'Pace đều chuẩn máy đếm nhịp'
            : 'Xuất phát rất an toàn để cơ bắp làm nóng tối ưu',
        nutrition: getNutritionPlan(1)
      },
      {
        stageName: `Km ${s1End.toFixed(1)} - ${s2End.toFixed(1)}`,
        paceDesc: `${formatPace(pace2Sec)} /km`,
        status: 'Pace nhịp điệu (Cruising Rhythm). Guồng chân ổn định 175-180 spm, nhịp thở 2:2.',
        nutrition: getNutritionPlan(2)
      },
      {
        stageName: `Km ${s2End.toFixed(1)} - Đích (${dist.toFixed(1)} km)`,
        paceDesc: `${formatPace(pace3Sec)} /km`,
        status: selectedRaceTactic === 'negative'
          ? 'Bứt phá vượt đối thủ (Negative Split Kick)! Dồn toàn bộ năng lượng tích lũy về đích.'
          : 'Duy trì ý chí và tư thế thẳng lưng vượt qua mệt mỏi.',
        nutrition: getNutritionPlan(3)
      }
    ];
  }, [targetKmNumber, targetRacePaceSec, selectedRaceTactic]);

  useEffect(() => {
    const stored = localStorage.getItem(`runcoach_${athleteId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.trainingPlan) {
          setTrainingPlan(parsed.trainingPlan);
          if (parsed.trainingPlan.availableDays) {
            setAvailableDays(parsed.trainingPlan.availableDays);
          }
          if (parsed.selectedDistance) setSelectedDistance(parsed.selectedDistance);
          if (parsed.targetHours !== undefined) setTargetHours(parsed.targetHours);
          if (parsed.targetMinutes !== undefined) setTargetMinutes(parsed.targetMinutes);
          if (parsed.raceDate) setRaceDate(parsed.raceDate);
        }
      } catch (e) {
        console.error('Error loading athlete data', e);
      }
    } else {
      const defaultPlan = generateDefaultTrainingPlan(
        selectedDistance,
        `${targetHours}h ${targetMinutes}p`,
        raceDate,
        currentVDOT,
        availableDays,
        targetRacePace,
        paceZones
      );
      setTrainingPlan(defaultPlan);
    }
  }, [athleteId]);

  useEffect(() => {
    if (trainingPlan) {
      const dataToSave = {
        athleteId,
        athleteName,
        selectedDistance,
        targetHours,
        targetMinutes,
        raceDate,
        trainingPlan
      };
      localStorage.setItem(`runcoach_${athleteId}`, JSON.stringify(dataToSave));
    }
  }, [trainingPlan, athleteId, athleteName, selectedDistance, targetHours, targetMinutes, raceDate]);

  useEffect(() => {
    localStorage.setItem('runcoach_all_athletes', JSON.stringify(savedAthletes));
  }, [savedAthletes]);

  // TOGGLE WORKOUT COMPLETION (DIRECT TICK)
  const handleToggleWorkoutComplete = (wIdx, dIdx) => {
    if (!trainingPlan) return;
    const updatedPlan = JSON.parse(JSON.stringify(trainingPlan));
    const targetDay = updatedPlan.weeks[wIdx].days[dIdx];

    const nextState = !targetDay.completed;
    targetDay.completed = nextState;

    if (nextState) {
      if (!targetDay.actualKm) {
        const rawKm = parseFloat(targetDay.distance) || 0;
        targetDay.actualKm = rawKm > 0 ? String(rawKm) : '5.0';
      }
      if (!targetDay.actualPace && targetDay.pace !== '--') {
        targetDay.actualPace = targetDay.pace.split(' ')[0] || targetRacePace;
      }
    }

    setTrainingPlan(updatedPlan);
  };

  // RE-SYNC ALL PLANS WHEN USER CHANGES TARGET OR DAYS
  const handleSyncAllPlans = () => {
    const distanceName = selectedDistance.includes('Khác') ? customDistance || 'Cự ly tùy chỉnh' : selectedDistance;
    const targetTimeFormatted = `${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`;
    const newPlan = generateDefaultTrainingPlan(
      distanceName,
      targetTimeFormatted,
      raceDate,
      currentVDOT,
      availableDays,
      targetRacePace,
      paceZones
    );
    setTrainingPlan(newPlan);
    setGenerationSource(runsPerWeek <= 2 ? `Thuật toán VDOT 80/20 & Race Day (${runsPerWeek} buổi rảnh)` : `Thuật toán VDOT & Race Day (${runsPerWeek} buổi rảnh)`);
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    const distanceName = selectedDistance.includes('Khác') ? customDistance || 'Cự ly tùy chỉnh' : selectedDistance;
    const targetTimeFormatted = `${targetHours.toString().padStart(2, '0')}:${targetMinutes.toString().padStart(2, '0')}`;
    const raceDayOfWeek = raceDateDetails.dayOfWeek;

    if (geminiApiKey.trim()) {
      try {
        const prompt = `Bạn là Huấn luyện viên điền kinh cấp cao chuyên nghiệp (RunCoach Head Coach).
Hãy thiết kế một giáo án huấn luyện chạy bộ 12 tuần được cá nhân hóa hoàn toàn theo định dạng JSON hợp lệ.
Thông tin VĐV:
- Tên: ${athleteName} (Giới tính: ${gender}, Tuổi: ${age}, Chiều cao: ${height}cm, Cân nặng: ${weight}kg)
- Thành tích 5K Benchmark: ${fiveKHours}h ${fiveKMinutes}p (VDOT tương đương: ${currentVDOT})
- Dải Pace VDOT: Easy (${paceZones.easy}), Threshold (${paceZones.threshold})
- Kinh nghiệm: ${runningExperience}, Khối lượng hiện tại: ${weeklyMileage} km/tuần
- LỊCH RẢNH THỰC TẾ TRONG TUẦN: VĐV CHỈ CÓ THỂ CHẠY VÀO CÁC NGÀY [${availableDays.join(', ')}] (Tổng cộng đúng ${runsPerWeek} buổi chạy/tuần).
- Mục tiêu: Cự ly ${distanceName} (${targetKmNumber.toFixed(1)} km), Thời gian mục tiêu: ${targetTimeFormatted}, Target Pace thi đấu: ${targetRacePace} /km
- Ngày thi đấu chính thức: ${raceDate} (Rơi vào ${raceDayOfWeek}).

RÀNG BUỘC CỐT LÕI VỀ ĐỒNG BỘ LỊCH TẬP VÀ RACE DAY:
1. BẮT BUỘC chỉ xếp bài chạy vào đúng các ngày VĐV rảnh: [${availableDays.join(', ')}].
2. TẤT CẢ các ngày còn lại trong tuần PHẢI có type là "Rest", tiêu đề "Nghỉ Ngơi Tích Cực / Giãn Cơ", distance "0 km", pace "--".
3. TẠI TUẦN 12 (TUẦN CUỐI CÙNG): Ngày ${raceDayOfWeek} BẮT BUỘC PHẢI LÀ "RACE DAY: GIẢI CHẠY CHÍNH THỨC (${distanceName})" với distance là "${targetKmNumber.toFixed(1)} km", pace là "${targetRacePace} /km", type là "RaceDay".
4. Nếu VĐV chỉ chọn 2 buổi/tuần: Áp dụng quy tắc 80/20 (1 buổi Biến tốc Threshold và 1 buổi Long Run Zone 2).

QUY TẮC BẮT BUỘC ĐỐI VỚI "desc" (Chi tiết bài tập):
- Trình bày dạng danh sách gạch đầu dòng có dấu "•" ở đầu mỗi dòng, ngăn cách bằng ký tự xuống dòng "\\n".
- Cú pháp: "• [Tên dạng bài] - [Km] - [Pace] - [Số lần lặp lại]"

Yêu cầu định dạng JSON CHÍNH XÁC:
{
  "targetDistance": "${distanceName}",
  "targetTime": "${targetTimeFormatted}",
  "raceDate": "${raceDate}",
  "calculatedVDOT": ${currentVDOT},
  "totalWeeks": 12,
  "availableDays": ${JSON.stringify(availableDays)},
  "targetRacePace": "${targetRacePace}",
  "generatedBy": "Gemini 3 Flash AI Engine (Đồng Bộ 100% Race Day)",
  "weeks": [
    {
      "weekNumber": 12,
      "phase": "🏁 TUẦN THI ĐẤU CHÍNH THỨC (RACE WEEK)",
      "weeklyKm": 25,
      "focus": "Dưỡng sức cho ngày đua chính thức",
      "days": [
        {
          "day": "${raceDayOfWeek}",
          "title": "🏁 RACE DAY: GIẢI CHẠY CHÍNH THỨC (${distanceName})",
          "distance": "${targetKmNumber.toFixed(1)} km",
          "pace": "${targetRacePace} /km",
          "desc": "• Khởi động làm nóng - 1.0 km - Nhẹ nhàng - 1 lần\\n• THI ĐẤU CHÍNH THỨC: Duy trì Target Pace - ${targetKmNumber.toFixed(1)} km - Pace ${targetRacePace} /km - 1 lần\\n• Cán đích Finisher và giãn cơ - 0.5 km - Tự hào - 1 lần",
          "type": "RaceDay",
          "completed": false
        }
      ]
    }
  ]
}`;

        const modelsToTry = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
        let aiSuccess = false;

        for (const model of modelsToTry) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
              })
            });

            if (res.ok) {
              const data = await res.json();
              const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (responseText) {
                const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedPlan = JSON.parse(cleanedJson);
                if (parsedPlan && parsedPlan.weeks && parsedPlan.weeks.length > 0) {
                  setTrainingPlan(parsedPlan);
                  setGenerationSource(`Gemini 3 Flash (${model}) - Đồng Bộ Race Day`);
                  setAiEngineStatus(prev => ({ ...prev, modelName: model, lastChecked: 'Vừa tạo giáo án' }));
                  aiSuccess = true;
                  break;
                }
              }
            }
          } catch (modelErr) {
            console.warn(`Model ${model} failed, trying next fallback:`, modelErr);
          }
        }

        if (aiSuccess) {
          setIsGeneratingPlan(false);
          setStep(3);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (err) {
        console.error('Error with Gemini API, falling back to VDOT engine:', err);
      }
    }

    setTimeout(() => {
      const newPlan = generateDefaultTrainingPlan(
        distanceName,
        targetTimeFormatted,
        raceDate,
        currentVDOT,
        availableDays,
        targetRacePace,
        paceZones
      );
      setTrainingPlan(newPlan);
      setGenerationSource(runsPerWeek <= 2 ? `Thuật toán VDOT 80/20 (${runsPerWeek} buổi rảnh & Race Day)` : `Thuật toán VDOT & Race Day`);
      setIsGeneratingPlan(false);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 900);
  };

  const handleOpenCheckIn = (wIdx, dIdx, day) => {
    setCheckInModal({
      isOpen: true,
      weekIndex: wIdx,
      dayIndex: dIdx,
      dayData: day,
      actualKm: day.actualKm || day.distance.replace(/[^0-9.]/g, '') || '5',
      actualPace: day.actualPace || targetRacePace || '6:00',
      heartRate: day.heartRate || '145',
      rpe: day.rpe || 6,
      notes: day.notes || '',
      imageUrl: day.imageUrl || '',
      isScanningImage: false
    });
  };

  const handleSaveCheckIn = () => {
    if (!trainingPlan) return;
    const updatedPlan = JSON.parse(JSON.stringify(trainingPlan));
    const targetDay = updatedPlan.weeks[checkInModal.weekIndex].days[checkInModal.dayIndex];

    targetDay.completed = true;
    targetDay.actualKm = checkInModal.actualKm;
    targetDay.actualPace = checkInModal.actualPace;
    targetDay.heartRate = checkInModal.heartRate;
    targetDay.rpe = checkInModal.rpe;
    targetDay.notes = checkInModal.notes;
    targetDay.imageUrl = checkInModal.imageUrl;

    setTrainingPlan(updatedPlan);
    setCheckInModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSimulateOCRImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCheckInModal(prev => ({ ...prev, isScanningImage: true }));
    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;

      if (geminiApiKey.trim()) {
        try {
          const base64Data = dataUrl.split(',')[1];
          const visionPrompt = `Hãy đọc bức ảnh chụp màn hình chạy bộ này và trả về JSON:
{
  "km": "số km ví dụ: 6.5",
  "pace": "pace ví dụ: 6:45",
  "heartRate": "nhịp tim ví dụ: 152",
  "comment": "lời nhận xét chuyên nghiệp của HLV điền kinh"
}`;
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${geminiApiKey.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: visionPrompt },
                  { inlineData: { mimeType: file.type || "image/jpeg", data: base64Data } }
                ]
              }],
              generationConfig: { responseMimeType: "application/json" }
            })
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
              setCheckInModal(prev => ({
                ...prev,
                imageUrl: dataUrl,
                actualKm: parsed.km || '6.0',
                actualPace: parsed.pace || targetRacePace,
                heartRate: parsed.heartRate || '148',
                notes: `[Gemini 3 Flash Vision]: ${parsed.comment}`,
                isScanningImage: false
              }));
              return;
            }
          }
        } catch (visionErr) {
          console.warn('Vision API error, fallback:', visionErr);
        }
      }

      setTimeout(() => {
        setCheckInModal(prev => ({
          ...prev,
          imageUrl: dataUrl,
          actualKm: '6.2',
          actualPace: targetRacePace || '5:45',
          heartRate: '148',
          notes: 'AI Vision Strava: Nhịp tim duy trì ổn định ở vùng Aerobic Zone 2, cadence đều đặn 174 spm. Bài tập rất tốt!',
          isScanningImage: false
        }));
      }, 900);
    };
    reader.readAsDataURL(file);
  };

  const handleSendCoachChat = async () => {
    if (!coachInput.trim()) return;
    const userMsg = { sender: 'athlete', text: coachInput };
    setCoachMessages(prev => [...prev, userMsg]);
    const currentQuestion = coachInput;
    setCoachInput('');
    setIsCoachThinking(true);

    if (geminiApiKey.trim()) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${geminiApiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Bạn là HLV RunCoach AI.
Thông tin VĐV: ${athleteName}, VDOT: ${currentVDOT}, Lịch rảnh: ${runsPerWeek} buổi/tuần ([${availableDays.join(', ')}]), Mục tiêu: ${selectedDistance} sub ${targetHours}h${targetMinutes}p (Target Pace: ${targetRacePace}/km), Race Day: ${raceDate}.
Trả lời câu hỏi sau ngắn gọn, chuẩn y học thể thao: "${currentQuestion}"`
              }]
            }]
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            setCoachMessages(prev => [...prev, { sender: 'coach', text: reply.trim() }]);
            setIsCoachThinking(false);
            return;
          }
        }
      } catch (chatErr) {
        console.warn('Gemini chat error, fallback:', chatErr);
      }
    }

    setTimeout(() => {
      let reply = `Với mục tiêu ${selectedDistance} sub ${targetHours}h${targetMinutes}p (Pace ${targetRacePace}/km), hãy giữ vững kỷ luật trong các bài chạy dài cuối tuần nhé!`;
      if (currentQuestion.toLowerCase().includes('đau') || currentQuestion.toLowerCase().includes('mỏi')) {
        reply = 'Nếu bạn cảm thấy đau nhói ở khớp hay gân Achilles, hãy nghỉ ngơi và chườm lạnh 15 phút. Tuyệt đối không gắng gượng khi có cơn đau nhói!';
      }
      setCoachMessages(prev => [...prev, { sender: 'coach', text: reply }]);
      setIsCoachThinking(false);
    }, 700);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?athlete=${athleteId}`);
    setCopyNotification(true);
    setTimeout(() => setCopyNotification(false), 2200);
  };

  // Dashboard Stats
  const dashboardStats = useMemo(() => {
    if (!trainingPlan) return { plannedKm: 0, actualKmDone: 0, complianceRate: 0, totalWorkouts: 0, completedWorkouts: 0 };
    let totalWorkouts = 0;
    let completedWorkouts = 0;
    let plannedKm = 0;
    let actualKmDone = 0;

    trainingPlan.weeks.forEach(w => {
      w.days.forEach(d => {
        if (d.type !== 'Rest') {
          totalWorkouts++;
          const dKm = parseFloat(d.distance) || 0;
          plannedKm += dKm;
          if (d.completed) {
            completedWorkouts++;
            actualKmDone += parseFloat(d.actualKm) || dKm;
          }
        }
      });
    });

    const complianceRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
    return {
      plannedKm: Math.round(plannedKm),
      actualKmDone: parseFloat(actualKmDone.toFixed(1)),
      complianceRate,
      totalWorkouts,
      completedWorkouts
    };
  }, [trainingPlan]);

  // Weekly Progress Data for Bar Chart
  const weeklyProgressData = useMemo(() => {
    if (!trainingPlan || !trainingPlan.weeks) return [];
    return trainingPlan.weeks.map(w => {
      const plannedKm = w.weeklyKm || 0;
      let actualKm = 0;
      let totalWorkouts = 0;
      let completedWorkouts = 0;

      w.days.forEach(d => {
        if (d.type !== 'Rest') {
          totalWorkouts++;
          const dKm = parseFloat(d.distance) || 0;
          if (d.completed) {
            completedWorkouts++;
            actualKm += parseFloat(d.actualKm) || dKm;
          }
        }
      });

      actualKm = parseFloat(actualKm.toFixed(1));
      const completionRate = plannedKm > 0 ? Math.min(100, Math.round((actualKm / plannedKm) * 100)) : 0;

      return {
        weekNumber: w.weekNumber,
        phase: w.phase,
        plannedKm,
        actualKm,
        totalWorkouts,
        completedWorkouts,
        completionRate
      };
    });
  }, [trainingPlan]);

  const maxWeeklyKmScale = useMemo(() => {
    if (weeklyProgressData.length === 0) return 50;
    const maxVal = Math.max(...weeklyProgressData.map(w => Math.max(w.plannedKm, w.actualKm)));
    return Math.max(40, Math.ceil(maxVal / 10) * 10);
  }, [weeklyProgressData]);

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-800 flex antialiased selection:bg-amber-400 selection:text-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap');
        *, html, body, input, select, textarea, button {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .font-mono {
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
          letter-spacing: -0.02em;
        }
      `}</style>

      {/* LEFT OBSIDIAN SIDEBAR */}
      <aside className="w-20 md:w-24 bg-[#0B0D11] border-r border-white/5 flex flex-col items-center py-6 shrink-0 z-30 select-none">
        <div 
          onClick={() => { setActiveTab('home'); setStep(1); }}
          className="flex flex-col items-center gap-1.5 mb-8 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20 group-hover:scale-105 transition-transform">
            <span className="font-black text-2xl text-black tracking-tighter italic">R</span>
          </div>
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">RunCoach</span>
        </div>

        <nav className="flex-1 flex flex-col gap-3.5 items-center w-full px-2">
          {[
            { id: 'home', icon: Activity, label: 'Trang chủ', stepTarget: 1 },
            { id: 'plan', icon: Calendar, label: 'Kế hoạch', stepTarget: 2 },
            { id: 'workouts', icon: Layers, label: 'Giáo án', stepTarget: 3 },
            { id: 'race', icon: Trophy, label: 'Race Day', stepTarget: 4 },
            { id: 'stats', icon: BarChart2, label: 'Thống kê', stepTarget: 5 },
          ].map(item => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.stepTarget) {
                    if (item.stepTarget > 2 && !trainingPlan) {
                      handleSyncAllPlans();
                    }
                    setStep(item.stepTarget);
                  }
                }}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25 scale-105 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 font-semibold'
                }`}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] tracking-tight">{item.label}</span>
              </button>
            );
          })}

          <div className="w-8 h-px bg-white/10 my-1" />

          <button
            onClick={() => setShowCommunityModal(true)}
            className="w-14 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 hover:bg-white/5 font-semibold transition-all cursor-pointer"
            title="Cộng đồng & Bảng xếp hạng"
          >
            <Users className="w-5 h-5" />
            <span className="text-[8px] tracking-tight">Cộng đồng</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-14 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-400 hover:bg-white/5 font-semibold transition-all cursor-pointer"
            title="Cài đặt & Gemini API Key"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[8px] tracking-tight">Cài đặt</span>
          </button>
        </nav>

        <div className="text-center px-2 py-3 border-t border-white/10 w-full">
          <p className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest leading-relaxed">
            Better Runners<br />Happier People
          </p>
        </div>
      </aside>

      {/* MAIN WORKSPACE WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER NAVIGATION WITH SYNC INDICATOR */}
        <header className="h-20 bg-[#0B0D11] border-b border-white/5 px-6 lg:px-10 flex items-center justify-between gap-6 sticky top-0 z-40">
          <div className="flex-1 flex items-center gap-2 lg:gap-3 py-2 overflow-visible">
            {[
              { id: 1, label: 'Thể Lực & Hồ Sơ' },
              { id: 2, label: 'Mục Tiêu & Lịch' },
              { id: 3, label: 'Giáo Án Chi Tiết' },
              { id: 4, label: 'Chiến Lược Race Day' },
              { id: 5, label: 'Infographic Thể Lực' }
            ].map((s, idx) => {
              const isActive = step === s.id;
              const isPast = s.id < step || (s.id <= 2) || (s.id > 2 && trainingPlan);

              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id <= 2 || trainingPlan) {
                        setStep(s.id);
                        if (s.id === 1) setActiveTab('home');
                        else if (s.id === 2) setActiveTab('plan');
                        else if (s.id === 3) setActiveTab('workouts');
                        else if (s.id === 4) setActiveTab('race');
                        else if (s.id === 5) setActiveTab('stats');
                      }
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25 font-black scale-102'
                        : isPast
                          ? 'bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white font-bold'
                          : 'bg-white/5 text-slate-600 font-medium'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isActive ? 'bg-black text-amber-400' : 'bg-white/20 text-slate-300'
                      }`}
                    >
                      {s.id}
                    </span>
                    <span className="hidden sm:inline tracking-tight">{s.label}</span>
                  </button>
                  {idx < 4 && <div className="w-3 lg:w-5 h-px bg-white/15 shrink-0 hidden md:block" />}
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleSyncAllPlans}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition-all cursor-pointer"
              title="Đồng bộ lại toàn bộ giáo án và chặng đua"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Đồng Bộ Dữ Liệu</span>
            </button>

            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer group"
              title="Cấu hình Gemini 3 Flash & API Key"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse group-hover:scale-125 transition-transform" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">AI ENGINE</span>
              <span className="text-amber-400 font-mono font-bold text-xs">{aiEngineStatus.modelName}</span>
            </button>

            <button
              onClick={() => setShowAthleteModal(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-all text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-black font-black flex items-center justify-center text-xs shadow-sm">
                {athleteName.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-extrabold text-white leading-tight">{athleteName}</p>
                <p className="text-[10px] text-amber-400/90 font-mono tracking-tight font-bold">{athleteId}</p>
              </div>
            </button>
          </div>
        </header>

        {/* CONTENT BODY WITH HERO BANNER */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex gap-6 lg:gap-8 items-start">
          <div className="hidden xl:flex w-72 rounded-3xl overflow-hidden relative shadow-xl shrink-0 flex-col justify-between p-6 bg-slate-900 border border-slate-800 text-white min-h-[720px]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80")'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="relative z-10">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">RunCoach Philosophy</span>
              <h2 className="text-4xl font-black italic tracking-tighter leading-none mt-3 text-white uppercase">
                RUN<br />SMARTER<br />GO<br />FURTHER
              </h2>
              <p className="text-xs text-slate-300 mt-3 font-medium leading-relaxed">
                Đồng bộ 100% giữa Lịch rảnh, Cự ly mục tiêu, Target Pace và Ngày thi đấu Race Day.
              </p>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Target Race:</span>
                  <span className="text-amber-400 font-mono font-black">{selectedDistance.split(' ')[0]}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Target Pace:</span>
                  <span className="text-white font-mono font-black">{targetRacePace} /km</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Lịch rảnh:</span>
                  <span className="text-emerald-400 font-mono font-black">{runsPerWeek} buổi / tuần</span>
                </div>
              </div>

              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${(runsPerWeek / 7) * 100}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 font-extrabold tracking-widest uppercase">
                Race Day: {raceDateDetails.dayOfWeek}, {raceDate}
              </p>
            </div>
          </div>

          {/* MAIN INTERACTIVE CARD */}
          <main className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 lg:p-10 min-w-0">
            {/* STEP 1: HỒ SƠ VĐV & THỂ LỰC HIỆN TẠI */}
            {step === 1 && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">
                      HỒ SƠ VĐV &amp; <span className="text-amber-500">THỂ LỰC HIỆN TẠI</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                      Đang cá nhân hóa cho:{' '}
                      <span className="font-extrabold text-slate-800">{athleteName}</span>{' '}
                      <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {athleteId}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAthleteModal(true)}
                    className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Đổi Vận Động Viên
                  </button>
                </div>

                {/* MODULE 01: CHỈ SỐ THỂ CHẤT */}
                <section className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 font-mono font-black text-xs flex items-center justify-center">
                        01
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                        Chỉ Số Thể Chất Bản Thân
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-semibold">Căn cứ tính nhịp tim &amp; tiêu hao calo</span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Giới tính
                      </label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                        className="w-full bg-transparent font-bold text-slate-800 text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="Nam (Male)">Nam (Male)</option>
                        <option value="Nữ (Female)">Nữ (Female)</option>
                      </select>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Tuổi
                      </label>
                      <div className="flex items-center justify-between">
                        <input
                          type="number"
                          value={age}
                          onChange={e => setAge(Number(e.target.value))}
                          className="w-16 bg-transparent font-black font-mono text-slate-800 text-base focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-semibold">tuổi</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Chiều cao
                      </label>
                      <div className="flex items-center justify-between">
                        <input
                          type="number"
                          value={height}
                          onChange={e => setHeight(Number(e.target.value))}
                          className="w-16 bg-transparent font-black font-mono text-slate-800 text-base focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-semibold">cm</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Cân nặng
                      </label>
                      <div className="flex items-center justify-between">
                        <input
                          type="number"
                          value={weight}
                          onChange={e => setWeight(Number(e.target.value))}
                          className="w-16 bg-transparent font-black font-mono text-slate-800 text-base focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 font-semibold">kg</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* MODULE 02: 5K BENCHMARK & VDOT TELEMETRY */}
                <section className="bg-gradient-to-br from-slate-50 via-white to-amber-50/20 border-2 border-amber-300/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-400 text-black font-mono font-black text-xs flex items-center justify-center">
                        02
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Thành Tích 5KM &amp; Trạm Đo Lường VDOT
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Căn cứ vàng để phân tích vận tốc và dải nhịp tim</p>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-wider">
                      BỘ NÃO GIÁO ÁN
                    </span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    <div className="xl:col-span-7 space-y-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-amber-400 text-black flex items-center justify-center shadow-md shadow-amber-400/20">
                            <Flame className="w-6 h-6 fill-current" />
                          </div>
                          <div>
                            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                              Mốc 5K Benchmark
                            </span>
                            <span className="text-xs font-semibold text-slate-600">Thành tích tốt nhất gần đây</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Giờ</span>
                            <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                              <button
                                onClick={() => setFiveKHours(prev => Math.max(0, prev - 1))}
                                className="w-6 h-6 rounded-lg bg-white text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-xl font-black font-mono text-slate-900 w-8 text-center">
                                {fiveKHours.toString().padStart(2, '0')}
                              </span>
                              <button
                                onClick={() => setFiveKHours(prev => Math.min(2, prev + 1))}
                                className="w-6 h-6 rounded-lg bg-white text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <span className="text-2xl font-black text-slate-400 mt-4">:</span>

                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Phút</span>
                            <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                              <button
                                onClick={() => setFiveKMinutes(prev => Math.max(12, prev - 1))}
                                className="w-6 h-6 rounded-lg bg-white text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-xl font-black font-mono text-amber-600 w-8 text-center">
                                {fiveKMinutes.toString().padStart(2, '0')}
                              </span>
                              <button
                                onClick={() => setFiveKMinutes(prev => Math.min(59, prev + 1))}
                                className="w-6 h-6 rounded-lg bg-white text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Pace 5K Chuẩn
                          </span>
                          <p className="text-lg font-black font-mono text-slate-800 mt-0.5">
                            {calculated5KPace} <span className="text-xs font-bold text-slate-500">/km</span>
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                            Vận Tốc Trung Bình
                          </span>
                          <p className="text-lg font-black font-mono text-slate-800 mt-0.5">
                            {calculatedSpeedKmh} <span className="text-xs font-bold text-slate-500">km/h</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>Kéo thanh trượt điều chỉnh nhanh:</span>
                          <span className="font-mono text-amber-600 font-black">{total5KMinutes} phút</span>
                        </div>
                        <input
                          type="range"
                          min="14"
                          max="60"
                          value={total5KMinutes}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setFiveKHours(Math.floor(val / 60));
                            setFiveKMinutes(val % 60);
                          }}
                          className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                            Chỉ Số Sức Mạnh VDOT
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">Jack Daniels Oxygen Power</span>
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-mono font-black text-2xl tracking-tight shadow-md">
                          {currentVDOT}{' '}
                          <span className="text-[10px] font-black text-amber-400 tracking-wider">PTS</span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-1">
                        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Heart className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                              <span className="text-xs font-black text-emerald-950 uppercase">Easy Pace (E)</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-semibold">Zone 2 • Đốt mỡ &amp; hiếu khí</span>
                          </div>
                          <span className="text-xs sm:text-sm font-black font-mono text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
                            {paceZones.easy} /km
                          </span>
                        </div>

                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                              <span className="text-xs font-black text-amber-950 uppercase">Threshold Pace (T)</span>
                            </div>
                            <span className="text-[10px] text-amber-700 font-semibold">Zone 4 • Ngưỡng đào thải Lactate</span>
                          </div>
                          <span className="text-xs sm:text-sm font-black font-mono text-amber-900 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-xs">
                            {paceZones.threshold} /km
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* MODULE 03: ĐỒNG BỘ LỊCH RẢNH THỰC TẾ & KHỐI LƯỢNG */}
                <section className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 font-mono font-black text-xs flex items-center justify-center">
                        03
                      </span>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                          Lịch Rảnh &amp; Khối Lượng Chạy Bộ
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium">Hệ thống sẽ chỉ xếp bài chạy vào những ngày bạn chọn</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full self-start sm:self-auto">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
                      <span className="text-[11px] font-black text-amber-900 uppercase">
                        {runsPerWeek} BUỔI / TUẦN
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                          Chọn các ngày bạn có thể chạy trong tuần:
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Tick chọn các ngày bạn rảnh (tối thiểu 1 ngày, khuyên dùng 2-4 ngày)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Mẫu nhanh:</span>
                        {[2, 3, 4].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleSelectDaysPreset(p)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-colors cursor-pointer ${
                              runsPerWeek === p ? 'bg-amber-400 text-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {p} Buổi
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-1">
                      {ALL_WEEK_DAYS.map(dayName => {
                        const isSelected = availableDays.includes(dayName);
                        const shortName = dayName.replace('Thứ ', 'T').replace('Chủ Nhật', 'CN');

                        return (
                          <button
                            key={dayName}
                            type="button"
                            onClick={() => handleToggleDay(dayName)}
                            className={`py-3 px-1 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 border-amber-400 text-black shadow-md shadow-amber-400/25 ring-2 ring-amber-300 scale-102 font-black'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 font-bold'
                            }`}
                          >
                            <span className="text-sm sm:text-base font-black font-mono">{shortName}</span>
                            <span className="text-[9px] uppercase tracking-tighter hidden sm:inline opacity-80">
                              {dayName}
                            </span>
                            <span className={`w-2 h-2 rounded-full mt-0.5 ${isSelected ? 'bg-black' : 'bg-slate-300'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setActiveTab('plan');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 transition-all active:scale-[0.99] uppercase tracking-wide cursor-pointer"
                >
                  <span>Tiếp Theo: Thiết Lập Mục Tiêu &amp; Lịch Thi Đấu</span>
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            )}

            {/* STEP 2: MỤC TIÊU THI ĐẤU & LỊCH HUẤN LUYỆN */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="border-b border-slate-100 pb-6">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">
                    MỤC TIÊU THI ĐẤU &amp; <span className="text-amber-500">LỊCH HUẤN LUYỆN</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                    Xác định cự ly mục tiêu, thời gian về đích (Target Time) và ngày giải đấu thực tế.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide block">
                    1. Cự Ly Mục Tiêu (Target Distance)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      '5K (5.0 km)',
                      '10K (10.0 km)',
                      'Half Marathon (21.1 km)',
                      'Full Marathon (42.2 km)',
                      'Khác (Other)...'
                    ].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDistance(d)}
                        className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-black transition-all text-left flex flex-col justify-between h-20 cursor-pointer ${
                          selectedDistance === d
                            ? 'bg-amber-400 border-amber-400 text-black shadow-md shadow-amber-400/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <Compass className="w-4 h-4 mb-1" />
                        <span>{d}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide block">
                    2. Thời Gian Mục Tiêu Về Đích (Target Time)
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-wide block">
                        Kỳ vọng thành tích
                      </span>
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        Target Race Pace: <span className="font-bold text-amber-600 font-mono text-base">{targetRacePace} /km</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Giờ</span>
                        <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                          <button
                            onClick={() => setTargetHours(prev => Math.max(0, prev - 1))}
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-2xl font-black font-mono text-slate-900 w-10 text-center">
                            {targetHours.toString().padStart(2, '0')}
                          </span>
                          <button
                            onClick={() => setTargetHours(prev => Math.min(10, prev + 1))}
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <span className="text-3xl font-black text-slate-300 mt-4">:</span>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Phút</span>
                        <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                          <button
                            onClick={() => setTargetMinutes(prev => Math.max(0, prev - 5))}
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-2xl font-black font-mono text-amber-600 w-10 text-center">
                            {targetMinutes.toString().padStart(2, '0')}
                          </span>
                          <button
                            onClick={() => setTargetMinutes(prev => Math.min(55, prev + 5))}
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. NGÀY THI ĐẤU THỰC TẾ (RACE DAY) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide block">
                      3. Ngày Thi Đấu Thực Tế (Race Day)
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Tự động gán vào ngày đua chính thức ở Tuần 12
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-7 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 shadow-xs">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-md shadow-amber-400/20">
                        <Trophy className="w-7 h-7 stroke-[2.2]" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Thời Gian Khởi Tranh Giải Chạy
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-slate-900 capitalize tracking-tight">
                          {raceDateDetails.formattedDate}
                        </h4>
                        <span className="text-xs font-mono font-bold text-amber-600 block">
                          Tranh tài vào: {raceDateDetails.dayOfWeek} (Tuần 12)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-xs">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                        <Clock className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian còn lại</span>
                          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 uppercase">
                            Chu kỳ thi đấu
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <p className="text-lg sm:text-xl font-black font-mono text-slate-900">
                            Còn <span className="text-amber-600">{raceDateDetails.totalWeeks}</span> tuần
                          </p>
                          <span className="text-xs font-bold font-mono text-slate-500">
                            ({raceDateDetails.totalDays} ngày tập luyện)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row xl:flex-col items-start xl:items-end justify-center gap-1.5 shrink-0">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Chọn ngày Race Day:
                      </label>
                      <input
                        type="date"
                        value={raceDate}
                        onChange={e => setRaceDate(e.target.value)}
                        className="bg-white border-2 border-slate-200 hover:border-amber-400 focus:border-amber-400 px-4 py-2.5 rounded-2xl font-black font-mono text-slate-900 text-sm focus:outline-none transition-all shadow-xs cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setActiveTab('home'); }}
                    className="py-4 px-6 rounded-2xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-colors uppercase tracking-wide cursor-pointer"
                  >
                    Quay Lại
                  </button>
                  <button
                    type="button"
                    onClick={handleGeneratePlan}
                    disabled={isGeneratingPlan}
                    className="flex-1 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 transition-all uppercase tracking-wide cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Gemini 3 Flash Đang Lên Lịch &amp; Đồng Bộ Race Day...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 fill-current" />
                        <span>Khởi Tạo Giáo Án Chuẩn VDOT &amp; Đồng Bộ Race Day</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: GIÁO ÁN CHI TIẾT THEO TUẦN (WITH RACE DAY HIGHLIGHT) */}
            {step === 3 && trainingPlan && (
              <div className="space-y-8">
                {/* RACE DAY BANNER */}
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 text-black p-5 sm:p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg border-2 border-amber-400">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-black text-amber-400 flex items-center justify-center shrink-0 shadow-md">
                      <Trophy className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                        <span className="px-2 py-0.5 rounded-md bg-black text-amber-400">MỤC TIÊU RACE DAY</span>
                        <span>•</span>
                        <span>{raceDateDetails.formattedDate}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mt-0.5">
                        {trainingPlan.targetDistance} • Sub {trainingPlan.targetTime}
                      </h3>
                      <p className="text-xs font-bold text-slate-900/80">
                        Target Race Pace: <span className="font-mono font-black text-black">{targetRacePace} /km</span> • Tuần 12 sẽ diễn ra giải đua chính thức!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => { setStep(4); setActiveTab('race'); }}
                    className="px-4 py-2.5 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-black flex items-center gap-2 uppercase tracking-wider cursor-pointer shadow-md self-end md:self-auto"
                  >
                    <span>Xem Chiến Lược Race Day</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* DANH SÁCH CHỌN TUẦN */}
                  <div className="lg:col-span-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                        Chọn tuần huấn luyện
                      </span>
                      <button
                        onClick={handleSyncAllPlans}
                        className="text-[10px] font-black text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Tái đồng bộ
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                      {trainingPlan.weeks.map((w, idx) => {
                        const isSelected = selectedWeekIndex === idx;
                        const isRaceWeek = w.weekNumber === 12;
                        const workoutDays = w.days.filter(d => d.type !== 'Rest');
                        const totalWorkouts = workoutDays.length;
                        const completedWorkouts = workoutDays.filter(d => d.completed).length;
                        const isAllDone = totalWorkouts > 0 && completedWorkouts === totalWorkouts;

                        return (
                          <button
                            key={w.weekNumber}
                            onClick={() => setSelectedWeekIndex(idx)}
                            className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              isRaceWeek
                                ? isSelected
                                  ? 'bg-amber-400 border-amber-500 text-black shadow-lg shadow-amber-400/25 ring-2 ring-amber-400'
                                  : 'bg-amber-50/70 border-amber-300 text-slate-900 hover:bg-amber-100/60'
                                : isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs">
                                  {isRaceWeek ? '🏁 Tuần 12 (RACE WEEK)' : `Tuần ${w.weekNumber}`}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-black font-mono ${
                                  isRaceWeek
                                    ? 'bg-black text-amber-400'
                                    : isSelected
                                      ? 'bg-amber-400 text-black'
                                      : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {w.weeklyKm} km
                                </span>
                              </div>
                              <p className={`text-[11px] font-semibold mt-1 truncate ${
                                isSelected ? (isRaceWeek ? 'text-slate-900' : 'text-slate-300') : 'text-slate-500'
                              }`}>
                                {w.phase}
                              </p>
                            </div>

                            <span className={`text-[10px] font-mono font-black px-2 py-1 rounded-lg flex items-center gap-1 ${
                              isAllDone
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isSelected
                                  ? isRaceWeek ? 'bg-black text-amber-400' : 'bg-white/10 text-white'
                                  : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isAllDone && '✓ '}
                              {completedWorkouts}/{totalWorkouts} buổi
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CHI TIẾT BÀI CHẠY TỪNG NGÀY TRONG TUẦN */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase">
                          Chi Tiết Tuần {trainingPlan.weeks[selectedWeekIndex]?.weekNumber}: {trainingPlan.weeks[selectedWeekIndex]?.phase}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Trọng tâm: {trainingPlan.weeks[selectedWeekIndex]?.focus} • Khối lượng: {trainingPlan.weeks[selectedWeekIndex]?.weeklyKm} km
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {trainingPlan.weeks[selectedWeekIndex]?.days.map((day, dIdx) => {
                        const isSpecialRaceDay = day.type === 'RaceDay';

                        return (
                          <div
                            key={day.day}
                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                              isSpecialRaceDay
                                ? 'bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-2 border-amber-400 shadow-md ring-2 ring-amber-300/40'
                                : day.completed
                                  ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                                  : day.type === 'Rest'
                                    ? 'bg-slate-50/80 border-slate-200/60 opacity-80'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              {day.type !== 'Rest' ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleWorkoutComplete(selectedWeekIndex, dIdx)}
                                  className={`w-7 h-7 mt-0.5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                    day.completed
                                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                                      : isSpecialRaceDay
                                        ? 'border-2 border-amber-500 bg-amber-400 text-black hover:scale-105'
                                        : 'border-2 border-slate-300 hover:border-emerald-500 bg-white text-transparent'
                                  }`}
                                  title={day.completed ? 'Bấm để hủy hoàn thành' : 'Bấm để đánh dấu đã hoàn thành'}
                                >
                                  {isSpecialRaceDay && !day.completed ? (
                                    <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                                  ) : (
                                    <Check className={`w-4 h-4 stroke-[3] ${day.completed ? 'block' : 'opacity-0 hover:opacity-40'}`} />
                                  )}
                                </button>
                              ) : (
                                <div className="w-7 h-7 mt-0.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 text-[10px] font-black">
                                  Zz
                                </div>
                              )}

                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                                    isSpecialRaceDay
                                      ? 'bg-black text-amber-400'
                                      : availableDays.includes(day.day)
                                        ? 'bg-slate-900 text-amber-400'
                                        : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {day.day}
                                  </span>
                                  <span className={`text-xs font-black uppercase ${
                                    isSpecialRaceDay ? 'text-amber-950 font-black' : day.completed ? 'text-emerald-950' : 'text-slate-800'
                                  }`}>
                                    {day.title}
                                  </span>
                                  {isSpecialRaceDay && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shadow-xs">
                                      CHÍNH THỨC 🏆
                                    </span>
                                  )}
                                  {day.completed && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                                      Đã Hoàn Thành ✓
                                    </span>
                                  )}
                                </div>

                                <p className={`text-xs font-mono font-black ${
                                  day.type === 'Rest'
                                    ? 'text-slate-400'
                                    : isSpecialRaceDay
                                      ? 'text-amber-800 font-black'
                                      : day.completed
                                        ? 'text-emerald-800'
                                        : 'text-amber-600'
                                }`}>
                                  {day.distance} • Pace: {day.pace}
                                </p>

                                <div className="space-y-1 pt-1">
                                  {day.desc.split('\n').filter(Boolean).map((line, lIdx) => (
                                    <div key={lIdx} className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                        isSpecialRaceDay ? 'bg-amber-600' : day.type === 'Rest' ? 'bg-slate-300' : 'bg-amber-500'
                                      }`} />
                                      <span className="leading-relaxed">
                                        {line.replace(/^[•\-\*]\s*/, '')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                              {day.type !== 'Rest' && (
                                <button
                                  onClick={() => handleOpenCheckIn(selectedWeekIndex, dIdx, day)}
                                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase tracking-wider cursor-pointer ${
                                    day.completed
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                      : isSpecialRaceDay
                                        ? 'bg-black text-amber-400 hover:bg-slate-800'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                  }`}
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>{day.completed ? 'Nhật Ký' : isSpecialRaceDay ? 'Nạp Race' : 'Nạp Bài'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CHIẾN LƯỢC RACE DAY ĐỒNG BỘ 100% */}
            {step === 4 && (
              <div className="space-y-8">
                <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                      CHIẾN LƯỢC TỐC ĐỘ &amp; <span className="text-amber-500">DINH DƯỠNG RACE DAY</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                      Đã đồng bộ tự động theo: <strong className="text-slate-800">{selectedDistance}</strong> ({targetKmNumber.toFixed(1)} km) • Mục tiêu: <strong className="text-amber-600">Sub {targetHours}h {targetMinutes}p</strong> (Target Pace: <span className="font-mono font-black">{targetRacePace} /km</span>).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-2xl self-start sm:self-auto font-mono text-xs">
                    <Flag className="w-4 h-4 text-amber-400" />
                    <span>Race Date: <strong className="text-amber-400">{raceDateDetails.dayOfWeek}, {raceDate}</strong></span>
                  </div>
                </div>

                {/* 3 CHIẾN THUẬT PHÂN BỔ TỐC ĐỘ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: 'negative',
                      name: 'Negative Split (Khuyên Dùng)',
                      badge: 'TỐI ƯU PR',
                      desc: `Nửa đầu chạy chậm hơn Target Pace 7s (${formatPace(targetRacePaceSec + 7)}/km) để giữ đường huyết. Nửa sau tăng tốc (${formatPace(targetRacePaceSec - 7)}/km) cán đích bứt phá!`
                    },
                    {
                      id: 'even',
                      name: 'Even Pacing',
                      badge: 'NHỊP ĐỒNG HỒ',
                      desc: `Duy trì đều đặn đúng ${targetRacePace} /km từ vạch xuất phát đến đích như một chiếc máy đếm nhịp hoàn hảo.`
                    },
                    {
                      id: 'conservative',
                      name: 'Conservative Start',
                      badge: 'AN TOÀN TUYỆT ĐỐI',
                      desc: `Xuất phát chậm hơn 12s (${formatPace(targetRacePaceSec + 12)}/km) làm nóng cơ thể, kiểm soát chuột rút và sốc nhiệt cho người mới chạy cự ly này.`
                    }
                  ].map(t => {
                    const isSelected = selectedRaceTactic === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedRaceTactic(t.id)}
                        className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isSelected ? 'bg-amber-400 text-black' : 'bg-slate-200 text-slate-600'}`}>
                            {t.badge}
                          </span>
                          {isSelected && <span className="text-xs font-black text-amber-600">Đang chọn ✓</span>}
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t.name}</h4>
                        <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* BẢNG PHÂN BỔ CHẶNG ĐUA ĐỒNG BỘ TOÀN DIỆN */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Bảng Phân Bổ Chặng Đua Chi Tiết ({selectedDistance})
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span>Chiến thuật:</span>
                      <span className="font-black text-amber-600 uppercase font-mono">
                        {selectedRaceTactic === 'negative' ? 'Negative Split' : selectedRaceTactic === 'even' ? 'Even Pace' : 'Conservative'}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase font-mono font-black">
                          <th className="py-2.5">Chặng (Km)</th>
                          <th className="py-2.5">Pace Thực Chiến</th>
                          <th className="py-2.5">Trạng Thái &amp; Nhịp Tim</th>
                          <th className="py-2.5">Kế Hoạch Nạp Gel &amp; Điện Giải</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {dynamicRaceSplits.map((split, sIdx) => (
                          <tr key={sIdx} className="hover:bg-white/80 transition-colors">
                            <td className="py-3.5 font-black font-mono text-slate-900">{split.stageName}</td>
                            <td className="py-3.5 font-mono font-black text-amber-600 text-sm">
                              {split.paceDesc}
                            </td>
                            <td className="py-3.5 font-medium max-w-xs">{split.status}</td>
                            <td className="py-3.5 font-medium text-emerald-800">{split.nutrition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: INFOGRAPHIC DASHBOARD THỂ LỰC & BAR CHART */}
            {step === 5 && (
              <div className="space-y-8">
                <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                      INFOGRAPHIC TIẾN TRÌNH &amp; <span className="text-amber-500">THỂ LỰC TÍCH LŨY</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                      Đồng bộ theo thời gian thực với {dashboardStats.completedWorkouts} buổi chạy đã tích hoàn thành.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-300 px-4 py-2 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-700" />
                    <span>Mục tiêu: {selectedDistance} (Race: {raceDate})</span>
                  </div>
                </div>

                {/* SUMMARY STATS TIÊU ĐIỂM */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 text-white p-6 rounded-3xl flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                        Tỷ Lệ Tuân Thủ
                      </span>
                      <p className="text-4xl font-black font-mono text-amber-400 mt-2">
                        {dashboardStats.complianceRate}%
                      </p>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {dashboardStats.completedWorkouts} / {dashboardStats.totalWorkouts} buổi chạy hoàn thành
                      </span>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-amber-400/20 border-t-amber-400 flex items-center justify-center font-mono font-black text-lg">
                      {dashboardStats.complianceRate}%
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                      Km Đã Hoàn Thành
                    </span>
                    <p className="text-4xl font-black font-mono text-slate-900 mt-2">
                      {dashboardStats.actualKmDone}{' '}
                      <span className="text-sm font-black text-slate-500">km</span>
                    </p>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Kế hoạch tổng: {dashboardStats.plannedKm} km ({runsPerWeek} buổi/tuần)
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                      VDOT Phong Độ
                    </span>
                    <p className="text-4xl font-black font-mono text-slate-900 mt-2">
                      {currentVDOT}{' '}
                      <span className="text-sm font-black text-amber-600">PTS</span>
                    </p>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Target Pace: {targetRacePace} /km
                    </span>
                  </div>
                </div>

                {/* BIỂU ĐỒ CỘT (BAR CHART) TIẾN ĐỘ THEO TỪNG TUẦN */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                          Biểu Đồ Tiến Độ Khối Lượng Từng Tuần (12 Tuần)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Tuần 12 là tuần thi đấu chính thức (Race Week: {raceDateDetails.dayOfWeek}, {raceDate}).
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold self-start sm:self-auto bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-slate-300" />
                        <span className="text-slate-600">Kế hoạch (Planned)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-amber-400" />
                        <span className="text-slate-900">Thực tế (Actual)</span>
                      </div>
                    </div>
                  </div>

                  {/* VÙNG VẼ BIỂU ĐỒ CỘT */}
                  <div className="space-y-2">
                    <div className="relative pt-6 pb-2">
                      <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-56 sm:h-64 pt-6 px-1 relative z-10">
                        {weeklyProgressData.map((w, idx) => {
                          const plannedHeightPercent = Math.min(100, Math.round((w.plannedKm / maxWeeklyKmScale) * 100));
                          const actualHeightPercent = Math.min(100, Math.round((w.actualKm / maxWeeklyKmScale) * 100));
                          const isCompletedWeek = w.plannedKm > 0 && w.actualKm >= w.plannedKm;
                          const isHovered = hoveredWeekIdx === idx;
                          const isRaceWeek = w.weekNumber === 12;

                          return (
                            <div
                              key={w.weekNumber}
                              onMouseEnter={() => setHoveredWeekIdx(idx)}
                              onMouseLeave={() => setHoveredWeekIdx(null)}
                              className="h-full flex flex-col justify-end items-center group relative cursor-pointer"
                            >
                              {isHovered && (
                                <div className="absolute -top-16 z-30 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap text-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                  <p className="font-mono font-black text-amber-400">
                                    {isRaceWeek ? '🏁 TUẦN 12: RACE WEEK' : `Tuần ${w.weekNumber}: ${w.phase}`}
                                  </p>
                                  <p className="font-semibold text-slate-300 mt-0.5">
                                    Thực tế: <span className="font-mono font-black text-white">{w.actualKm} km</span> / KH: {w.plannedKm} km
                                  </p>
                                  <p className="text-[10px] text-emerald-400 font-bold">
                                    Đạt {w.completionRate}% • {w.completedWorkouts}/{w.totalWorkouts} buổi
                                  </p>
                                </div>
                              )}

                              <span className={`text-[10px] font-mono font-black mb-1 transition-opacity ${
                                w.actualKm > 0 ? 'text-amber-600 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                              }`}>
                                {w.actualKm > 0 ? `${w.actualKm}` : '0'}
                              </span>

                              <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full pb-1">
                                <div
                                  className="w-2.5 sm:w-4 bg-slate-200 group-hover:bg-slate-300 rounded-t-md transition-all duration-300"
                                  style={{ height: `${plannedHeightPercent}%` }}
                                  title={`Tuần ${w.weekNumber} Kế hoạch: ${w.plannedKm} km`}
                                />

                                <div
                                  className={`w-2.5 sm:w-4 rounded-t-md transition-all duration-300 shadow-xs ${
                                    isCompletedWeek
                                      ? 'bg-emerald-500 shadow-emerald-400/20'
                                      : w.actualKm > 0
                                        ? 'bg-amber-400 group-hover:bg-amber-300 shadow-amber-400/20'
                                        : 'bg-amber-400/20'
                                  }`}
                                  style={{ height: `${Math.max(4, actualHeightPercent)}%` }}
                                />
                              </div>

                              <div className="mt-2 text-center">
                                <span className={`text-[10px] sm:text-xs font-mono font-black block ${
                                  isRaceWeek ? 'text-amber-600 font-black' : isHovered ? 'text-amber-600' : 'text-slate-600'
                                }`}>
                                  {isRaceWeek ? '🏁' : `T${w.weekNumber}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* WORKOUT CHECK-IN & OCR MODAL */}
      {checkInModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Nhật Ký Buổi Tập
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {checkInModal.dayData?.day}: {checkInModal.dayData?.title}
                </h3>
              </div>
              <button
                onClick={() => setCheckInModal(prev => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-2xl p-5 text-center space-y-2">
              <Camera className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Tải ảnh chụp màn hình Strava / Garmin / Apple Watch
              </p>
              <label className="inline-block mt-2 px-4 py-2 rounded-xl bg-amber-400 text-black font-black text-xs cursor-pointer hover:bg-amber-300 transition-colors uppercase tracking-wider">
                <span>{checkInModal.isScanningImage ? 'Đang Quét Ảnh...' : 'Chọn Ảnh Chạy'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSimulateOCRImage}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  Km Thực Tế
                </label>
                <input
                  type="text"
                  value={checkInModal.actualKm}
                  onChange={e => setCheckInModal(prev => ({ ...prev, actualKm: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  Pace Thực Tế
                </label>
                <input
                  type="text"
                  value={checkInModal.actualPace}
                  onChange={e => setCheckInModal(prev => ({ ...prev, actualPace: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  Nhịp Tim (BPM)
                </label>
                <input
                  type="text"
                  value={checkInModal.heartRate}
                  onChange={e => setCheckInModal(prev => ({ ...prev, heartRate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                  Cảm Nhận Cơ Thể &amp; Nhận Xét Của AI
                </label>
                <textarea
                  rows={3}
                  value={checkInModal.notes}
                  onChange={e => setCheckInModal(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCheckInModal(prev => ({ ...prev, isOpen: false }))}
                className="w-1/3 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 uppercase tracking-wide cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCheckIn}
                className="w-2/3 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 font-black text-xs text-black shadow-md shadow-amber-400/20 uppercase tracking-wide cursor-pointer"
              >
                Lưu &amp; Đánh Dấu Hoàn Thành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATHLETE PROFILE MODAL */}
      {showAthleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Không Gian Vận Động Viên
                </span>
                <h3 className="text-lg font-black text-slate-900 uppercase">Quản Lý &amp; Đồng Bộ VĐV</h3>
              </div>
              <button
                onClick={() => setShowAthleteModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                Đang kích hoạt hiện tại
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black">{athleteName}</p>
                  <p className="text-xs font-mono font-bold text-amber-400">{athleteId}</p>
                </div>
                <button
                  onClick={handleCopyShareLink}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 hover:bg-amber-300 uppercase tracking-wider cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyNotification ? 'Đã Chép!' : 'Chép Link'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide block">
                Danh sách VĐV đã lưu
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {savedAthletes.map(a => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      a.id === athleteId
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setAthleteId(a.id);
                        setAthleteName(a.name);
                        setShowAthleteModal(false);
                      }}
                      className="flex-1 text-left flex items-center gap-2 cursor-pointer"
                    >
                      <span>{a.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">({a.id})</span>
                    </button>
                    {savedAthletes.length > 1 && (
                      <button
                        onClick={() => {
                          setSavedAthletes(prev => prev.filter(x => x.id !== a.id));
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide block">
                Tạo hoặc đổi mã VĐV mới
              </label>
              <input
                type="text"
                placeholder="Tên vận động viên (VD: Hoàng Runner)..."
                value={newAthleteNameInput}
                onChange={e => setNewAthleteNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800"
              />
              <input
                type="text"
                placeholder="Mã VĐV (VD: HOANG-SUB2)..."
                value={newAthleteIdInput}
                onChange={e => setNewAthleteIdInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-black text-slate-800 uppercase"
              />
              <button
                type="button"
                onClick={() => {
                  const id = newAthleteIdInput.trim() || `PACER-${Math.floor(1000 + Math.random() * 9000)}`;
                  const name = newAthleteNameInput.trim() || 'Vận Động Viên';
                  setAthleteId(id);
                  setAthleteName(name);
                  setSavedAthletes(prev => {
                    if (prev.some(a => a.id === id)) return prev;
                    return [...prev, { id, name }];
                  });
                  setNewAthleteNameInput('');
                  setNewAthleteIdInput('');
                  setShowAthleteModal(false);
                }}
                className="w-full py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase tracking-wide cursor-pointer"
              >
                Chuyển Sang &amp; Đồng Bộ Mã VĐV Này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ENGINE & GEMINI SETTINGS MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black">
                  <Sparkles className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">Cấu Hình AI Engine</h3>
                  <span className="text-[10px] font-bold text-emerald-600">Model: {aiEngineStatus.modelName}</span>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Google Gemini API Key</span>
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('runcoach_gemini_api_key', geminiApiKey.trim());
                  setShowAiModal(false);
                }}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 font-black text-xs text-black uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Lưu Cấu Hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNITY MODAL */}
      {showCommunityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase">Cộng Đồng Runner</h3>
              </div>
              <button
                onClick={() => setShowCommunityModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide block">
                Bảng Phong Độ Pacer Hôm Nay
              </span>
              <div className="space-y-2">
                {[
                  { name: 'Nguyễn Văn Thành', pace: '4:45 /km', dist: '21.1 km', vdot: 51.2 },
                  { name: 'Trần Thị Mai', pace: '5:30 /km', dist: '10.0 km', vdot: 44.8 },
                  { name: athleteName, pace: `${calculated5KPace} /km`, dist: selectedDistance, vdot: currentVDOT, isYou: true }
                ].map((runner, rIdx) => (
                  <div
                    key={rIdx}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      runner.isYou ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="font-black text-slate-800">
                        {runner.name} {runner.isYou && <span className="text-[10px] text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded">Bạn</span>}
                      </p>
                      <p className="text-[10px] text-slate-500">{runner.dist} • Pace {runner.pace}</p>
                    </div>
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">
                      VDOT {runner.vdot}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowCommunityModal(false)}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-wide cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase">Cài Đặt Hệ Thống</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span>Font chữ giao diện</span>
                <span className="font-bold text-amber-700">Montserrat Athletic</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span>Mô hình AI mặc định</span>
                <span className="font-mono font-bold text-slate-900">{aiEngineStatus.modelName}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowAiModal(true);
                }}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
              >
                Cấu Hình Gemini API Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE AI COACH CHAT DRAWER */}
      {coachChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col h-[520px]">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs">
                AI
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-tight">HLV RunCoach AI</p>
                <p className="text-[10px] text-emerald-400 font-bold">Gemini 3 Flash • Sẵn sàng</p>
              </div>
            </div>
            <button
              onClick={() => setCoachChatOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs font-medium">
            {coachMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl max-w-[85%] ${
                  m.sender === 'coach'
                    ? 'bg-white border border-slate-200 text-slate-800 mr-auto shadow-xs leading-relaxed'
                    : 'bg-amber-400 text-black font-bold ml-auto leading-relaxed'
                }`}
              >
                {m.text}
              </div>
            ))}
            {isCoachThinking && (
              <div className="bg-white border border-slate-200 text-slate-400 p-2.5 rounded-2xl w-24 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              placeholder="Hỏi HLV về chiến thuật Race Day..."
              value={coachInput}
              onChange={e => setCoachInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendCoachChat()}
              className="flex-1 bg-slate-100 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            />
            <button
              onClick={handleSendCoachChat}
              className="px-3.5 py-2 bg-amber-400 text-black font-black rounded-xl text-xs hover:bg-amber-300 uppercase tracking-wider cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}