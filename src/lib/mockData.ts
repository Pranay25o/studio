
import type { Student, User, Mark, Role } from '@/types';

export const mockUsers: User[] = [
  { id: 'teacher1', email: 'teacher@example.com', name: 'Prof. Ada Lovelace', role: 'teacher', subjects: ['Mathematics', 'Physics'] },
  { id: 'teacher2', email: 'prof.curie@example.com', name: 'Prof. Marie Curie', role: 'teacher', subjects: ['Chemistry', 'Advanced Physics'] },
  { id: 'student1', email: 'student1@example.com', name: 'Alice Smith', role: 'student', prn: 'PRN001' },
  { id: 'student2', email: 'student2@example.com', name: 'Bob Johnson', role: 'student', prn: 'PRN002' },
  { id: 'admin01', email: 'admin@example.com', name: 'Super Admin', role: 'admin', subjects: [] }, // Admins can also have subjects
];

export const mockMarks: Mark[] = [
  { id: 'mark1', studentId: 'PRN001', subject: 'Mathematics', score: 85, maxScore: 100, term: 'Midterm', grade: 'A' },
  { id: 'mark2', studentId: 'PRN001', subject: 'Physics', score: 78, maxScore: 100, term: 'Midterm', grade: 'B+' },
  { id: 'mark3', studentId: 'PRN001', subject: 'Mathematics', score: 92, maxScore: 100, term: 'Final', grade: 'A+' },
  { id: 'mark4', studentId: 'PRN002', subject: 'Mathematics', score: 70, maxScore: 100, term: 'Midterm', grade: 'B' },
  { id: 'mark5', studentId: 'PRN002', subject: 'Chemistry', score: 65, maxScore: 100, term: 'Midterm', grade: 'C+' },
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
];


// Helper functions to interact with mock data (simulating API calls)
export const getStudentByPrn = async (prn: string): Promise<Student | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
  return mockStudents.find(s => s.id === prn);
};

export const getAllStudents = async (): Promise<Student[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockStudents;
};

export const getAllTeachers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockUsers.filter(user => user.role === 'teacher');
};

export const getAllUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockUsers];
};


export const addMark = async (mark: Omit<Mark, 'id'>): Promise<Mark> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newMark: Mark = { ...mark, id: `mark${mockMarks.length + 1}` };
  mockMarks.push(newMark);
  const studentIndex = mockStudents.findIndex(s => s.id === mark.studentId);
  if (studentIndex !== -1) {
    mockStudents[studentIndex].marks.push(newMark);
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
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay

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

export const createUser = async (userData: Omit<User, 'id'> & { subjects?: string[] }): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newUser: User = { ...userData, id: `user${mockUsers.length + 1}`};
  if (userData.role === 'student' && !userData.prn) {
    newUser.prn = `PRN${String(mockStudents.length + 1).padStart(3, '0')}`;
  }
  
  mockUsers.push(newUser);

  if (newUser.role === 'student' && newUser.prn) {
    const existingStudentIndex = mockStudents.findIndex(s => s.id === newUser.prn);
    if (existingStudentIndex === -1) {
       mockStudents.push({id: newUser.prn, name: newUser.name, email: newUser.email, marks: [] });
    } else {
      // If student with PRN already exists (e.g. pre-loaded), update their name/email if user account created later.
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
    return true;
  }
  return false; // Subject already exists or empty name
};

export const renameSystemSubject = async (oldName: string, newName: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const trimmedOldName = oldName.trim();
  const trimmedNewName = newName.trim();

  if (!trimmedOldName || !trimmedNewName || trimmedOldName === trimmedNewName) return false; 
  
  const oldNameExists = mockSystemSubjects.some(s => s.toLowerCase() === trimmedOldName.toLowerCase());
  const newNameAlreadyExists = mockSystemSubjects.some(s => s.toLowerCase() === trimmedNewName.toLowerCase() && s.toLowerCase() !== trimmedOldName.toLowerCase());

  if (!oldNameExists || newNameAlreadyExists) {
    return false; // Old name doesn't exist or new name (different from old) already exists
  }

  // Update in system subjects list (case-insensitive find, exact replace)
  const oldNameActualCase = mockSystemSubjects.find(s => s.toLowerCase() === trimmedOldName.toLowerCase()) || trimmedOldName;
  mockSystemSubjects = mockSystemSubjects.map(s => s.toLowerCase() === trimmedOldName.toLowerCase() ? trimmedNewName : s);

  // Update in users' assigned subjects
  mockUsers.forEach(user => {
    if (user.subjects) {
      user.subjects = user.subjects.map(s => s.toLowerCase() === oldNameActualCase.toLowerCase() ? trimmedNewName : s).sort();
    }
  });

  // Update in marks
  mockMarks.forEach(mark => {
    if (mark.subject.toLowerCase() === oldNameActualCase.toLowerCase()) {
      mark.subject = trimmedNewName;
    }
  });
  // Update in students' marks (embedded in mockStudents)
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
  if (!trimmedName || !mockSystemSubjects.find(s => s.toLowerCase() === trimmedName.toLowerCase())) {
    return false; // Subject doesn't exist or empty name
  }
  const subjectToDeleteActualCase = mockSystemSubjects.find(s => s.toLowerCase() === trimmedName.toLowerCase()) || trimmedName;

  // Remove from system subjects list
  mockSystemSubjects = mockSystemSubjects.filter(s => s.toLowerCase() !== trimmedName.toLowerCase());

  // Unassign from users
  mockUsers.forEach(user => {
    if (user.subjects) {
      user.subjects = user.subjects.filter(s => s.toLowerCase() !== subjectToDeleteActualCase.toLowerCase()).sort();
    }
  });

  // Update marks: For this mock, we'll change the subject of marks to a generic "Deleted Subject"
  // In a real app, you'd have a more robust strategy (e.g., disallow deletion if marks exist, archive, etc.)
  mockMarks.forEach(mark => {
    if (mark.subject.toLowerCase() === subjectToDeleteActualCase.toLowerCase()) {
      mark.subject = `Deleted Subject (${subjectToDeleteActualCase})`; 
    }
  });
  mockStudents.forEach(student => {
    student.marks.forEach(mark => {
      if (mark.subject.toLowerCase() === subjectToDeleteActualCase.toLowerCase()) {
        mark.subject = `Deleted Subject (${subjectToDeleteActualCase})`;
      }
    });
  });
  return true;
};

