// Realistic PICT Robotics Club content — used across public site, applicant & admin.

export const metrics = [
  { value: '11+', label: 'Years' },
  { value: '54', label: 'Members' },
  { value: '32', label: 'Projects' },
  { value: '25+', label: 'Podiums' },
];

export const domains = [
  { name: 'Autonomous Robotics', desc: 'Self-navigating ground and aerial platforms.' },
  { name: 'Embedded Systems', desc: 'Firmware, RTOS and low-level control on bare metal.' },
  { name: 'Computer Vision', desc: 'Perception, detection and visual SLAM pipelines.' },
  { name: 'Electronics', desc: 'Custom PCBs, power systems and sensor fusion.' },
  { name: 'Mechanical Design', desc: 'CAD, actuation, chassis and manufacturing.' },
  { name: 'Control Systems', desc: 'PID, state estimation and motion planning.' },
  { name: 'Programming', desc: 'C/C++, Python and ROS software architecture.' },
  { name: 'Competitive Robotics', desc: 'National & international competition builds.' },
];

export type Project = {
  slug: string;
  name: string;
  category: string;
  year: number;
  tags: string[];
  summary: string;
  image: string;
};

export const projects: Project[] = [
  {
    slug: 'aether-quad',
    name: 'Aether — Autonomous Quadcopter',
    category: 'Autonomous',
    year: 2026,
    tags: ['PX4', 'ROS 2', 'Computer Vision', 'GPS-denied'],
    summary: 'A GPS-denied autonomous drone using visual-inertial odometry for indoor inspection.',
    image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&h=650&fit=crop&auto=format',
  },
  {
    slug: 'pathfinder-agv',
    name: 'Pathfinder — Warehouse AGV',
    category: 'Autonomous',
    year: 2025,
    tags: ['LiDAR', 'SLAM', 'ROS', 'Nav2'],
    summary: 'A differential-drive AGV performing autonomous navigation and dynamic obstacle avoidance.',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=900&h=650&fit=crop&auto=format',
  },
  {
    slug: 'gripper-arm',
    name: 'Manipulo — 5-DOF Robotic Arm',
    category: 'Mechanical',
    year: 2025,
    tags: ['Inverse Kinematics', 'CAN Bus', 'STM32'],
    summary: 'A 5-DOF arm with closed-loop control and vision-guided pick-and-place.',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&h=650&fit=crop&auto=format',
  },
  {
    slug: 'line-hawk',
    name: 'LineHawk — High-Speed Line Follower',
    category: 'Embedded',
    year: 2024,
    tags: ['PID', 'ATmega', 'Sensor Array'],
    summary: 'A 16-sensor line-following robot tuned for sub-metre-per-second track times.',
    image: 'https://images.unsplash.com/photo-1563207153-f403bf289096?w=900&h=650&fit=crop&auto=format',
  },
  {
    slug: 'vis-sort',
    name: 'VisSort — Vision Sorting Cell',
    category: 'Vision',
    year: 2024,
    tags: ['OpenCV', 'YOLO', 'Conveyor'],
    summary: 'A conveyor-based cell classifying and sorting objects in real time.',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&h=650&fit=crop&auto=format',
  },
  {
    slug: 'rover-mk3',
    name: 'Terra Mk-III — Mars Rover',
    category: 'Software',
    year: 2023,
    tags: ['ROS', 'Rocker-Bogie', 'Telemetry'],
    summary: 'A rocker-bogie rover with autonomous traversal and a science payload.',
    image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=900&h=650&fit=crop&auto=format',
  },
];

// Achievements — anchored on the recruitment poster's competitive record.
export type Achievement = {
  competition: string;
  year: number;
  position: string;
  rank: string; // short display, e.g. AIR 1
  project: string;
  team: string;
  description: string;
  major?: boolean;
  image: string;
};

export const achievements: Achievement[] = [
  {
    competition: 'ISRO ASCEND',
    year: 2026,
    position: 'All India Rank 4',
    rank: 'AIR 4',
    project: 'Autonomous Robotics Challenge',
    team: 'Galactic Gearheads',
    description: 'AIR 4 in ISRO ASCEND 2026, earned by Galactic Gearheads.',
    major: true,
    image: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=1200&h=800&fit=crop&auto=format',
  },
  {
    competition: 'ROBOCON India',
    year: 2026,
    position: 'All India Rank 9',
    rank: 'AIR 9',
    project: 'ROBOCON India robot system',
    team: 'PICT Robotics Club',
    description: 'AIR 9 at ROBOCON India 2026, continuing the club’s run in India’s national robotics competition circuit.',
    major: true,
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=800&fit=crop&auto=format',
  },
  {
    competition: 'ISRO IROC-U',
    year: 2025,
    position: 'All India Rank 1',
    rank: 'AIR 1',
    project: 'Intelligent robotics challenge',
    team: 'Galactic Gearheads',
    description: 'AIR 1 in ISRO IROC-U 2025 — a national title earned by Galactic Gearheads.',
    major: true,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop&auto=format',
  },
  {
    competition: 'ROBOCON India',
    year: 2025,
    position: 'All India Rank 13',
    rank: 'AIR 13',
    project: 'ROBOCON India robot system',
    team: 'PICT Robotics Club',
    description: 'AIR 13 at ROBOCON India 2025.',
    image: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=800&h=600&fit=crop&auto=format',
  },
  {
    competition: 'ROBOCON India',
    year: 2022,
    position: 'All India Rank 6',
    rank: 'AIR 6',
    project: 'ROBOCON India robot system',
    team: 'PICT Robotics Club',
    description: 'All India Rank 6 at ROBOCON India 2022.',
    major: true,
    image: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=800&h=600&fit=crop&auto=format',
  },
  {
    competition: 'ROBOCON India',
    year: 2014,
    position: 'All India Rank 4',
    rank: 'AIR 4',
    project: 'ROBOCON India robot system',
    team: 'PICT Robotics Club',
    description: 'All India Rank 4 at ROBOCON India 2014.',
    major: true,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=600&fit=crop&auto=format',
  },
  {
    competition: 'VIT Crescendo',
    year: 2026,
    position: 'First & Second Place · Line Following Board Competition',
    rank: '1st / 2nd',
    project: 'Line Following Robot',
    team: 'PICT Robotics Club',
    description: 'First and second place in the VIT Crescendo line following board competition.',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop&auto=format',
  },
  {
    competition: 'e-Yantra Robotics Sprint',
    year: 2026,
    position: 'National Finalist',
    rank: 'Finalist',
    project: 'Robotics Sprint',
    team: 'PICT Robotics Club',
    description: 'National finalist in the e-Yantra Robotics Sprint.',
    image: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=800&h=600&fit=crop&auto=format',
  },
];

export const timeline = [
  { year: 2021, title: 'Rebuilt the lab', note: 'Established the dedicated robotics lab and core teams.' },
  { year: 2022, title: 'First national podium', note: 'Reached national finals in two competitions.' },
  { year: 2023, title: 'Terra Mk-III', note: 'Launched the club’s first full rover platform.' },
  { year: 2024, title: 'SIH Hardware win', note: 'Won Smart India Hackathon, hardware edition.' },
  { year: 2025, title: 'AIR 1 & AIR 13', note: 'ISRO IROC-U and ROBOCON India.' },
  { year: 2026, title: 'AIR 4 & AIR 9', note: 'ISRO ASCEND and ROBOCON India.' },
];

export const values = [
  { title: 'Build', items: ['Robotics', 'Embedded Systems', 'Mechanical Design', 'Real Hardware'] },
  { title: 'Code', items: ['C / C++', 'Python', 'AI / Computer Vision', 'ROS'] },
  { title: 'Compete', items: ['National & International', 'Robotics Events'] },
  { title: 'Create', items: ['Work in Teams', 'Solve Real Problems', 'Turn Ideas into Prototypes'] },
];

export const contacts = [
  { name: 'Aryan', phone: '8452911765' },
  { name: 'Sangram', phone: '8767718735' },
];

// Recruitment process stages (applicant-facing)
export const recruitStages = ['Registration', 'Application', 'Technical Round', 'Task', 'Interview', 'Selection'];

// ---------------------- Applicant dashboard state ----------------------
export const applicantProgress = [
  { name: 'Application', state: 'done' as const },
  { name: 'Technical Round', state: 'done' as const },
  { name: 'Task Round', state: 'current' as const },
  { name: 'Interview', state: 'locked' as const },
  { name: 'Final Result', state: 'locked' as const },
];

export const announcements = [
  { title: 'Task Round instructions released', body: 'The Task Round brief and rubric are now live on your Task page.', date: '20 Sep', tone: 'info' as const },
  { title: 'Deadline updated', body: 'Task submissions now close on 24 September, 11:59 PM.', date: '19 Sep', tone: 'warn' as const },
  { title: 'Interview information', body: 'Shortlisted candidates will receive interview slots after task evaluation.', date: '17 Sep', tone: 'neutral' as const },
];

// ---------------------- Admin data ----------------------
export const adminMetrics = [
  { label: 'Total Applicants', value: '324', delta: 'FY 221 · SY 103' },
  { label: 'Shortlisted', value: '126', delta: '39% of pool' },
  { label: 'Interviews', value: '48', delta: '12 today' },
  { label: 'Selected', value: '—', delta: 'Pending' },
];

export const funnel = [
  { stage: 'Applications', count: 324 },
  { stage: 'Technical Round', count: 258 },
  { stage: 'Task Round', count: 162 },
  { stage: 'Interview', count: 82 },
  { stage: 'Selected', count: 0, pending: true },
];

export const branchData = [
  { label: 'Computer', value: 118 },
  { label: 'IT', value: 92 },
  { label: 'E&TC', value: 78 },
  { label: 'Mechanical', value: 24 },
  { label: 'Other', value: 12 },
];

export const domainPref = [
  { label: 'Software', value: 104 },
  { label: 'Computer Vision', value: 71 },
  { label: 'Electronics', value: 58 },
  { label: 'Embedded', value: 52 },
  { label: 'Mechanical', value: 39 },
];

export type Applicant = {
  id: string;
  name: string;
  year: 'FY' | 'SY';
  branch: string;
  division: string;
  phone: string;
  email: string;
  domain: string;
  secondary: string;
  stage: string;
  score: number | null;
  interview: string;
  status: 'In Progress' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';
  github: string;
  linkedin: string;
  answers: { q: string; a: string }[];
};

export const applicants: Applicant[] = [
  {
    id: 'RC-FY-0241', name: 'Aarav Shah', year: 'FY', branch: 'IT', division: 'B', phone: '98220 11234',
    email: 'aarav.shah@pict.edu', domain: 'Software', secondary: 'Computer Vision', stage: 'Task Round', score: 82,
    interview: '—', status: 'In Progress', github: 'github.com/aaravshah', linkedin: 'in/aaravshah',
    answers: [
      { q: 'Why do you want to join Robotics Club?', a: 'I have built small line-followers on my own and want to work on serious autonomous systems with a team.' },
      { q: 'Tell us about something you have built.', a: 'A PID-tuned line follower on Arduino and a small OpenCV object tracker.' },
      { q: 'What technical skill would you like to learn?', a: 'ROS 2 and visual SLAM.' },
    ],
  },
  { id: 'RC-FY-0198', name: 'Riya Mehta', year: 'FY', branch: 'Computer', division: 'A', phone: '99700 22319', email: 'riya.mehta@pict.edu', domain: 'Computer Vision', secondary: 'Software', stage: 'Interview', score: 88, interview: '26 Sep · 4:20 PM', status: 'Shortlisted', github: 'github.com/riyam', linkedin: 'in/riyamehta', answers: [{ q: 'Why do you want to join Robotics Club?', a: 'Computer vision fascinates me and I want to apply it on real robots.' }, { q: 'Tell us about something you have built.', a: 'A face-attendance system with OpenCV and Flask.' }, { q: 'What technical skill would you like to learn?', a: 'Sensor fusion.' }] },
  { id: 'RC-SY-0087', name: 'Karan Joshi', year: 'SY', branch: 'E&TC', division: 'C', phone: '90110 55621', email: 'karan.joshi@pict.edu', domain: 'Electronics', secondary: 'Embedded', stage: 'Interview', score: 79, interview: '26 Sep · 4:40 PM', status: 'Interview', github: 'github.com/karanj', linkedin: 'in/karanjoshi', answers: [{ q: 'Why do you want to join Robotics Club?', a: 'I want to design custom PCBs for competition robots.' }, { q: 'Tell us about something you have built.', a: 'A 4-layer motor-driver board.' }, { q: 'What technical skill would you like to learn?', a: 'High-speed signal design.' }] },
  { id: 'RC-FY-0305', name: 'Isha Kulkarni', year: 'FY', branch: 'Computer', division: 'B', phone: '87880 74412', email: 'isha.k@pict.edu', domain: 'Software', secondary: 'Embedded', stage: 'Task Round', score: 74, interview: '—', status: 'In Progress', github: 'github.com/ishak', linkedin: 'in/ishakulkarni', answers: [{ q: 'Why do you want to join Robotics Club?', a: 'To write software that controls real machines.' }, { q: 'Tell us about something you have built.', a: 'A Django scheduling app.' }, { q: 'What technical skill would you like to learn?', a: 'Real-time control.' }] },
  { id: 'RC-SY-0112', name: 'Rohit Deshmukh', year: 'SY', branch: 'Mechanical', division: 'A', phone: '96570 33108', email: 'rohit.d@pict.edu', domain: 'Mechanical', secondary: 'Electronics', stage: 'Task Round', score: 68, interview: '—', status: 'In Progress', github: 'github.com/rohitd', linkedin: 'in/rohitdeshmukh', answers: [{ q: 'Why do you want to join Robotics Club?', a: 'I love CAD and want to design robot chassis.' }, { q: 'Tell us about something you have built.', a: 'A 3D-printed robotic gripper.' }, { q: 'What technical skill would you like to learn?', a: 'DFM for manufacturing.' }] },
  { id: 'RC-FY-0276', name: 'Sneha Patil', year: 'FY', branch: 'IT', division: 'C', phone: '70301 99845', email: 'sneha.p@pict.edu', domain: 'Computer Vision', secondary: 'Software', stage: 'Technical Round', score: 61, interview: '—', status: 'In Progress', github: 'github.com/snehap', linkedin: 'in/snehapatil', answers: [{ q: 'Why do you want to join Robotics Club?', a: 'To build perception systems.' }, { q: 'Tell us about something you have built.', a: 'A traffic-sign classifier.' }, { q: 'What technical skill would you like to learn?', a: 'Model deployment on edge.' }] },
  { id: 'RC-SY-0143', name: 'Aditya Rao', year: 'SY', branch: 'Computer', division: 'B', phone: '81490 22076', email: 'aditya.rao@pict.edu', domain: 'Software', secondary: 'Computer Vision', stage: 'Interview', score: 91, interview: '26 Sep · 5:00 PM', status: 'Shortlisted', github: 'github.com/adityarao', linkedin: 'in/adityarao', answers: [{ q: 'Why do you want to join Robotics Club?', a: 'To architect ROS software for the flagship robots.' }, { q: 'Tell us about something you have built.', a: 'A ROS 2 nav stack for a sim robot.' }, { q: 'What technical skill would you like to learn?', a: 'Behavior trees.' }] },
  { id: 'RC-FY-0159', name: 'Manasi Jadhav', year: 'FY', branch: 'E&TC', division: 'A', phone: '75889 40217', email: 'manasi.j@pict.edu', domain: 'Embedded', secondary: 'Electronics', stage: 'Task Round', score: 77, interview: '—', status: 'In Progress', github: 'github.com/manasij', linkedin: 'in/manasijadhav', answers: [{ q: 'Why do you want to join Robotics Club?', a: 'Firmware is where hardware comes alive.' }, { q: 'Tell us about something you have built.', a: 'An STM32 BLDC controller.' }, { q: 'What technical skill would you like to learn?', a: 'RTOS scheduling.' }] },
];
