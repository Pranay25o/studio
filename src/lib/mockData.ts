
import type { Student, User, Mark, Role, AssessmentType, Semester, TeacherSemesterAssignment } from '@/types';
import { ASSESSMENT_MAX_SCORES } from '@/types';

export let mockSemesters: Semester[] = [
  "Semester 1, 2023-2024",
  "Semester 2, 2023-2024",
  "Semester 1, 2024-2025",
  "Semester 2, 2024-2025",
].sort();

export let mockUsers: User[] = [
  { 
    id: 'teacher1', 
    email: 'teacher@example.com', 
    name: 'Prof. Ada Lovelace', 
    role: 'teacher', 
    subjects: ['Mathematics', 'Physics'], // General oversight subjects
    semesterAssignments: [
      { semester: "Semester 1, 2023-2024", subjects: ['Mathematics', 'Physics'] },
      { semester: "Semester 2, 2023-2024", subjects: ['Mathematics'] }
    ]
  },
  { 
    id: 'teacher2', 
    email: 'prof.curie@example.com', 
    name: 'Prof. Marie Curie', 
    role: 'teacher', 
    subjects: ['Chemistry', 'Advanced Physics'],
    semesterAssignments: [
      { semester: "Semester 1, 2023-2024", subjects: ['Chemistry'] },
      { semester: "Semester 2, 2023-2024", subjects: ['Chemistry', 'Advanced Physics'] }
    ]
  },
  { id: 'student1', email: 'student1@example.com', name: 'Alice Smith', role: 'student', prn: 'PRN001' },
  { id: 'student2', email: 'student2@example.com', name: 'Bob Johnson', role: 'student', prn: 'PRN002' },
  { id: 'admin01', email: 'admin@example.com', name: 'Super Admin', role: 'admin', subjects: [] }, // Admin might have general subjects or use semester assignments too if they teach
];

export let mockMarks: Mark[] = [
  // Alice Smith - PRN001
  { id: 'mark1', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA1', score: 8, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark2', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'CA2', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA2 },
  { id: 'mark3', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'MidSem', score: 15, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
  { id: 'mark4', studentId: 'PRN001', subject: 'Mathematics', assessmentType: 'EndSem', score: 48, maxScore: ASSESSMENT_MAX_SCORES.EndSem },
  { id: 'mark5', studentId: 'PRN001', subject: 'Physics', assessmentType: 'CA1', score: 9, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark6', studentId: 'PRN001', subject: 'Physics', assessmentType: 'MidSem', score: 18, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
  { id: 'mark11', studentId: 'PRN001', subject: 'Physics', assessmentType: 'EndSem', score: 50, maxScore: ASSESSMENT_MAX_SCORES.EndSem },


  // Bob Johnson - PRN002
  { id: 'mark7', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'CA1', score: 6, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark8', studentId: 'PRN002', subject: 'Mathematics', assessmentType: 'EndSem', score: 40, maxScore: ASSESSMENT_MAX_SCORES.EndSem },
  { id: 'mark9', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'CA1', score: 7, maxScore: ASSESSMENT_MAX_SCORES.CA1 },
  { id: 'mark10', studentId: 'PRN002', subject: 'Chemistry', assessmentType: 'MidSem', score: 12, maxScore: ASSESSMENT_MAX_SCORES.MidSem },
];

export let mockStudents: Student[] = [
  {
    id: 'PRN001',
    name: 'Alice Smith',
    email: 'student1@example.com',
    marks: mockMarks.filter(m => m.studentId === 'PRN001'),
  },
  {
    id: 'PRN002',
    name: 'Bob Johnson',
    email: 'student2@example.com',
    marks: mockMarks.filter(m => m.studentId === 'PRN002'),
  },
  {
    id: 'PRN003',
    name: 'Charlie Brown',
    email: 'student3@example.com',
    marks: [],
  },
];

// System-wide list of subjects
export let mockSystemSubjects: string[] = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'English Literature', 'Computer Science', 'Advanced Physics'
].sort();


// Helper functions to interact with mock data (simulating API calls)
export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  const student = mockStudents.find(s => s.id === prn);
  if (student) {
    return { ...student, marks: mockMarks.filter(m => m.studentId === prn) };
  }
  return undefined;
};

export const getAllStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockStudents.map(s => ({
    ...s,
    marks: mockMarks.filter(m => m.studentId === s.id)
  }));
};

export const getAllTeachers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockUsers.filter(user => user.role === 'teacher');
};

export const getAllUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockUsers];
};


export const addMark = async (markData: Omit<Mark, 'id'>): Promise<Mark> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newMark: Mark = { ...markData, id: `mark${mockMarks.length + 1}` };
  mockMarks.push(newMark);
  const studentIndex = mockStudents.findIndex(s => s.id === markData.studentId);
  if (studentIndex !== -1) {
    // Ensure the student's local marks array is also updated
    const studentMarks = mockMarks.filter(m => m.studentId === markData.studentId);
    mockStudents[studentIndex].marks = studentMarks;
  }
  return newMark;
};

export const updateMark = async (updatedMark: Mark): Promise<Mark | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const markIndex = mockMarks.findIndex(m => m.id === updatedMark.id);
  if (markIndex !== -1) {
    mockMarks[markIndex] = updatedMark;
    const studentIndex = mockStudents.findIndex(s => s.id === updatedMark.studentId);
    if (studentIndex !== -1) {
      const studentMarkIndex = mockStudents[studentIndex].marks.findIndex(m => m.id === updatedMark.id);
      if (studentMarkIndex !== -1) {
        mockStudents[studentIndex].marks[studentMarkIndex] = updatedMark;
      } else { // If mark was somehow not in student's list but exists in global, add it
         mockStudents[studentIndex].marks.push(updatedMark);
      }
    }
    return updatedMark;
  }
  return undefined;
};

export const deleteMark = async (markId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const markIndex = mockMarks.findIndex(m => m.id === markId);
  if (markIndex !== -1) {
    const studentId = mockMarks[markIndex].studentId;
    mockMarks.splice(markIndex, 1);
    const studentIndex = mockStudents.findIndex(s => s.id === studentId);
    if (studentIndex !== -1) {
      mockStudents[studentIndex].marks = mockStudents[studentIndex].marks.filter(m => m.id !== markId);
    }
    return true;
  }
  return false;
};

export const updateStudentName = async (prn: string, newName: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const studentIndex = mockStudents.findIndex(s => s.id === prn);
  if (studentIndex !== -1) {
    mockStudents[studentIndex].name = newName;
    const userIndex = mockUsers.findIndex(u => u.prn === prn);
    if (userIndex !== -1) {
      mockUsers[userIndex].name = newName;
    }
    return mockStudents[studentIndex];
  }
  return undefined;
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  console.log('[getUserByEmail] Received email to search for:', email);
  await new Promise(resolve => setTimeout(resolve, 100)); 

  const trimmedEmail = email.trim().toLowerCase();
  console.log('[getUserByEmail] Searching for trimmed email:', trimmedEmail);

  const adminUserFromMock = mockUsers.find(u => u.email.toLowerCase() === 'admin@example.com');
  if (adminUserFromMock) {
    console.log('[getUserByEmail] Admin user in mockUsers:', JSON.stringify(adminUserFromMock));
  } else {
    console.log('[getUserByEmail] Admin user (admin@example.com) NOT found in mockUsers array.');
  }
  console.log('[getUserByEmail] Full mockUsers list being searched (first 5 users):', JSON.stringify(mockUsers.slice(0,5).map(u => ({email: u.email, role: u.role}))));


  const foundUser = mockUsers.find(u => u.email.toLowerCase() === trimmedEmail);
  if (foundUser) {
    console.log('[getUserByEmail] Found user:', JSON.stringify(foundUser));
  } else {
    console.log('[getUserByEmail] User NOT found for email (trimmed, case-insensitive):', trimmedEmail);
  }
  return foundUser;
}

export const createUser = async (userData: Omit<User, 'id'> & { subjects?: string[], semesterAssignments?: TeacherSemesterAssignment[] }): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newUser: User = { 
    ...userData, 
    id: `user${mockUsers.length + 1}`,
    subjects: userData.subjects || [],
    semesterAssignments: userData.semesterAssignments || [] 
  };
  if (userData.role === 'student' && !userData.prn) {
    newUser.prn = `PRN${String(mockStudents.length + 1).padStart(3, '0')}`;
  }
  
  mockUsers.push(newUser);

  if (newUser.role === 'student' && newUser.prn) {
    const existingStudentIndex = mockStudents.findIndex(s => s.id === newUser.prn);
    if (existingStudentIndex === -1) {
       mockStudents.push({id: newUser.prn, name: newUser.name, email: newUser.email, marks: [] });
    } else {
      mockStudents[existingStudentIndex].name = newUser.name; 
      mockStudents[existingStudentIndex].email = newUser.email;
    }
  }
  return newUser;
}

export const assignSubjectsToTeacher = async (userId: string, subjects: string[]): Promise<User | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const userIndex = mockUsers.findIndex(u => u.id === userId && (u.role === 'teacher' || u.role === 'admin'));
  if (userIndex !== -1) {
    mockUsers[userIndex].subjects = [...subjects].sort();
    return mockUsers[userIndex];
  }
  return undefined;
};

// --- System Subject Management Functions ---
export const getAllAvailableSubjects = async (): Promise<string[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...mockSystemSubjects].sort();
};

export const addSystemSubject = async (subjectName: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const trimmedName = subjectName.trim();
  if (trimmedName && !mockSystemSubjects.find(s => s.toLowerCase() === trimmedName.toLowerCase())) {
    mockSystemSubjects.push(trimmedName);
    mockSystemSubjects.sort(); // Keep it sorted
    return true;
  }
  return false; // Subject already exists or empty name
};

export const renameSystemSubject = async (oldName: string, newName: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  if (!trimmedOldName || !trimmedNewName || trimmedOldName.toLowerCase() === trimmedNewName.toLowerCase()) return false; 
  
  const oldNameActualCase = mockSystemSubjects.find(s => s.toLowerCase() === trimmedOldName.toLowerCase());
  if (!oldNameActualCase) return false; // Old name doesn't exist

  const newNameAlreadyExists = mockSystemSubjects.some(s => s.toLowerCase() === trimmedNewName.toLowerCase());
  if (newNameAlreadyExists) return false; // New name already exists

  mockSystemSubjects = mockSystemSubjects.map(s => s.toLowerCase() === trimmedOldName.toLowerCase() ? trimmedNewName : s).sort();

  mockUsers.forEach(user => {
    if (user.subjects) {
      user.subjects = user.subjects.map(s => s.toLowerCase() === oldNameActualCase.toLowerCase() ? trimmedNewName : s).sort();
    }
    if (user.semesterAssignments) {
      user.semesterAssignments.forEach(assignment => {
        assignment.subjects = assignment.subjects.map(s => s.toLowerCase() === oldNameActualCase.toLowerCase() ? trimmedNewName : s).sort();
      });
    }
  });

  mockMarks.forEach(mark => {
    if (mark.subject.toLowerCase() === oldNameActualCase.toLowerCase()) {
      mark.subject = trimmedNewName;
    }
  });
  mockStudents.forEach(student => {
    student.marks.forEach(mark => {
      if (mark.subject.toLowerCase() === oldNameActualCase.toLowerCase()) {
        mark.subject = trimmedNewName;
      }
    });
  });
  return true;
};

export const deleteSystemSubject = async (subjectName: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const trimmedName = subjectName.trim();
  const subjectToDeleteActualCase = mockSystemSubjects.find(s => s.toLowerCase() === trimmedName.toLowerCase());

  if (!subjectToDeleteActualCase) {
    return false; 
  }

  mockSystemSubjects = mockSystemSubjects.filter(s => s.toLowerCase() !== trimmedName.toLowerCase());

  mockUsers.forEach(user => {
    if (user.subjects) {
      user.subjects = user.subjects.filter(s => s.toLowerCase() !== subjectToDeleteActualCase.toLowerCase()).sort();
    }
    if (user.semesterAssignments) {
      user.semesterAssignments.forEach(assignment => {
        assignment.subjects = assignment.subjects.filter(s => s.toLowerCase() !== subjectToDeleteActualCase.toLowerCase()).sort();
      });
      // Optional: Remove empty semester assignments
      // user.semesterAssignments = user.semesterAssignments.filter(sa => sa.subjects.length > 0);
    }
  });
  
  const replacementSubjectName = `Archived Subject (${subjectToDeleteActualCase})`;
  mockMarks.forEach(mark => {
    if (mark.subject.toLowerCase() === subjectToDeleteActualCase.toLowerCase()) {
      mark.subject = replacementSubjectName; 
    }
  });
  mockStudents.forEach(student => {
    student.marks.forEach(mark => {
      if (mark.subject.toLowerCase() === subjectToDeleteActualCase.toLowerCase()) {
        mark.subject = replacementSubjectName;
      }
    });
  });
  return true;
};

// --- Semester and Teacher Semester Assignment Functions ---
export const getSemesters = async (): Promise<Semester[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...mockSemesters];
};

export const assignSubjectsToTeacherForSemester = async (userId: string, semester: Semester, subjects: string[]): Promise<User | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const userIndex = mockUsers.findIndex(u => u.id === userId && (u.role === 'teacher' || u.role === 'admin'));
  if (userIndex === -1) return undefined;

  const user = mockUsers[userIndex];
  if (!user.semesterAssignments) {
    user.semesterAssignments = [];
  }

  const existingSemesterAssignmentIndex = user.semesterAssignments.findIndex(sa => sa.semester === semester);
  const sortedSubjects = [...subjects].sort();

  if (existingSemesterAssignmentIndex !== -1) {
    if (sortedSubjects.length === 0) { // If all subjects are removed for the semester
      user.semesterAssignments.splice(existingSemesterAssignmentIndex, 1);
    } else {
      user.semesterAssignments[existingSemesterAssignmentIndex].subjects = sortedSubjects;
    }
  } else if (sortedSubjects.length > 0) { // Only add if there are subjects to assign
    user.semesterAssignments.push({ semester, subjects: sortedSubjects });
    user.semesterAssignments.sort((a, b) => a.semester.localeCompare(b.semester)); // Keep sorted
  }
  
  return user;
};
